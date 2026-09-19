"""Optimize one family of nodal concordance variables, with everything else fixed.

Groups: shares (5 fractions), environments (e2..e8), epsilon (12 active
destination-first coefficients). The 44 inactive coefficients are never
optimized. Local SLSQP, differential evolution and a finite grid return
witnesses, not continuous global certificates. Only the interval search on
shares can provide a global numerical enclosure for this fixed model.
"""

from copy import deepcopy
import math

from . import concordances as c


GROUPS = {"shares": "Distributions · cinq partages", "environments": "Environnements · sept nœuds",
          "epsilon": "Concordances · douze coefficients actifs"}
_NODES = tuple(str(i) for i in range(2, 9))
_EDGES = tuple(deepcopy(c.GRAPH["edges"]))
_ORDER = tuple(c.GRAPH["order"])
_SHARES = tuple(c.GRAPH["controls"])
_OUT = {n: tuple(e for e in _EDGES if e["from"] == n) for n in _ORDER}
_IN = {n: tuple(e for e in _EDGES if e["to"] == n) for n in _ORDER}


def _finite(value):
    try:
        return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)
    except OverflowError:
        return False


def _integer(value, lower, upper, name):
    if not _finite(value) or int(value) != value or not lower <= value <= upper:
        raise ValueError(f"{name} must be an integer in [{lower},{upper}]")
    return int(value)


def _domain(domain):
    if domain not in ("signed", "rectified"):
        raise ValueError("These searches study signed or rectified laws, without extra efficiency constraints")


def variables(model, group="shares"):
    """Return parallel names/labels/values/bounds lists for exactly one family."""
    ready = c.validate_model(model)
    if group not in GROUPS:
        raise ValueError("group must be shares, environments or epsilon")
    if group == "shares":
        names = list(_SHARES)
        labels = [f"Partage du nœud {name[1:]}" for name in names]
        values = [ready["initial_controls"][name] for name in names]
        bounds = [[0.0, 1.0] for _ in names]
    elif group == "environments":
        names = [f"e{n}" for n in _NODES]
        labels = [f"Environnement e{n}" for n in _NODES]
        values = [ready["environments"][n] for n in _NODES]
        bounds = [[-1.0, 1.0] for _ in names]
    else:
        names = [f"eps_{e['to']}_{e['from']}" for e in _EDGES]
        labels = [f"ε{e['to']},{e['from']} · {e['from']} → {e['to']}" for e in _EDGES]
        values = [ready["epsilon"][e["to"]][e["from"]] for e in _EDGES]
        bounds = [[-1.0, 1.0] for _ in names]
    return {"group": group, "names": names, "labels": labels, "values": values, "bounds": bounds}


def _values(spec, values):
    if isinstance(values, dict):
        if set(values) != set(spec["names"]):
            raise ValueError("Values must name every selected variable exactly once")
        values = [values[name] for name in spec["names"]]
    if isinstance(values, (str, bytes)):
        raise ValueError("Expected a vector or a complete dictionary of values")
    try:
        result = list(values)
    except TypeError as error:
        raise ValueError("Expected a vector or a complete dictionary of values") from error
    if len(result) != len(spec["names"]):
        raise ValueError("Wrong number of variables")
    for i, (value, (lower, upper)) in enumerate(zip(result, spec["bounds"])):
        # numpy scalars are converted explicitly, never clipped into the domain.
        if isinstance(value, bool):
            raise ValueError("Boolean values are not numerical parameters")
        try:
            numeric = float(value)
        except (TypeError, ValueError, OverflowError) as error:
            raise ValueError(f"Invalid value for {spec['names'][i]}") from error
        if isinstance(value, (str, bytes)) or not math.isfinite(numeric) or not lower <= numeric <= upper:
            raise ValueError(f"{spec['names'][i]} must be in [{lower},{upper}]")
        result[i] = numeric
    return result


def _apply(model, spec, values):
    result = deepcopy(model)
    if spec["group"] == "shares":
        result["initial_controls"] = dict(zip(spec["names"], values))
    elif spec["group"] == "environments":
        for n, value in zip(_NODES, values):
            result["environments"][n] = value
    else:
        for edge, value in zip(_EDGES, values):
            result["epsilon"][edge["to"]][edge["from"]] = value
    return result


def apply_values(model, group, values):
    """Copy deeply; replace only the selected values, preserving free attributes."""
    spec = variables(model, group)
    return _apply(model, spec, _values(spec, values))


def _product_constant(a, a_constant, b, b_constant):
    return (a_constant and a == 0) or (b_constant and b == 0) or (a_constant and b_constant)


def _kinks(model, state, group, domain):
    """Conservative group-specific threshold detection, without fake derivatives.

    A law may be constant zero under shares but kinked under changes of e or
    epsilon. Conversely a fixed zero incoming flow annihilates such changes.
    Constant cancellation not established here is deliberately not assumed.
    """
    if domain == "signed":
        return []
    nodes = {n["id"]: n for n in state["nodes"]}
    flows = {e["id"]: e for e in state["flows"]}
    q_constant, y_constant, kinks = {}, {"1": True}, []
    for n in _ORDER:
        if n != "1":
            x_constant = all(q_constant[e["id"]] for e in _IN[n])
            c_constant = group != "environments" and all(
                _product_constant(model["epsilon"][n][e["from"]], group != "epsilon",
                                  flows[e["id"]]["value"], q_constant[e["id"]]) for e in _IN[n])
            node = nodes[n]
            raw_constant = _product_constant(node["input"], x_constant, node["coefficient"], c_constant)
            if node["raw_output"] == 0 and not raw_constant:
                kinks.append({"node": n, "input": node["input"], "coefficient": node["coefficient"],
                              "reason": "Selected variables can cross a rectification threshold; no classical gradient asserted"})
            y_constant[n] = raw_constant if node["raw_output"] > 0 else True
        for edge in _OUT[n]:
            flow = flows[edge["id"]]
            fraction_constant = group != "shares" or len(_OUT[n]) == 1
            q_constant[edge["id"]] = _product_constant(nodes[n]["output"], y_constant[n], flow["fraction"], fraction_constant)
    return kinks


def gradient(model, group="shares", *, domain="signed", tolerance=1e-7):
    """Exact smooth first derivatives from reverse adjoints; phi=0 is selected at kinks.

    For maximization on a box the projected residual is P(x+grad)-x. Its
    vanishing is a necessary first-order condition, never a maximum proof.
    At a detected threshold selected_gradient is exposed separately and KKT
    stationarity is not asserted. No multipliers from an unrelated PL are used.
    """
    _domain(domain)
    if not _finite(tolerance) or tolerance <= 0:
        raise ValueError("tolerance must be finite and positive")
    spec = variables(model, group)
    state = c.evaluate(model, domain=domain, detailed=False)
    nodes = {node["id"]: node for node in state["nodes"]}
    flows = {flow["id"]: flow for flow in state["flows"]}
    phi = {n: 1 if domain == "signed" or nodes[n]["raw_output"] > 0 else 0 for n in _NODES}
    potentials, edge_values = {"8": 1.0}, {}
    for n in reversed(_ORDER[:-1]):
        potentials[n] = 0.0
        for edge in _OUT[n]:
            to = edge["to"]
            node = nodes[to]
            value = potentials[to]*phi[to]*(node["coefficient"]+node["input"]*model["epsilon"][to][n])
            edge_values[edge["id"]] = value
            potentials[n] += flows[edge["id"]]["fraction"]*value
    if group == "shares":
        selected = [nodes[name[1:]]["output"]*(edge_values[_OUT[name[1:]][0]["id"]]-edge_values[_OUT[name[1:]][1]["id"]]) for name in _SHARES]
        formula = "∂Y₈/∂sᵢ = Yᵢ(vᵢ,first − vᵢ,second)"
    elif group == "environments":
        selected = [potentials[n]*phi[n]*nodes[n]["input"] for n in _NODES]
        formula = "∂Y₈/∂eᵢ = pᵢ φᵢ Xᵢ"
    else:
        selected = [potentials[e["to"]]*phi[e["to"]]*nodes[e["to"]]["input"]*flows[e["id"]]["value"] for e in _EDGES]
        formula = "∂Y₈/∂εᵢⱼ = pᵢ φᵢ Xᵢ qⱼᵢ"
    kinks = _kinks(model, state, group, domain)
    differentiable = not kinks and all(math.isfinite(v) for v in selected)
    projected = [min(hi, max(lo, x+g))-x for x, g, (lo, hi) in zip(spec["values"], selected, spec["bounds"])] if differentiable else None
    norm = max(map(abs, projected)) if projected is not None else None
    kkt = {"available": differentiable, "residual": norm, "tolerance": tolerance,
           "stationary": norm <= tolerance if norm is not None else None,
           "criterion": "||P_box(x+gradient)-x||∞; necessary first-order condition only",
           "global_certificate": False}
    return {**spec, "state": state, "gradient": selected if differentiable else None,
            "selected_gradient": selected, "differentiable": differentiable, "kinks": kinks,
            "projected_gradient": projected, "projected_gradient_norm": norm,
            "kkt": kkt, "formula": formula, "potentials": potentials}


class _BudgetReached(Exception):
    pass


class _Cancelled(Exception):
    pass


def search(model, group="shares", *, method="local", domain="signed", seed=42,
           max_evaluations=1000, iterations=80, divisions=2, max_nodes=1000,
           tolerance=1e-7, on_progress=None, should_cancel=None):
    """Compare searches with a common initial point and unchanged other variables.

    max_evaluations is a strict unique-point budget for local/evolution/grid.
    Interval search instead uses max_nodes and reports its actual evaluations.
    Its enclosure is available only for shares at fixed e and epsilon.
    SLSQP uses exact derivatives off thresholds and explicitly tracked slope
    selections at thresholds; neither solver success nor DE convergence is an
    optimality certificate. A partial grid is a prefix, not its full optimum.
    """
    _domain(domain)
    if method not in ("local", "evolution", "grid", "interval"):
        raise ValueError("method must be local, evolution, grid or interval")
    spec = variables(model, group)
    limit = _integer(max_evaluations, 0, 2**53-1, "max_evaluations")
    iterations = _integer(iterations, 1, 10000, "iterations")
    divisions = _integer(divisions, 1, 100, "divisions")
    max_nodes = _integer(max_nodes, 0, 1000000, "max_nodes")
    seed = _integer(seed, 0, 2**32-1, "seed")
    if not _finite(tolerance) or tolerance <= 0:
        raise ValueError("tolerance must be finite and positive")
    if on_progress is not None and not callable(on_progress) or should_cancel is not None and not callable(should_cancel):
        raise TypeError("Callbacks must be callable")
    if method == "interval":
        if group != "shares":
            raise ValueError("Interval certificates are currently available only for shares at fixed environments and epsilon")
        def wrap(raw, final=False):
            best = raw["best"]
            values = [best["controls"][name] for name in spec["names"]] if best else None
            best_model = _apply(model, spec, values) if values is not None else None
            return {"group": group, "names": spec["names"], "method": method, "domain": domain,
                    "best_model": best_model, "best_state": best, "values": values,
                    "evaluations": raw["evaluations"], "status": raw["status"], "complete": raw["complete"],
                    "upper_bound": raw["upper_bound"], "gap": raw["gap"],
                    "certificate": raw.get("certificate"), "certified": raw["status"] == "certified",
                    "stationarity": gradient(best_model, group, domain=domain, tolerance=tolerance) if final and best_model else None,
                    "processed_nodes": raw["processed_nodes"], "budget_kind": "subproblem-nodes", "max_nodes": max_nodes,
                    "scope": "Continuous five-share box; environments and epsilon fixed", "solver_success": None}
        raw = c.search_global(model, domain=domain, max_nodes=max_nodes, tolerance=tolerance,
                              should_cancel=should_cancel,
                              on_progress=(lambda snapshot: on_progress(wrap(snapshot))) if on_progress else None)
        return wrap(raw, True)

    cache, best, evaluations, selections = {}, None, 0, 0
    status, message, solver_success, solver_iterations = "evaluation-limit", "Evaluation budget reached", None, 0
    total = (divisions+1)**len(spec["names"]) if method == "grid" else None

    def snapshot(final=False):
        best_model = best["model"] if best else None
        return {"group": group, "names": spec["names"], "method": method, "domain": domain,
                "best_model": deepcopy(best_model), "best_state": deepcopy(best["state"]) if best else None,
                "values": list(best["values"]) if best else None, "evaluations": evaluations,
                "status": status, "complete": status in ("local-stop", "evolution-stop", "complete"),
                "solver_success": solver_success, "message": message, "iterations": solver_iterations,
                "upper_bound": None, "gap": None, "certificate": None, "certified": False,
                "stationarity": gradient(best_model, group, domain=domain, tolerance=tolerance) if final and best_model else None,
                "seed": seed if method == "evolution" else None, "total_grid_points": total,
                "subgradient_selections": selections, "max_evaluations": limit,
                "scope": "Finite mesh only" if method == "grid" else "Feasible witness; no continuous global certificate"}

    def evaluate_values(values):
        nonlocal best, evaluations
        if should_cancel and should_cancel():
            raise _Cancelled()
        values = _values(spec, values)
        key = tuple(values)
        if key in cache:
            return cache[key]
        if evaluations >= limit:
            raise _BudgetReached()
        candidate = _apply(model, spec, values)
        state = c.evaluate(candidate, domain=domain, detailed=False)
        evaluations += 1
        record = {"model": candidate, "state": state, "values": values}
        cache[key] = record
        if state["feasible"] and (best is None or state["objective"] > best["state"]["objective"]):
            best = record
        if on_progress and evaluations % 25 == 0:
            on_progress(snapshot())
        return record

    def objective(values):
        record = evaluate_values(values)
        if not record["state"]["feasible"]:
            raise ValueError("Non-finite candidate; optimization cannot supply a trustworthy result")
        return -record["state"]["objective"]

    def jacobian(values):
        nonlocal selections
        record = evaluate_values(values)
        if "derivative" not in record:
            record["derivative"] = gradient(record["model"], group, domain=domain, tolerance=tolerance)
            if not record["derivative"]["differentiable"]:
                selections += 1
        return [-value for value in record["derivative"]["selected_gradient"]]

    try:
        evaluate_values(spec["values"])
        if method == "grid":
            for code in range(total):
                values = []
                for lo, hi in spec["bounds"]:
                    index = code % (divisions+1)
                    code //= divisions+1
                    values.append(lo+(hi-lo)*index/divisions)
                evaluate_values(values)
            status, message, solver_success = "complete", "Every point of the finite mesh was evaluated; the initial point was also retained", True
        else:
            # SciPy is used only by the optimization layer, never the core model.
            from scipy.optimize import differential_evolution, minimize
            if method == "local":
                result = minimize(objective, spec["values"], jac=jacobian, method="SLSQP", bounds=spec["bounds"],
                                  options={"maxiter": iterations, "ftol": tolerance})
            else:
                import numpy as np
                result = differential_evolution(objective, spec["bounds"], x0=spec["values"],
                                                rng=np.random.default_rng(seed), maxiter=iterations,
                                                popsize=8, polish=False, tol=tolerance, updating="immediate", workers=1)
            solver_success, solver_iterations, message = bool(result.success), int(result.nit), str(result.message)
            status = ("local-stop" if method == "local" else "evolution-stop") if result.success else "iteration-limit" if result.nit >= iterations else "solver-stop"
    except _BudgetReached:
        status, message = "evaluation-limit", "Strict evaluation budget reached; best available witness retained"
    except _Cancelled:
        status, message = "cancelled", "Search cancelled; best available witness retained"
    final = snapshot(True)
    if on_progress:
        on_progress(final)
    return final
