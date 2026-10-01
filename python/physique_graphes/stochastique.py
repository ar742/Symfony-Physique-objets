"""Point 05 : support non orienté, poids symétriques, propagation vers 8.

Les cinq coordonnées éliminent exactement les égalités stochastiques.
Le certificat de Bernstein borne le polynôme sur TOUT le polytope, avec
arrondis vers +inf. Il ne dépend ni de la convergence locale ni des KKT.
"""
from fractions import Fraction as F
from functools import lru_cache
from math import comb, isfinite
import heapq

import numpy as np
from scipy.optimize import LinearConstraint, linprog, minimize, nnls

ARCS = ((1, 2), (1, 5), (2, 3), (2, 8), (5, 3), (5, 7),
        (7, 6), (7, 4), (3, 4), (3, 6), (4, 8), (6, 8))
ORDER = (1, 2, 5, 3, 7, 4, 6, 8)
NAMES = ("a12", "a23", "a35", "a34", "a67")
EDGE_NAMES = ("a12", "a15", "a23", "a28", "a35", "a57", "a67", "a47", "a34", "a36", "a48", "a68")
EXPRESSIONS = ("t", "1−t", "u", "1−t−u", "v", "t−v", "z", "1−t+v−z", "w", "1−u−v−w", "t−v+z−w", "u+v+w−z")
START = (.5, .25, .25, .25, .25)
OFFSET = np.array([0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0], dtype=float)
MAPPING = np.array([
    [1,0,0,0,0], [-1,0,0,0,0], [0,1,0,0,0], [-1,-1,0,0,0],
    [0,0,1,0,0], [1,0,-1,0,0], [0,0,0,0,1], [-1,0,1,0,-1],
    [0,0,0,1,0], [0,-1,-1,-1,0], [1,0,-1,-1,1], [0,1,1,1,-1],
], dtype=float)


def coordinates(values):
    x = np.asarray(values, dtype=float)
    if x.shape != (5,) or not np.isfinite(x).all():
        raise ValueError("Cinq coefficients finis sont requis, dans l’ordre a12, a23, a35, a34, a67.")
    return x


def coefficients(values):
    return OFFSET + MAPPING @ coordinates(values)


def feasible(values, tolerance=0.):
    a = coefficients(values)
    return bool(np.min(a) >= -tolerance and np.max(a) <= 1+tolerance)


def matrix(values):
    a = coefficients(values)
    result = np.zeros((8, 8))
    for (i, j), weight in zip(ARCS, a):
        result[i-1, j-1] = result[j-1, i-1] = weight
    return result


def objective_gradient(values):
    """Prolongement polynomial libre et gradient analytique (sans écrêtage)."""
    t, u, v, w, z = coordinates(values)
    A, B = t*u+(1-t)*v, (1-t)*(t-v)
    H, J, K, L, D = 1-t+v-z, 1-u-v-w, t-v+z-w, u+v+w-z, 1-t-u
    et, eu, ev, ew, ez = np.eye(5)
    dA = np.array([u-v, t, 1-t, 0, 0])
    dB = np.array([1-2*t+v, 0, t-1, 0, 0])
    P, Q = w*A+H*B, J*A+z*B
    dP = w*dA+A*ew+H*dB+B*MAPPING[7]
    dQ = J*dA+A*MAPPING[9]+z*dB+B*ez
    R = t*D+K*P+L*Q
    gradient = D*et+t*MAPPING[3]+P*MAPPING[10]+K*dP+Q*MAPPING[11]+L*dQ
    return float(R), gradient


def evaluate(values):
    x = coordinates(values)
    a = coefficients(x)
    # Tolérance d'arrondi seulement ; aucune projection ou normalisation.
    if not feasible(x, 1e-14):
        raise ValueError("Ces coefficients sortent du polytope : tous les douze aᵢⱼ reconstruits doivent être ≥ 0.")
    inputs = {n: 0. for n in ORDER}
    inputs[1] = 1.
    flows = []
    for i in ORDER:
        for k, (origin, j) in enumerate(ARCS):
            if origin == i:
                q = float(inputs[i]*a[k])
                inputs[j] += q
                flows.append({"from": str(i), "to": str(j), "coefficient": float(a[k]), "value": q})
    nodes = []
    for i in range(1, 9):
        incoming = [f for f in flows if f["to"] == str(i)]
        outgoing = [f for f in flows if f["from"] == str(i)]
        output = inputs[i] if i == 8 else sum(f["value"] for f in outgoing)
        nodes.append({"id": str(i), "input": inputs[i], "output": output,
                      "incoming": incoming, "outgoing": outgoing, "unused": inputs[i]-output})
    mat = matrix(x)
    return {"coordinates": x.tolist(), "coefficients": a.tolist(), "matrix": mat.tolist(),
            "objective": inputs[8], "nodes": nodes, "flows": flows,
            "stochastic_residual": float(max(abs(mat.sum(0)-1).max(), abs(mat.sum(1)-1).max())),
            "balance_residual": float(1-inputs[8]-sum(n["unused"] for n in nodes))}


# Arithmétique polynomiale exacte pour les dérivées, la base de Bernstein et
# la relecture rationnelle des témoins. Aucune dépendance symbolique requise.
ZERO = (0,)*5


def _add(*polys):
    result = {}
    for poly in polys:
        for e, c in poly.items():
            result[e] = result.get(e, F(0))+c
    return {e: c for e, c in result.items() if c}


def _scale(poly, scalar):
    return {e: c*scalar for e, c in poly.items() if c*scalar}


def _mul(p, q):
    result = {}
    for e, c in p.items():
        for f, d in q.items():
            g = tuple(a+b for a, b in zip(e, f))
            result[g] = result.get(g, F(0))+c*d
    return {e: c for e, c in result.items() if c}


@lru_cache(maxsize=1)
def polynomial():
    variables = [{tuple(int(i == j) for i in range(5)): F(1)} for j in range(5)]
    edges = [_add({ZERO: F(int(o))}, *(_scale(p, int(c)) for p, c in zip(variables, row)))
             for o, row in zip(OFFSET, MAPPING)]
    inputs = {n: {} for n in ORDER}
    inputs[1] = {ZERO: F(1)}
    for i in ORDER:
        for (origin, j), a in zip(ARCS, edges):
            if origin == i:
                inputs[j] = _add(inputs[j], _mul(inputs[i], a))
    return inputs[8]


def _differentiate(poly, axis):
    result = {}
    for e, c in poly.items():
        if e[axis]:
            f = list(e)
            f[axis] -= 1
            result[tuple(f)] = c*e[axis]
    return result


def _poly_value(poly, x):
    return sum(c * np.prod([v**n for v, n in zip(x, e)], dtype=object) for e, c in poly.items())


def exact_witness(values):
    """Rationnels exacts des nombres binaires fournis, sans tolérance cachée."""
    x = [F(float(v)) for v in coordinates(values)]
    a = [F(int(o))+sum(int(c)*v for c, v in zip(row, x)) for o, row in zip(OFFSET, MAPPING)]
    if min(a) < 0 or max(a) > 1:
        raise ValueError("Le témoin n’est pas exactement admissible.")
    return _poly_value(polynomial(), x)


def derivatives(values):
    x = coordinates(values)
    gradient = objective_gradient(x)[1]
    hessian = np.array([[float(_poly_value(_differentiate(_differentiate(polynomial(), i), j), x))
                         for j in range(5)] for i in range(5)])
    return gradient, hessian


def lagrangian(values, multipliers):
    mu = np.asarray(multipliers, dtype=float)
    if mu.shape != (12,) or not np.isfinite(mu).all():
        raise ValueError("Douze multiplicateurs finis sont requis.")
    r, grad = objective_gradient(values)
    return float(r + mu @ coefficients(values)), grad + MAPPING.T @ mu


def kkt(values, active_tolerance=1e-9):
    a = coefficients(values)
    gradient, hessian = derivatives(values)
    active = np.flatnonzero(a <= active_tolerance)
    mu = np.zeros(12)
    if len(active):
        mu[active], _ = nnls(MAPPING[active].T, -gradient)
    rational_mu = np.array([float(F(float(v)).limit_denominator(4096)) for v in mu])
    if np.max(abs(gradient+MAPPING.T@rational_mu)) <= np.max(abs(gradient+MAPPING.T@mu)):
        mu = rational_mu
    lv, dl = lagrangian(values, mu)
    return {"multipliers": mu.tolist(), "active": [EDGE_NAMES[i] for i in active],
            "gradient": gradient.tolist(), "hessian": hessian.tolist(), "lagrangian": lv,
            "lagrangian_gradient": dl.tolist(), "stationarity_residual": float(abs(dl).max()),
            "complementarity_residual": float(abs(mu*a).max()), "min_multiplier": float(mu.min())}


def _candidate(values):
    # SLSQP atteint parfois une face à 10^-16 près du mauvais côté.
    # Les candidats arrondis/simplifiés sont distincts, tous revérifiés en rationnels.
    best, best_exact = None, None
    rational = np.array([float(F(float(v)).limit_denominator(4096)) for v in values])
    for x in (np.asarray(values), np.round(values, 12), rational):
        try:
            exact = exact_witness(x)
            if best_exact is None or exact > best_exact:
                best, best_exact = x.copy(), exact
        except ValueError:
            pass
    return best


def search(start=START, *, method="multi", seed=42, starts=16):
    if method not in ("local", "multi") or not 1 <= starts <= 100:
        raise ValueError("Méthode local/multi et 1 à 100 départs requis.")
    initial = coordinates(start)
    exact_witness(initial)
    seeds = [initial]
    if method == "multi":
        rng = np.random.default_rng(seed)
        # Sommets déterminés par PL, puis segments admissibles vers le départ.
        for _ in range(starts-1):
            vertex = linprog(rng.normal(size=5), A_ub=-MAPPING, b_ub=OFFSET,
                             bounds=[(0, 1)]*5, method="highs")
            if vertex.success:
                seeds.append(.85*vertex.x+.15*initial)
    best = initial.copy()
    best_exact = exact_witness(best)
    runs = []
    constraint = LinearConstraint(MAPPING, -OFFSET, 1-OFFSET)
    for seed_point in seeds:
        result = minimize(lambda x: -objective_gradient(x)[0], seed_point,
                          jac=lambda x: -objective_gradient(x)[1], method="SLSQP",
                          bounds=[(0, 1)]*5, constraints=[constraint],
                          options={"ftol": 1e-12, "maxiter": 300})
        candidate = _candidate(result.x)
        value = None
        if candidate is not None:
            exact = exact_witness(candidate)
            value = float(exact)
            if exact > best_exact or (exact == best_exact and tuple(candidate) < tuple(best)):
                best, best_exact = candidate, exact
        runs.append({"start": seed_point.tolist(), "converged": bool(result.success),
                     "status": str(result.message), "iterations": int(result.nit),
                     "admissible_result": candidate.tolist() if candidate is not None else None,
                     "objective": value})
    return {"method": method, "seed": seed, "starts": len(seeds), "runs": runs,
            "best": best.tolist(), "objective": float(best_exact), "exact_value": str(best_exact),
            "scope": "Témoin admissible ; aucune preuve globale par SLSQP."}


def _up(value):
    return np.nextafter(value, np.inf)


def _fraction_up(value):
    result = float(value)
    return float(_up(result)) if F(result) < value else result


@lru_cache(maxsize=1)
def bernstein_root():
    """Chaque valeur stockée majore le coefficient rationnel exact associé."""
    poly = polynomial()
    degree = tuple(max(e[k] for e in poly) for k in range(5))
    upper = np.empty(tuple(n+1 for n in degree))
    for index in np.ndindex(upper.shape):
        exact = sum(c*np.prod([F(comb(i, e), comb(n, e)) for i, e, n in zip(index, exponent, degree)], dtype=object)
                    for exponent, c in poly.items() if all(e <= i for e, i in zip(exponent, index)))
        upper[index] = _fraction_up(exact)
    upper.setflags(write=False)
    return upper


def split_bernstein(upper, axis):
    temp = np.moveaxis(upper, axis, 0).copy()
    n = len(temp)-1
    left, right = np.empty_like(temp), np.empty_like(temp)
    left[0], right[n] = temp[0], temp[n]
    for j in range(1, n+1):
        temp = _up(_up(temp[:-1]+temp[1:])*.5)
        left[j], right[n-j] = temp[0], temp[-1]
    return np.moveaxis(left, 0, axis), np.moveaxis(right, 0, axis)


def _possible_box(lo, hi):
    upper = OFFSET.copy()
    for k in range(5):
        upper = _up(upper + np.where(MAPPING[:, k] >= 0, MAPPING[:, k]*hi[k], MAPPING[:, k]*lo[k]))
    return bool(np.min(upper) >= 0)


def global_bound(witness, *, tolerance=1e-6, max_boxes=30000):
    """Encadrement global à budget fini, avec arrondis IEEE dirigés.

    Le budget épuisé conserve une borne ouverte ; aucune égalité au rationnel
    observé n'est déduite d'un écart petit. Les boîtes couvrent [0,1]^5.
    """
    if not isfinite(tolerance) or tolerance <= 0 or not isinstance(max_boxes, int) or max_boxes < 1:
        raise ValueError("Tolérance positive et budget entier positif requis.")
    exact = exact_witness(witness)
    lower = float(exact)
    if F(lower) > exact:
        lower = float(np.nextafter(lower, -np.inf))
    root = bernstein_root()
    heap = [(-float(root.max()), 0, root, np.zeros(5), np.ones(5))]
    serial = processed = infeasible = pruned = 0
    stalled = False
    while heap and processed < max_boxes:
        if _up(-heap[0][0]-lower) <= tolerance:
            break
        negative, _, tensor, lo, hi = heapq.heappop(heap)
        scores = [np.max(abs(np.diff(tensor, axis=k))) if hi[k] > lo[k] else -1 for k in range(5)]
        axis = int(np.argmax(scores))
        midpoint = (lo[axis]+hi[axis])*.5
        if midpoint == lo[axis] or midpoint == hi[axis] or F(midpoint) != (F(float(lo[axis]))+F(float(hi[axis])))/2:
            heapq.heappush(heap, (negative, serial+1, tensor, lo, hi))
            stalled = True
            break
        processed += 1
        for side, child in enumerate(split_bernstein(tensor, axis)):
            l, h = lo.copy(), hi.copy()
            if side == 0:
                h[axis] = midpoint
            else:
                l[axis] = midpoint
            if not _possible_box(l, h):
                infeasible += 1
                continue
            upper = float(child.max())
            if upper <= lower:
                pruned += 1
                continue
            serial += 1
            heapq.heappush(heap, (-upper, serial, child, l, h))
    upper = max(lower, -heap[0][0]) if heap else lower
    gap = float(_up(upper-lower)) if upper > lower else 0.
    return {"lower": lower, "upper": upper, "gap": gap, "tolerance": tolerance,
            "complete": gap <= tolerance, "processed_boxes": processed, "remaining_boxes": len(heap),
            "max_boxes": max_boxes, "infeasible_boxes": infeasible, "pruned_boxes": pruned,
            "status": "tolérance atteinte" if gap <= tolerance else "précision machine atteinte" if stalled else "budget atteint · borne ouverte",
            "method": "Bernstein tensoriel, subdivisions dyadiques, arrondis vers +∞",
            "witness_exact_value": str(exact)}


def surface(values, axes=(0, 2), *, radius=.15, points=31, multipliers=None, free=False):
    x0 = coordinates(values)
    if len(axes) != 2 or axes[0] == axes[1] or any(i not in range(5) for i in axes):
        raise ValueError("Deux axes distincts parmi les cinq coefficients requis.")
    if not 3 <= points <= 101 or not isfinite(radius) or radius <= 0:
        raise ValueError("Rayon positif et maillage 3 à 101 requis.")
    # Étendre des deux côtés : les masques montrent réellement la frontière.
    grids = [np.linspace(x0[i]-radius, x0[i]+radius, points) for i in axes]
    grids = [np.sort(np.unique(np.append(grid, x0[i]))) for grid, i in zip(grids, axes)]
    values_z = np.full((len(grids[1]), len(grids[0])), np.nan)
    for row, y in enumerate(grids[1]):
        for col, x in enumerate(grids[0]):
            p = x0.copy()
            p[list(axes)] = [x, y]
            if free:
                values_z[row, col] = lagrangian(p, multipliers)[0]
            elif feasible(p, 1e-14):
                values_z[row, col] = objective_gradient(p)[0]
    return grids[0], grids[1], values_z


def slice_polynomial(values, axes=(0, 2), multipliers=None):
    """Polynôme exact à deux variables, autres coordonnées binaires figées."""
    fixed = [F(float(v)) for v in coordinates(values)]
    if len(axes) != 2 or axes[0] == axes[1] or any(i not in range(5) for i in axes):
        raise ValueError("Deux axes distincts requis.")
    poly = dict(polynomial())
    if multipliers is not None:
        if len(multipliers) != 12:
            raise ValueError("Douze multiplicateurs requis.")
        for mu, offset, row in zip(multipliers, OFFSET, MAPPING):
            poly = _add(poly, {ZERO: F(float(mu))*F(int(offset))})
            for i, coefficient in enumerate(row):
                e = tuple(int(k == i) for k in range(5))
                poly = _add(poly, {e: F(float(mu))*F(int(coefficient))})
    result = {}
    for exponent, coefficient in poly.items():
        powers = (exponent[axes[0]], exponent[axes[1]])
        value = coefficient
        for i in range(5):
            if i not in axes:
                value *= fixed[i]**exponent[i]
        result[powers] = result.get(powers, F(0))+value
    return {e: c for e, c in result.items() if c}
