"""Graphes du point 05 : 2 à 24 sommets, réduction exacte et calcul adjoint.

Le support est non orienté ; un ordre explicite définit la propagation finie.
Les égalités Ha=1 et les zéros forcés sont éliminés avant toute optimisation.
"""
from dataclasses import dataclass
from fractions import Fraction as F
import heapq
import re

import networkx as nx
import numpy as np
from scipy.optimize import LinearConstraint, linprog, minimize, nnls

from . import stochastique as legacy


def initial_graph():
    return {"version": 1, "n": 8, "edges": [list(sorted(e)) for e in legacy.ARCS], "order": list(legacy.ORDER)}


def parse_ids(text):
    tokens = re.split(r"[,;\s]+", text.strip()) if text.strip() else []
    if any(not token.isdecimal() for token in tokens):
        raise ValueError("Saisir des numéros de nœuds séparés par des espaces ou des virgules.")
    values = [int(token) for token in tokens]
    if any(not 1 <= i <= 24 for i in values):
        raise ValueError("Les numéros de nœuds doivent être compris entre 1 et 24.")
    return values


def normalize(model, *, draft=False):
    if not isinstance(model, dict) or type(model.get("n")) is not int or not (1 if draft else 2) <= model["n"] <= 24:
        raise ValueError("Le graphe doit comporter de 2 à 24 nœuds (1 seul est permis dans le brouillon).")
    n = model["n"]
    if not isinstance(model.get("edges"), list) or len(model["edges"]) > 552:
        raise ValueError("Liste de liaisons invalide ou trop longue.")
    edges = set()
    for edge in model["edges"]:
        if not isinstance(edge, (list, tuple)) or len(edge) != 2 or any(type(i) is not int or not 1 <= i <= n for i in edge):
            raise ValueError("Chaque liaison doit contenir deux numéros de nœuds existants.")
        if edge[0] == edge[1]:
            raise ValueError("Les boucles sur un même nœud sont exclues : la diagonale de A est nulle.")
        edges.add(tuple(sorted(edge)))
    order = model.get("order", list(range(1, n+1)))
    if not isinstance(order, list) or any(type(i) is not int for i in order) or sorted(order) != list(range(1, n+1)):
        raise ValueError("L’ordre doit contenir chaque nœud exactement une fois.")
    if order[0] != 1 or order[-1] != n:
        raise ValueError("L’ordre de calcul commence par 1 et finit par le dernier nœud N.")
    result = {"version": 1, "n": n, "edges": [list(e) for e in sorted(edges)], "order": order.copy()}
    if not draft:
        graph = nx.Graph()
        graph.add_nodes_from(range(1, n+1)); graph.add_edges_from(edges)
        if not nx.is_connected(graph):
            raise ValueError("Le graphe n’est pas connecté. Relier tous les nœuds avant de l’analyser.")
    return result


def set_neighbors(model, node, neighbors):
    current = normalize(model, draft=True)
    if type(node) is not int or not 1 <= node <= current["n"]:
        raise ValueError("Choisir un nœud déjà créé.")
    if any(type(i) is not int or not 1 <= i <= 24 for i in neighbors):
        raise ValueError("Les voisins doivent être des numéros de 1 à 24.")
    if node in neighbors:
        raise ValueError("Un nœud ne peut pas être son propre voisin.")
    n = max([current["n"], *neighbors])
    # Les nouvelles références créent aussi les numéros intermédiaires.
    edges = [e for e in current["edges"] if node not in e]+[[node, j] for j in neighbors]
    order = current["order"]+list(range(current["n"]+1, n+1))
    return normalize({"n": n, "edges": edges, "order": order}, draft=True)


def _rational_vector(values):
    return [F(float(v)).limit_denominator(1000000) for v in values]


def _rref(rows, width):
    rows = [[F(v) for v in row] for row in rows]
    rank, pivots = 0, []
    for col in range(width):
        pivot = next((r for r in range(rank, len(rows)) if rows[r][col]), None)
        if pivot is None:
            continue
        rows[rank], rows[pivot] = rows[pivot], rows[rank]
        scale = rows[rank][col]
        rows[rank] = [v/scale for v in rows[rank]]
        for r in range(len(rows)):
            if r != rank and rows[r][col]:
                scale = rows[r][col]
                rows[r] = [a-scale*b for a, b in zip(rows[r], rows[rank])]
        pivots.append(col); rank += 1
    if any(not any(row[:width]) and row[width] for row in rows):
        raise ValueError("Les sommes à 1 sont incompatibles avec ces liaisons.")
    return rows, pivots


@dataclass
class Graph:
    model: dict
    arcs: list
    offset_exact: list
    mapping_exact: list
    free: list
    forced_zero: list
    rank: int
    start_exact: list
    zero_certificates: dict

    def __post_init__(self):
        self.n = self.model["n"]
        self.edges = [tuple(e) for e in self.model["edges"]]
        self.d = len(self.free)
        self.offset = np.array(self.offset_exact, dtype=float)
        self.mapping = np.array(self.mapping_exact, dtype=float).reshape(len(self.edges), self.d)
        self.start = np.array(self.start_exact, dtype=float)
        self.names = [f"a{i}_{j}" for k in self.free for i, j in [self.edges[k]]]
        self.edge_names = [f"a{i}_{j}" for i, j in self.edges]
        self.outgoing = {i: [] for i in range(1, self.n+1)}
        self.incoming = {i: [] for i in range(1, self.n+1)}
        for e, (i, j) in enumerate(self.arcs):
            self.outgoing[i].append((e, j)); self.incoming[j].append((e, i))

    def coordinates(self, theta):
        values = np.asarray(theta, dtype=float)
        if values.shape != (self.d,) or not np.isfinite(values).all():
            raise ValueError(f"Il faut {self.d} coefficients indépendants finis.")
        return values

    def coefficients(self, theta):
        return self.offset+self.mapping@self.coordinates(theta)

    def exact_coefficients(self, theta):
        if len(theta) != self.d:
            raise ValueError("Nombre de coordonnées incorrect.")
        values = [v if isinstance(v, F) else F(str(v)) for v in theta]
        return [o+sum(c*t for c, t in zip(row, values)) for o, row in zip(self.offset_exact, self.mapping_exact)]

    def exact_value(self, theta):
        weights = self.exact_coefficients(theta)
        if min(weights) < 0 or max(weights) > 1:
            raise ValueError("Les poids reconstruits ne sont pas tous admissibles.")
        x = [F(0)]*(self.n+1); x[1] = F(1)
        for i in self.model["order"]:
            for e, j in self.outgoing[i]:
                x[j] += weights[e]*x[i]
        return x[self.n]

    def evaluate(self, theta, *, free=False):
        weights = self.coefficients(theta)
        if not free and (weights.min() < -1e-12 or weights.max() > 1+1e-12):
            raise ValueError("Poids incompatibles : vérifier toutes les expressions aᵢⱼ ≥ 0.")
        x = np.zeros(self.n+1); x[1] = 1.
        q = np.zeros(len(self.edges))
        for i in self.model["order"]:
            for e, j in self.outgoing[i]:
                q[e] = weights[e]*x[i]; x[j] += q[e]
        adjoint = np.zeros(self.n+1); adjoint[self.n] = 1.
        for i in reversed(self.model["order"][:-1]):
            adjoint[i] = sum(weights[e]*adjoint[j] for e, j in self.outgoing[i])
        sensitivities = np.array([x[i]*adjoint[j] for i, j in self.arcs])
        gradient = self.mapping.T@sensitivities
        return float(x[self.n]), gradient, x, q, adjoint

    def state(self, theta):
        r, grad, x, q, adjoint = self.evaluate(theta)
        a = self.coefficients(theta)
        matrix = np.zeros((self.n, self.n))
        flows = []
        for e, (i, j) in enumerate(self.arcs):
            matrix[i-1, j-1] = matrix[j-1, i-1] = a[e]
            flows.append({"from": str(i), "to": str(j), "coefficient": float(a[e]), "value": float(q[e])})
        nodes = []
        for i in range(1, self.n+1):
            output = r if i == self.n else sum(q[e] for e, _ in self.outgoing[i])
            nodes.append({"id": str(i), "input": float(x[i]), "output": float(output), "unused": float(x[i]-output),
                          "adjoint": float(adjoint[i]), "incoming": [f for f in flows if f["to"] == str(i)],
                          "outgoing": [f for f in flows if f["from"] == str(i)]})
        return {"objective": r, "coordinates": list(map(float, theta)), "coefficients": a.tolist(), "matrix": matrix.tolist(),
                "nodes": nodes, "flows": flows, "gradient": grad.tolist(),
                "stochastic_residual": float(abs(matrix.sum(0)-1).max()),
                "balance_residual": float(1-r-sum(n["unused"] for n in nodes))}

    def lagrangian(self, theta, multipliers):
        mu = np.asarray(multipliers, dtype=float)
        if mu.shape != (len(self.edges),) or not np.isfinite(mu).all():
            raise ValueError("Un multiplicateur fini par liaison est requis.")
        r, grad, *_ = self.evaluate(theta, free=True)
        return float(r+mu@self.coefficients(theta)), grad+self.mapping.T@mu

    def kkt(self, theta):
        r, gradient, *_ = self.evaluate(theta)
        a = self.coefficients(theta)
        active = np.flatnonzero((a <= 1e-8) & np.any(self.mapping != 0, axis=1))
        mu = np.zeros(len(self.edges))
        if self.d and len(active):
            mu[active], _ = nnls(self.mapping[active].T, -gradient, maxiter=1000+len(active)*10)
        rational = np.array([float(F(float(v)).limit_denominator(4096)) for v in mu])
        if np.linalg.norm(gradient+self.mapping.T@rational) <= np.linalg.norm(gradient+self.mapping.T@mu):
            mu = rational
        value, dl = self.lagrangian(theta, mu)
        return {"multipliers": mu.tolist(), "gradient": gradient.tolist(), "lagrangian_gradient": dl.tolist(),
                "lagrangian": value, "stationarity_residual": float(abs(dl).max()) if self.d else 0.,
                "complementarity_residual": float(abs(a*mu).max()), "active": [self.edge_names[e] for e in active]}

    def slice_polynomial(self, theta, axes, multipliers=None):
        """Développement à 2 variables seulement, degré ≤ N−1, sans explosion en d."""
        if len(axes) != 2 or axes[0] == axes[1] or any(not 0 <= k < self.d for k in axes):
            raise ValueError("Deux coordonnées indépendantes distinctes requises.")
        fixed = [F(float(v)) for v in self.coordinates(theta)]
        polys = []
        for o, row in zip(self.offset_exact, self.mapping_exact):
            c = o+sum(v*fixed[k] for k, v in enumerate(row) if k not in axes)
            polys.append({(0, 0): c, (1, 0): row[axes[0]], (0, 1): row[axes[1]]})
        x = [{} for _ in range(self.n+1)]; x[1] = {(0, 0): F(1)}
        for i in self.model["order"]:
            for e, j in self.outgoing[i]:
                x[j] = legacy._add(x[j], legacy._mul(x[i], polys[e]))
        result = x[self.n]
        if multipliers is not None:
            if len(multipliers) != len(self.edges):
                raise ValueError("Un multiplicateur par liaison est requis.")
            result = legacy._add(result, *(legacy._scale(p, F(float(mu))) for p, mu in zip(polys, multipliers)))
        return {e: c for e, c in result.items() if c}


def compile_graph(model):
    model = normalize(model)
    n, edges = model["n"], model["edges"]
    m = len(edges)
    H = np.zeros((n, m), dtype=int)
    for e, (i, j) in enumerate(edges):
        H[i-1, e] = H[j-1, e] = 1
    lp = linprog(np.zeros(m), A_eq=H, b_eq=np.ones(n), bounds=(0, None), method="highs")
    if not lp.success:
        if lp.status == 2:
            raise ValueError("Aucune matrice symétrique à sommes 1 n’existe sur ce graphe. Ajouter ou modifier des liaisons ; les contraintes ne sont pas relâchées.")
        raise ValueError("Le contrôle de faisabilité n’a pas abouti : "+lp.message)
    witnesses, forced, certificates = [], [], {}
    for e in range(m):
        cost = np.zeros(m); cost[e] = -1
        result = linprog(cost, A_eq=H, b_eq=np.ones(n), bounds=(0, None), method="highs")
        if not result.success:
            raise ValueError("Le calcul de la dimension admissible n’a pas abouti.")
        a = _rational_vector(result.x)
        if min(a) < 0 or any(sum(int(c)*v for c, v in zip(row, a)) != 1 for row in H):
            raise ValueError("La configuration de faisabilité n’a pas pu être vérifiée exactement.")
        if a[e] == 0:
            dual = _rational_vector(-result.eqlin.marginals)
            if sum(dual) != 0 or any(sum(int(H[i, k])*dual[i] for i in range(n)) < int(k == e) for k in range(m)):
                raise ValueError("Un zéro imposé reste incertain ; la réduction n’est pas appliquée.")
            forced.append(e); certificates[e] = list(map(str, dual))
        else:
            witnesses.append(a)
    active = [e for e in range(m) if e not in forced]
    preferred = [(1, 2), (2, 3), (3, 5), (3, 4), (6, 7)]
    is_initial = {tuple(e) for e in edges} == {tuple(sorted(e)) for e in legacy.ARCS}
    chosen = [edges.index(list(e)) for e in preferred] if is_initial else []
    columns = [e for e in active if e not in chosen]+[e for e in chosen if e in active]
    rows, pivots = _rref([[int(H[i, e]) for e in columns]+[1] for i in range(n)], len(columns))
    free_local = [k for k in range(len(columns)) if k not in pivots]
    free = [columns[k] for k in free_local]
    d = len(free)
    offset = [F(0)]*m; mapping = [[F(0)]*d for _ in range(m)]
    for k, e in enumerate(free):
        mapping[e][k] = F(1)
    for r, col in enumerate(pivots):
        e = columns[col]; offset[e] = rows[r][-1]
        mapping[e] = [-rows[r][k] for k in free_local]
    mean = [sum(w[e] for w in witnesses)/len(witnesses) for e in range(m)]
    start = [mean[e] for e in free]
    if is_initial and free == chosen:
        start = [F(float(v)) for v in legacy.START]
    index = {node: k for k, node in enumerate(model["order"])}
    arcs = [(i, j) if index[i] < index[j] else (j, i) for i, j in edges]
    graph = Graph(model, arcs, offset, mapping, free, forced, len(pivots), start, certificates)
    graph.exact_value(start)
    return graph


def _candidate(graph, values):
    if not np.isfinite(values).all():
        return None
    options = [_rational_vector(values), [F(float(v)).limit_denominator(4096) for v in values]]
    # Une contraction explicite vers le départ intérieur corrige seulement les
    # petites violations du solveur. Le nouveau témoin est contrôlé exactement.
    for delta in (F(1, 10**10), F(1, 10**7)):
        options.append([(1-delta)*F(float(v))+delta*c for v, c in zip(values, graph.start_exact)])
    best = None
    for theta in options:
        try:
            value = graph.exact_value(theta)
            if best is None or value > best[0] or (value == best[0] and theta < best[1]):
                best = value, theta
        except ValueError:
            pass
    return best


def search(graph, *, method="multi", seed=42, starts=12, maxiter=200, start=None):
    if method not in ("local", "multi") or not 1 <= starts <= 40 or not 1 <= maxiter <= 1000:
        raise ValueError("Méthode, nombre de départs ou budget d’itérations invalide.")
    exact_start = graph.start_exact if start is None else [F(str(v)) for v in start]
    best_value, best_exact = graph.exact_value(exact_start), exact_start.copy()
    seeds = [np.array(exact_start, dtype=float)]
    if not graph.d:
        return {"best": [], "best_exact": [], "objective": float(best_value), "exact_value": str(best_value),
                "runs": [], "method": "configuration unique", "seed": seed}
    rng = np.random.default_rng(seed)
    if method == "multi":
        for _ in range(starts-1):
            vertex = linprog(rng.normal(size=graph.d), A_ub=-graph.mapping, b_ub=graph.offset, bounds=[(0, 1)]*graph.d)
            if vertex.success:
                seeds.append(.85*vertex.x+.15*seeds[0])
    constraint = LinearConstraint(graph.mapping, -graph.offset, 1-graph.offset)
    runs = []
    for point in seeds:
        def fun(theta):
            r, gradient, *_ = graph.evaluate(theta, free=True)
            return -r, -gradient
        result = minimize(fun, point, jac=True, method="SLSQP", constraints=[constraint],
                          bounds=[(0, 1)]*graph.d, options={"ftol": 1e-12, "maxiter": maxiter})
        candidate = _candidate(graph, result.x)
        if candidate and (candidate[0] > best_value or (candidate[0] == best_value and candidate[1] < best_exact)):
            best_value, best_exact = candidate
        runs.append({"start": point.tolist(), "converged": bool(result.success), "iterations": int(result.nit),
                     "objective": float(candidate[0]) if candidate else None, "status": str(result.message)})
    return {"best": list(map(float, best_exact)), "best_exact": list(map(str, best_exact)), "objective": float(best_value),
            "exact_value": str(best_value), "runs": runs, "method": method, "seed": seed,
            "candidate_check": "Témoins rationnels vérifiés ; simplification ou contraction vers le départ intérieur si nécessaire."}


def _fraction_bounds(value):
    v = float(value)
    return (float(np.nextafter(v, -np.inf)) if F(v) > value else v,
            float(np.nextafter(v, np.inf)) if F(v) < value else v)


def interval_upper(graph, lo, hi):
    """Borne de propagation : poids et entrées positifs, somme aval ≤ 1."""
    up = lambda v: np.nextafter(v, np.inf)
    down = lambda v: np.nextafter(v, -np.inf)
    # Les coefficients issus de l'incidence sont dyadiques ; ce prérequis est
    # vérifié, jamais supposé silencieusement dans le certificat.
    if not hasattr(graph, "_dyadic_checked"):
        graph._dyadic_checked = all(F(float(v)) == v for v in graph.offset_exact) and all(F(float(v)) == v for row in graph.mapping_exact for v in row)
    if not graph._dyadic_checked:
        return 1.  # Borne de conservation seule, toujours valide.
    al, ah = graph.offset.copy(), graph.offset.copy()
    for k in range(graph.d):
        c = graph.mapping[:, k]
        al = down(al+down(c*np.where(c >= 0, lo[k], hi[k])))
        ah = up(ah+up(c*np.where(c >= 0, hi[k], lo[k])))
    if np.any(ah < 0) or np.any(al > 1):
        return None
    ah = np.minimum(1., ah)
    x = np.zeros(graph.n+1); x[1] = 1.
    for i in graph.model["order"]:
        for e, j in graph.outgoing[i]:
            x[j] = min(1., float(up(x[j]+up(ah[e]*x[i]))))
    return float(x[graph.n])


def global_bound(graph, result, *, tolerance=1e-6, max_boxes=1500):
    if not np.isfinite(tolerance) or tolerance <= 0 or type(max_boxes) is not int or max_boxes < 1:
        raise ValueError("Tolérance positive et budget entier positif requis.")
    exact = graph.exact_value([F(v) for v in result["best_exact"]])
    lower, exact_upper = _fraction_bounds(exact)
    if not graph.d:
        return {"lower": lower, "upper": exact_upper, "gap": exact_upper-lower, "complete": True,
                "status": "Configuration unique : maximum exact", "method": "Élimination rationnelle", "processed_boxes": 0}
    if graph.model == normalize(initial_graph()):
        # La borne historique n'est valable que pour ce support ET cet ordre.
        a = graph.exact_coefficients([F(v) for v in result["best_exact"]])
        lookup = dict(zip(graph.edges, a))
        old = [lookup[e] for e in ((1,2), (2,3), (3,5), (3,4), (6,7))]
        try:
            if all(F(float(v)) == v for v in old):
                return legacy.global_bound(list(map(float, old)), tolerance=tolerance, max_boxes=max_boxes)
        except ValueError:
            pass  # Le témoin exact peut ne pas être représentable en binaire.
    root = interval_upper(graph, np.zeros(graph.d), np.ones(graph.d))
    if root is None:
        raise ValueError("Le domaine initial ne contient pas le témoin admissible.")
    heap = [(-root, 0, np.zeros(graph.d), np.ones(graph.d))]
    serial = count = 0
    while heap and count < max_boxes and -heap[0][0]-lower > tolerance:
        neg, _, lo, hi = heapq.heappop(heap)
        axis = int(np.argmax(hi-lo))
        middle = (lo[axis]+hi[axis])*.5
        if middle in (lo[axis], hi[axis]):
            heapq.heappush(heap, (neg, serial+1, lo, hi)); break
        count += 1
        for side in (0, 1):
            l, h = lo.copy(), hi.copy()
            if side:
                l[axis] = middle
            else:
                h[axis] = middle
            upper = interval_upper(graph, l, h)
            if upper is None or upper <= lower:
                continue
            serial += 1; heapq.heappush(heap, (-upper, serial, l, h))
    upper = max(exact_upper, -heap[0][0]) if heap else exact_upper
    gap = float(np.nextafter(upper-lower, np.inf)) if upper > lower else 0.
    return {"lower": lower, "upper": upper, "gap": gap, "complete": gap <= tolerance, "processed_boxes": count,
            "max_boxes": max_boxes, "remaining_boxes": len(heap), "method": "Intervalles de propagation et conservation, arrondis dirigés",
            "status": "tolérance atteinte" if gap <= tolerance else "budget atteint · borne ouverte"}


def surface(graph, theta, axes, *, radius=.15, points=31, multipliers=None, free=False):
    center = graph.coordinates(theta)
    if len(axes) != 2 or axes[0] == axes[1] or any(not 0 <= k < graph.d for k in axes):
        raise ValueError("Deux coordonnées indépendantes distinctes sont nécessaires.")
    if not np.isfinite(radius) or radius <= 0 or type(points) is not int or not 3 <= points <= 101:
        raise ValueError("Rayon positif et maillage de 3 à 101 requis.")
    grids = [np.sort(np.unique(np.append(np.linspace(center[k]-radius, center[k]+radius, points), center[k]))) for k in axes]
    z = np.full((len(grids[1]), len(grids[0])), np.nan)
    for row, y in enumerate(grids[1]):
        for col, x in enumerate(grids[0]):
            p = center.copy(); p[list(axes)] = [x, y]
            try:
                z[row, col] = graph.lagrangian(p, multipliers)[0] if free else graph.evaluate(p)[0]
            except ValueError:
                pass
    return *grids, z
