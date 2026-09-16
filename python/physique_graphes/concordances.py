"""Native nodal concordance study on the fixed eight-node DAG.

Y1=1; Xi=sum(qji); Ci=ei+sum(epsilon[i][j]*qji). Signed mode uses
Yi=Xi*Ci and rectified mode max(0, Xi*Ci). Fractions distribute each
output completely, including its sign. The default objective is Y8.

Only the Python standard library is used. Search budgets, interval bounds and
adjoint diagnostics have separate meanings: a local stop is not a certificate.
Public models/results use snake_case keys and string node IDs.
"""

from copy import deepcopy
from dataclasses import dataclass
import math

_PAIRS = ((1, 2), (1, 5), (2, 3), (2, 8), (5, 3), (5, 7),
          (7, 6), (7, 4), (3, 4), (3, 6), (4, 8), (6, 8))
_EDGES = tuple({"id": f"{a}-{b}", "from": str(a), "to": str(b)} for a, b in _PAIRS)
_KEYS = ("s1", "s2", "s5", "s3", "s7")
_ORDER = ("1", "2", "5", "3", "7", "4", "6", "8")
_IDS = tuple(str(i) for i in range(2, 9))
_IN = {n: tuple(i for i, edge in enumerate(_EDGES) if edge["to"] == n) for n in _ORDER}
_OUT = {n: tuple(i for i, edge in enumerate(_EDGES) if edge["from"] == n) for n in _ORDER}
GRAPH = {"nodes": [{"id": str(i), "name": f"Nœud {i}"} for i in range(1, 9)],
         "edges": deepcopy(list(_EDGES)), "controls": list(_KEYS), "order": list(_ORDER)}
RANDOM_ALGORITHM = "lcg32-numerical-recipes-v1"


def _finite(value):
    try:
        return type(value) in (int, float) and math.isfinite(value)
    except OverflowError:
        return False


def _sum(values):
    # Explicit left association also makes floating-point ordering reproducible.
    result = 0.0
    for value in values:
        result += value
    return result


def _max_abs(values):
    return max((abs(value) for value in values), default=0.0)


def _integer(value, minimum, maximum, name):
    if not _finite(value) or int(value) != value or not minimum <= value <= maximum:
        raise ValueError(f"{name} must be an integer in [{minimum}, {maximum}]")
    return int(value)


def _positive(value, name):
    if not _finite(value) or value <= 0:
        raise ValueError(f"{name} must be finite and positive")
    return value


def _mode(domain, objective):
    if domain not in ("rectified", "signed", "efficiency"):
        raise ValueError("domain must be rectified, signed or efficiency")
    if objective not in ("output", "arrivals"):
        raise ValueError("objective must be output or arrivals (absolute incoming transfers)")


def _controls(controls):
    if not isinstance(controls, dict):
        raise ValueError("Five named fractions are required")
    result = {}
    for key in _KEYS:
        value = controls.get(key)
        if not _finite(value) or not 0 <= value <= 1:
            raise ValueError(f"{key} must be in [0,1]")
        result[key] = value
    return result


def create_scenario():
    """Pedagogical default: Y8=2*s1*(1-s1); downstream laws are identities."""
    return {"source": 1, "environments": {n: 1 for n in _IDS},
            "epsilon": {n: {_EDGES[i]["from"]: -1 if n in ("2", "5") else 0
                            for i in _IN[n]} for n in _IDS},
            "initial_controls": {key: .5 for key in _KEYS}}


def validate_model(model):
    """Return an independent canonical model; inactive matrix entries are kept."""
    if not isinstance(model, dict) or not _finite(model.get("source")) or model["source"] != 1:
        raise ValueError("Source Y1 must equal 1")
    if not isinstance(model.get("environments"), dict) or not isinstance(model.get("epsilon"), dict):
        raise ValueError("environments and epsilon dictionaries are required")
    environments, epsilon = {}, {}
    for n in _IDS:
        env = model["environments"].get(n)
        if not _finite(env) or not 0 <= env <= 1:
            raise ValueError(f"Environment {n} must be in [0,1]")
        environments[n], epsilon[n] = env, {}
        row = model["epsilon"].get(n)
        if not isinstance(row, dict):
            raise ValueError(f"Missing epsilon row {n}")
        for i in _IN[n]:
            origin = _EDGES[i]["from"]
            value = row.get(origin)
            if not _finite(value) or not -1 <= value <= 1:
                raise ValueError(f"epsilon[{n}][{origin}] must be in [-1,1]")
            epsilon[n][origin] = value
    for n, row in model["epsilon"].items():
        if n not in _ORDER or not isinstance(row, dict):
            raise ValueError("Matrix rows must be node IDs 1 through 8")
        epsilon.setdefault(n, {})
        for origin, value in row.items():
            if origin not in _ORDER or not _finite(value) or not -1 <= value <= 1:
                raise ValueError("Invalid matrix column or coefficient")
            if n == origin and value != 0:
                raise ValueError("The epsilon diagonal must be zero")
            epsilon[n][origin] = value
    return {"source": 1, "environments": environments, "epsilon": epsilon,
            "initial_controls": _controls(model.get("initial_controls", {key: .5 for key in _KEYS}))}


def randomize(model, seed):
    """LCG32, destination rows then origin columns; diagonal consumes no draw."""
    seed = _integer(seed, 0, 2**32 - 1, "seed")
    result, value = validate_model(model), seed
    epsilon = {}
    for n in map(str, range(1, 9)):
        epsilon[n] = {}
        for origin in map(str, range(1, 9)):
            if origin == n:
                epsilon[n][origin] = 0
            else:
                value = (1664525 * value + 1013904223) & 0xFFFFFFFF
                epsilon[n][origin] = 2 * value / 2**32 - 1
    result.update(epsilon=epsilon, provenance={"kind": "random-matrix", "seed": seed,
                                               "algorithm": RANDOM_ALGORITHM})
    return result


def create_negative_scenario():
    """Upstream identity transformations give X8=1, C8=-1, hence signed Y8=-1."""
    result = create_scenario()
    result["environments"]["8"] = 0
    result["epsilon"] = {str(i): {str(j): 0 for j in range(1, 9)} for i in range(1, 9)}
    for origin in ("2", "4", "6"):
        result["epsilon"]["8"][origin] = -1
    result["provenance"] = {"kind": "negative-output-example", "version": 1}
    return result


@dataclass
class _Jet:
    value: float
    gradient: list
    hessian: list
    constant: bool


def _jet(value, index=-1):
    gradient = [0.0] * 5
    if index >= 0:
        gradient[index] = 1.0
    return _Jet(value, gradient, [[0.0] * 5 for _ in range(5)], index < 0)


def _add(a, b):
    return _Jet(a.value + b.value, [a.gradient[i] + b.gradient[i] for i in range(5)],
                [[a.hessian[i][j] + b.hessian[i][j] for j in range(5)] for i in range(5)],
                a.constant and b.constant)


def _scale(a, s):
    return _Jet(a.value * s, [v * s for v in a.gradient],
                [[v * s for v in row] for row in a.hessian], s == 0 or a.constant)


def _multiply(a, b):
    return _Jet(a.value * b.value,
                [a.gradient[i] * b.value + b.gradient[i] * a.value for i in range(5)],
                [[a.hessian[i][j] * b.value + b.hessian[i][j] * a.value
                  + a.gradient[i] * b.gradient[j] + b.gradient[i] * a.gradient[j]
                  for j in range(5)] for i in range(5)],
                (a.constant and a.value == 0) or (b.constant and b.value == 0)
                or (a.constant and b.constant))


def _jsum(values):
    result = _jet(0)
    for value in values:
        result = _add(result, value)
    return result


def _derivatives(model, controls, domain, objective):
    q, outputs, kinks = [None] * 12, {"1": _jet(1)}, []
    for n in _ORDER:
        if n != "1":
            x = _jsum(q[i] for i in _IN[n])
            c = _add(_jet(model["environments"][n]),
                     _jsum(_scale(q[i], model["epsilon"][n][_EDGES[i]["from"]]) for i in _IN[n]))
            raw = _multiply(x, c)
            outputs[n] = raw if domain == "signed" or raw.value > 0 else _jet(0)
            if domain != "signed" and raw.value == 0 and not raw.constant:
                kinks.append({"node": n, "input": x.value, "coefficient": c.value,
                              "raw_gradient": raw.gradient[:], "reason": "Rectification threshold; no derivative asserted"})
        for position, i in enumerate(_OUT[n]):
            if len(_OUT[n]) == 1:
                fraction = _jet(1)
            else:
                fraction = _jet(controls[f"s{n}"], _KEYS.index(f"s{n}"))
                if position:
                    fraction = _add(_jet(1), _scale(fraction, -1))
            q[i] = _multiply(outputs[n], fraction)
    absolute = []
    for i in _IN["8"]:
        flow = q[i]
        if domain == "signed" and objective == "arrivals" and flow.value == 0 and not flow.constant:
            kinks.append({"edge": _EDGES[i]["id"], "reason": "Absolute value at zero; no derivative asserted"})
        absolute.append(_scale(flow, -1) if flow.value < 0 else flow)
    chosen = _jsum(absolute) if objective == "arrivals" else outputs["8"]
    smooth = not kinks and all(math.isfinite(v) for v in chosen.gradient + [v for row in chosen.hessian for v in row])
    return {"gradient": chosen.gradient if smooth else None, "hessian": chosen.hessian if smooth else None,
            "differentiable": smooth, "kinks": kinks}


def _evaluate(model, controls, domain, objective, detailed=False):
    q, nodes, flows, valid, reason = [0.0] * 12, [], [None] * 12, True, None
    for n in _ORDER:
        x = 1 if n == "1" else _sum(q[i] for i in _IN[n])
        c = 1 if n == "1" else model["environments"][n] + _sum(model["epsilon"][n][_EDGES[i]["from"]] * q[i] for i in _IN[n])
        raw = x * c
        y = 1 if n == "1" else raw if domain == "signed" else max(0, raw)
        if not math.isfinite(y) or not math.isfinite(c):
            valid, reason = False, reason or "Non-finite propagation"
        if n != "1" and domain == "efficiency" and not 0 <= c <= 1:
            valid, reason = False, reason or f"Coefficient of node {n} outside [0,1]"
        nodes.append({"id": n, "input": x, "coefficient": c, "raw_output": raw, "output": y,
                      "rectified": domain != "signed" and raw < 0})
        for position, i in enumerate(_OUT[n]):
            fraction = 1 if len(_OUT[n]) == 1 else controls[f"s{n}"] if position == 0 else 1 - controls[f"s{n}"]
            q[i] = y * fraction
            flows[i] = {**_EDGES[i], "fraction": fraction, "value": q[i]}
    objectives = {"arrivals": _sum(abs(q[i]) for i in _IN["8"]),
                  "algebraic_arrivals": nodes[-1]["input"], "output": nodes[-1]["output"]}
    derivatives = _derivatives(model, controls, domain, objective) if detailed else {
        "gradient": None, "hessian": None, "differentiable": None, "computed": False}
    return {"controls": controls.copy(), "nodes": nodes, "flows": flows, "objectives": objectives,
            "objective": objectives[objective], "objective_kind": objective, "domain": domain,
            "feasible": valid, "reason": reason, "derivatives": derivatives}


def evaluate(model, controls=None, *, domain="rectified", objective="output", detailed=True):
    _mode(domain, objective)
    ready = validate_model(model)
    return _evaluate(ready, _controls(ready["initial_controls"] if controls is None else controls), domain, objective, detailed)


# Directed IEEE-754 interval arithmetic; no model value is silently clipped.
def _up(value):
    return math.nextafter(value, math.inf)


def _down(value):
    return math.nextafter(value, -math.inf)


def _iv(value):
    return [value, value]


def _ia(a, b):
    return [_down(a[0] + b[0]), _up(a[1] + b[1])]


def _im(a, b):
    values = [x * y for x in a for y in b]
    return [_down(min(values)), _up(max(values))]


def _idiv(a, b):
    values = [x / y for x in a for y in b]
    return [_down(min(values)), _up(max(values))]


def _isum(values):
    result = _iv(0)
    for value in values:
        result = _ia(result, value)
    return result


def _nonnegative(a):
    return [max(0, a[0]), max(0, a[1])]


def _iabs(a):
    return [0 if a[0] <= 0 <= a[1] else min(abs(a[0]), abs(a[1])), max(abs(a[0]), abs(a[1]))]


def _quadratic_range(interval, e, epsilon):
    candidates = [_iv(interval[0]), _iv(interval[1])]
    if epsilon:
        stationary = _idiv(_iv(-e), _im(_iv(2), _iv(epsilon)))
        if stationary[1] > interval[0] and stationary[0] < interval[1]:
            candidates.append([max(interval[0], stationary[0]), min(interval[1], stationary[1])])
    values = [_ia(_im(_iv(e), x), _im(_iv(epsilon), _im(x, x))) for x in candidates]
    return [min(v[0] for v in values), max(v[1] for v in values)]


def _box(box):
    if not isinstance(box, (list, tuple)) or len(box) != 5:
        raise ValueError("Five intervals are required")
    result = []
    for pair in box:
        if not isinstance(pair, (list, tuple)) or len(pair) != 2 or not all(_finite(v) for v in pair) or not 0 <= pair[0] <= pair[1] <= 1:
            raise ValueError("Each fraction interval must satisfy 0 <= lower <= upper <= 1")
        result.append(list(pair))
    return result


def _bound(model, box, domain, objective):
    q = [None] * 12
    nodes = {"1": {"input": _iv(1), "coefficient": _iv(1), "output": _iv(1)}}
    impossible = False
    for n in _ORDER:
        if n != "1":
            x = _isum(q[i] for i in _IN[n])
            c = _ia(_iv(model["environments"][n]), _isum(_im(_iv(model["epsilon"][n][_EDGES[i]["from"]]), q[i]) for i in _IN[n]))
            i = _IN[n][0]
            raw = _quadratic_range(q[i], model["environments"][n], model["epsilon"][n][_EDGES[i]["from"]]) if len(_IN[n]) == 1 else _im(x, c)
            nodes[n] = {"input": x, "coefficient": c, "output": raw if domain == "signed" else _nonnegative(raw)}
            if domain == "efficiency" and (c[1] < 0 or c[0] > 1):
                impossible = True
        for position, i in enumerate(_OUT[n]):
            if len(_OUT[n]) == 1:
                fraction = _iv(1)
            else:
                s = box[_KEYS.index(f"s{n}")]
                fraction = s if position == 0 else [_down(1 - s[1]), _up(1 - s[0])]
            transfer = _im(nodes[n]["output"], _nonnegative(fraction))
            q[i] = transfer if domain == "signed" else _nonnegative(transfer)
    selected = _isum(_iabs(q[i]) for i in _IN["8"]) if objective == "arrivals" else nodes["8"]["output"]
    result = {"box": deepcopy(box), "upper_bound": selected[1], "lower_bound": selected[0],
              "impossible": impossible, "nodes": nodes, "flows": q, "cut_bounds": None,
              "arithmetic": "outward-rounded-intervals"}
    if domain == "signed":
        return result
    # For nonnegative transfers only, downstream coefficient ceilings bound
    # every path. This is a generic cut, never a preset-specific optimum.
    weights = {"8": 1}
    for n in reversed(_ORDER[:-1]):
        weights[n] = max(1 if _EDGES[i]["to"] == "8" and objective == "arrivals" else
                         _im(_iv(max(0, nodes[_EDGES[i]["to"]]["coefficient"][1])), _iv(weights[_EDGES[i]["to"]]))[1]
                         for i in _OUT[n])
    source_outputs = _isum(_im(_iv(weights[n]), _iv(nodes[n]["output"][1])) for n in ("2", "5"))[1]
    gains = [_im(_iv(weights[n]), _iv(max(0, nodes[n]["coefficient"][1])))[1] for n in ("2", "5")]
    source_inputs = max(_ia(_im(_iv(gains[0]), _iv(s)), _im(_iv(gains[1]), [_down(1-s), _up(1-s)]))[1] for s in box[0])
    result.update(upper_bound=min(selected[1], source_outputs, source_inputs),
                  cut_bounds={"source_inputs": source_inputs, "source_outputs": source_outputs})
    return result


def bound_box(model, box, *, domain="rectified", objective="output"):
    _mode(domain, objective)
    return _bound(validate_model(model), _box(box), domain, objective)


def _callbacks(on_progress, should_cancel):
    if on_progress is not None and not callable(on_progress) or should_cancel is not None and not callable(should_cancel):
        raise TypeError("Callbacks must be callable")


def search_grid(model, *, domain="rectified", objective="output", divisions=5,
                max_evaluations=200000, on_progress=None, should_cancel=None):
    _mode(domain, objective)
    _callbacks(on_progress, should_cancel)
    ready = validate_model(model)
    divisions = _integer(divisions, 1, 100, "divisions")
    limit = _integer(max_evaluations, 0, 2**53-1, "max_evaluations")
    total, best, evaluations, feasible_count, cancelled = (divisions+1)**5, None, 0, 0, False

    def snapshot():
        return {"method": "grid", "best": best, "status": "cancelled" if cancelled else "complete" if evaluations == total else "evaluation-limit",
                "complete": not cancelled and evaluations == total, "evaluations": evaluations, "feasible_count": feasible_count,
                "total": total, "divisions": divisions, "upper_bound": None, "gap": None}

    while evaluations < min(total, limit):
        if should_cancel and should_cancel():
            cancelled = True
            break
        code, controls = evaluations, {}
        for key in _KEYS:
            controls[key] = (code % (divisions+1)) / divisions
            code //= divisions+1
        state = _evaluate(ready, controls, domain, objective)
        evaluations += 1
        if state["feasible"]:
            feasible_count += 1
            if best is None or state["objective"] > best["objective"]:
                best = _evaluate(ready, controls, domain, objective, True)
        if on_progress and evaluations % 1000 == 0:
            on_progress(snapshot())
    result = snapshot()
    if on_progress:
        on_progress(result)
    return result


def search_local(model, *, domain="rectified", objective="output", initial_controls=None,
                 initial_step=.1, min_step=1e-5, max_evaluations=1000,
                 on_progress=None, should_cancel=None):
    _mode(domain, objective)
    _callbacks(on_progress, should_cancel)
    ready = validate_model(model)
    step = _positive(initial_step, "initial_step")
    minimum = _positive(min_step, "min_step")
    limit = _integer(max_evaluations, 0, 2**53-1, "max_evaluations")
    if step > 1 or minimum > step:
        raise ValueError("min_step <= initial_step <= 1 required")
    start = _controls(ready["initial_controls"] if initial_controls is None else initial_controls)
    best, evaluations, status, history = None, 0, "evaluation-limit", []

    def snapshot():
        return {"method": "local", "best": best, "status": status, "complete": status == "local-stop",
                "evaluations": evaluations, "step": step, "history": deepcopy(history), "upper_bound": None, "gap": None}

    if should_cancel and should_cancel():
        status = "cancelled"
    elif limit:
        first = _evaluate(ready, start, domain, objective, True)
        evaluations += 1
        if first["feasible"]:
            best = first
        else:
            status = "no-feasible-start"
    if best is not None:
        history.append({"evaluations": evaluations, "step": step, "controls": best["controls"].copy(), "objective": best["objective"]})
    while best is not None and evaluations < limit and step >= minimum and status != "cancelled":
        if should_cancel and should_cancel():
            status = "cancelled"
            break
        candidate = best
        for key in _KEYS:
            for sign in (-1, 1):
                if evaluations >= limit or status == "cancelled":
                    break
                if should_cancel and should_cancel():
                    status = "cancelled"
                    break
                value = min(1, max(0, best["controls"][key] + sign * step))
                if value == best["controls"][key]:
                    continue
                state = _evaluate(ready, {**best["controls"], key: value}, domain, objective)
                evaluations += 1
                if state["feasible"] and state["objective"] > candidate["objective"]:
                    candidate = state
        if candidate is not best:
            best = _evaluate(ready, candidate["controls"], domain, objective, True)
            history.append({"evaluations": evaluations, "step": step, "controls": best["controls"].copy(), "objective": best["objective"]})
        else:
            step /= 2
        if on_progress:
            on_progress(snapshot())
    if status != "cancelled" and best is not None and step < minimum:
        status = "local-stop"
    result = snapshot()
    if on_progress:
        on_progress(result)
    return result


def search_global(model, *, domain="rectified", objective="output", initial_controls=None,
                  max_nodes=1000, tolerance=1e-5, on_progress=None, should_cancel=None):
    _mode(domain, objective)
    _callbacks(on_progress, should_cancel)
    ready = validate_model(model)
    start = _controls(ready["initial_controls"] if initial_controls is None else initial_controls)
    max_nodes = _integer(max_nodes, 0, 1000000, "max_nodes")
    tolerance = _positive(tolerance, "tolerance")
    root = _bound(ready, [[0, 1] for _ in _KEYS], domain, objective)
    root["id"] = 0
    queue, unresolved = ([] if root["impossible"] else [root]), []
    best, evaluations, processed, next_id, closed_upper, cancelled = None, 0, 0, 1, -math.inf, False

    def consider(controls):
        nonlocal best, evaluations
        state = _evaluate(ready, controls, domain, objective)
        evaluations += 1
        if state["feasible"] and (best is None or state["objective"] > best["objective"]):
            best = _evaluate(ready, controls, domain, objective, True)

    def snapshot():
        upper = max([best["objective"] if best is not None else -math.inf, closed_upper]
                    + [node["upper_bound"] for node in queue + unresolved])
        gap = max(0, upper-best["objective"]) if best is not None else None
        certified = best is not None and gap <= tolerance
        status = ("cancelled" if cancelled else "certified" if certified else
                  "infeasible" if not queue and not unresolved and best is None else
                  "uncertain" if unresolved and not queue else "node-limit")
        return {"method": "interval-global", "best": best, "status": status,
                "complete": not cancelled and (certified or status == "infeasible"),
                "evaluations": evaluations, "processed_nodes": processed, "open_nodes": len(queue)+len(unresolved),
                "max_nodes": max_nodes, "tolerance": tolerance, "upper_bound": None if upper == -math.inf else upper, "gap": gap}

    if should_cancel and should_cancel():
        cancelled = True
    elif not root["impossible"]:
        consider(start)
        for code in range(32):
            if should_cancel and should_cancel():
                cancelled = True
                break
            consider({key: (code >> i) & 1 for i, key in enumerate(_KEYS)})
    if on_progress:
        on_progress(snapshot())
    while not cancelled and queue and processed < max_nodes:
        if should_cancel and should_cancel():
            cancelled = True
            break
        if snapshot()["complete"]:
            break
        queue.sort(key=lambda item: (-item["upper_bound"], item["id"]))
        node = queue.pop(0)
        if best is not None and node["upper_bound"] <= best["objective"] + tolerance:
            closed_upper = max(closed_upper, node["upper_bound"])
            continue
        processed += 1
        widths = [hi-lo for lo, hi in node["box"]]
        axis = widths.index(max(widths))
        if widths[axis] <= 1e-12:
            unresolved.append(node)
            continue
        middle = (node["box"][axis][0]+node["box"][axis][1])/2
        for interval in ([node["box"][axis][0], middle], [middle, node["box"][axis][1]]):
            box = deepcopy(node["box"])
            box[axis] = interval
            child = _bound(ready, box, domain, objective)
            child["upper_bound"] = min(child["upper_bound"], node["upper_bound"])
            child["id"], next_id = next_id, next_id+1
            if child["impossible"]:
                continue
            consider({key: (box[i][0]+box[i][1])/2 for i, key in enumerate(_KEYS)})
            if best is not None and child["upper_bound"] <= best["objective"]+tolerance:
                closed_upper = max(closed_upper, child["upper_bound"])
            else:
                queue.append(child)
        if on_progress and processed % 25 == 0:
            on_progress(snapshot())
    result = {**snapshot(), "certificate": {"type": "interval-propagation-dag", "arithmetic": "outward-rounded-intervals",
              "root_upper_bound": root["upper_bound"], "closed_upper": None if closed_upper == -math.inf else closed_upper,
              "frontier": [{"id": node["id"], "box": deepcopy(node["box"]), "upper_bound": node["upper_bound"]} for node in queue+unresolved],
              "scope": {"objective": objective, "domain": domain}}}
    if on_progress:
        on_progress(result)
    return result


def witness_point(state):
    """q on 12 edges, then X2..X8, then Y2..Y8: 26 free coordinates."""
    if not isinstance(state, dict) or not state.get("feasible"):
        raise ValueError("A compatible state is required")
    flows = {flow["id"]: flow for flow in state["flows"]}
    nodes = {node["id"]: node for node in state["nodes"]}
    return [flows[edge["id"]]["value"] for edge in _EDGES] + [nodes[n]["input"] for n in _IDS] + [nodes[n]["output"] for n in _IDS]


def evaluate_lagrangian(model, point, *, multipliers=None, domain="rectified", objective="output"):
    """L=F+lambda*hX+mu*hY+eta*hshare; multipliers ordered in three blocks7.

    Raw free-coordinate derivatives differ from derivatives on a compatible
    five-share surface. A selected kink subgradient is never called a gradient.
    """
    _mode(domain, objective)
    ready = validate_model(model)
    if not isinstance(point, (list, tuple)) or len(point) != 26 or not all(_finite(v) for v in point):
        raise ValueError("26 finite coordinates are required")
    multipliers = [0.0]*21 if multipliers is None else multipliers
    if not isinstance(multipliers, (list, tuple)) or len(multipliers) != 21 or not all(_finite(v) for v in multipliers):
        raise ValueError("21 finite multipliers are required")
    q = point[:12]
    x = {n: point[12+i] for i, n in enumerate(_IDS)}
    y = {"1": 1, **{n: point[19+i] for i, n in enumerate(_IDS)}}
    gradient, hessian, kinks, constraints, coefficients, active = [0.0]*26, [[0.0]*26 for _ in range(26)], [], [], {}, {}
    value = y["8"] if objective == "output" else 0
    if objective == "output":
        gradient[25] = 1
    else:
        for i in _IN["8"]:
            value += abs(q[i])
            gradient[i] = (q[i] > 0) - (q[i] < 0)
            if q[i] == 0:
                kinks.append({"type": "absolute-flow", "edge": _EDGES[i]["id"], "selection": 0})
    for j, n in enumerate(_IDS):
        c = ready["environments"][n] + _sum(ready["epsilon"][n][_EDGES[i]["from"]]*q[i] for i in _IN[n])
        raw = x[n]*c
        coefficients[n], active[n] = c, 1 if domain == "signed" or raw > 0 else 0
        constraints.append({"id": f"input-{n}", "value": x[n]-_sum(q[i] for i in _IN[n]), "multiplier": multipliers[j]})
        if domain != "signed" and raw == 0 and multipliers[7+j] != 0:
            kinks.append({"type": "rectification", "node": n, "selection": 0})
    for j, n in enumerate(_IDS):
        raw = x[n]*coefficients[n]
        constraints.append({"id": f"law-{n}", "value": y[n]-(raw if domain == "signed" else max(0, raw)), "multiplier": multipliers[7+j]})
    for j in range(1, 8):
        n = str(j)
        constraints.append({"id": f"share-{n}", "value": _sum(q[i] for i in _OUT[n])-y[n], "multiplier": multipliers[14+j-1]})
    for j, n in enumerate(_IDS):
        lam, mu, phi = multipliers[j], multipliers[7+j], active[n]
        gradient[12+j] += lam-mu*phi*coefficients[n]
        gradient[19+j] += mu-(0 if n == "8" else multipliers[14+int(n)-1])
        for i in _IN[n]:
            epsilon = ready["epsilon"][n][_EDGES[i]["from"]]
            gradient[i] += -lam-mu*phi*x[n]*epsilon
            hessian[i][12+j] = hessian[12+j][i] = -mu*phi*epsilon
    for i, edge in enumerate(_EDGES):
        gradient[i] += multipliers[14+int(edge["from"])-1]
    lagrangian = value + _sum(item["multiplier"]*item["value"] for item in constraints)
    residual, share_admissible = _max_abs(item["value"] for item in constraints), True
    for j in range(1, 8):
        n, supply = str(j), y[str(j)]
        for i in _OUT[n]:
            if domain == "signed":
                invalid = q[i] != 0 if supply == 0 else q[i] > 0 or q[i] < supply-1e-10 if supply < 0 else q[i] < 0 or q[i] > supply+1e-10
            else:
                invalid = supply < 0 or q[i] < 0 or q[i] > supply+1e-10
            if invalid:
                share_admissible = False
    domain_admissible = domain == "signed" or (all(v >= 0 for v in list(x.values())+list(y.values()))
                                               and (domain != "efficiency" or all(0 <= v <= 1 for v in coefficients.values())))
    return {"point": list(point), "objective": value, "lagrangian": lagrangian, "multipliers": list(multipliers),
            "constraints": constraints, "coefficients": coefficients, "residual": residual,
            "feasible": residual <= 1e-10 and share_admissible and domain_admissible,
            "share_admissible": share_admissible, "domain_admissible": domain_admissible,
            "differentiable": not kinks, "gradient": None if kinks else gradient,
            "selected_gradient": gradient, "hessian": None if kinks else hessian, "kinks": kinks,
            "convention": "hX=X−Σq; hY="+("Y−XC" if domain == "signed" else "Y−max(0,XC)")+"; hshare=Σq−Y, Y1=1; L=F+λhX+μhY+ηhshare"}


def explain_lagrangian(model, state, *, domain=None, objective=None):
    """Adjoint multipliers at this reference, not a global optimality proof."""
    domain = state.get("domain", "rectified") if domain is None else domain
    objective = state.get("objective_kind", "output") if objective is None else objective
    _mode(domain, objective)
    ready = validate_model(model)
    checked = evaluate(ready, state.get("controls"), domain=domain, objective=objective)
    reference, supplied = witness_point(checked), witness_point(state)
    if _max_abs(a-b for a, b in zip(reference, supplied)) > 1e-10:
        raise ValueError("The state does not match the model and domain")
    nodes = {node["id"]: node for node in checked["nodes"]}
    potentials, values, selections = {"8": 1 if objective == "output" else 0}, {}, []
    for n in reversed(_ORDER[:-1]):
        potentials[n] = 0
        for i in _OUT[n]:
            edge, flow = _EDGES[i], checked["flows"][i]
            node = nodes[edge["to"]]
            phi = 1 if domain == "signed" or node["raw_output"] > 0 else 0
            if domain != "signed" and node["raw_output"] == 0:
                selections.append({"node": edge["to"], "selection": 0, "reason": "Rectification threshold: selected subgradient"})
            direct = 0
            if edge["to"] == "8" and objective == "arrivals":
                direct = (flow["value"] > 0)-(flow["value"] < 0)
                if flow["value"] == 0:
                    selections.append({"edge": edge["id"], "selection": 0, "reason": "Absolute zero transfer: selected subgradient"})
            value = direct+potentials[edge["to"]]*phi*(node["coefficient"]+node["input"]*ready["epsilon"][edge["to"]][n])
            values[edge["id"]] = value
            potentials[n] += flow["fraction"]*value
    mu = [-potentials[n] for n in _IDS]
    lam = [mu[i]*(1 if domain == "signed" or nodes[n]["raw_output"] > 0 else 0)*nodes[n]["coefficient"] for i, n in enumerate(_IDS)]
    eta = [-potentials[str(i)] for i in range(1, 8)]
    multipliers = lam+mu+eta
    at_reference = evaluate_lagrangian(ready, reference, multipliers=multipliers, domain=domain, objective=objective)
    return {"available": True, "reference_point": reference, "multipliers": multipliers, "lambda": lam, "mu": mu,
            "eta": eta, "potentials": potentials, "edge_values": values, "at_reference": at_reference,
            "selections": selections, "max_selected_gradient": _max_abs(at_reference["selected_gradient"]),
            "global_certificate": False,
            "interpretation": "Adjoints at fixed shares. Small derivatives or selected subgradients do not certify a global maximum."}
