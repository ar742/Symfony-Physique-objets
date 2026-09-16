"""Réseaux fictifs : distances en km, chemins simples et durées dépendantes.

Les noms des fonctions sont français ; les clés des résultats restent celles
du moteur web. Les égalités numériques n'utilisent aucune tolérance implicite.
"""

from math import hypot, inf, isfinite


def _finite(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value):
        raise ValueError(f"{label} doit être un nombre fini.")


def _id_key(value):
    return value.encode("utf-16-be", "surrogatepass")  # ordre des identifiants du web


def _result_key(result):
    return result["distance"], len(result["path"]), tuple(map(_id_key, result["path"]))


def _sum(a, b):
    value = a + b
    if not isfinite(value):
        raise OverflowError("Le coût cumulé dépasse la plage numérique finie.")
    return value


def _absent():
    return {"distance": inf, "path": []}


def _prepare(graph, *endpoints):
    if not isinstance(graph, dict) or not isinstance(graph.get("nodes"), list) or not graph["nodes"] or not isinstance(graph.get("edges"), list):
        raise ValueError("Le graphe doit définir des tableaux nodes et edges non vides en sommets.")
    ids = [node.get("id") if isinstance(node, dict) else None for node in graph["nodes"]]
    if any(not isinstance(i, str) or not i.strip() for i in ids) or len(set(ids)) != len(ids):
        raise ValueError("Les identifiants des sommets doivent être non vides et uniques.")
    ids.sort(key=_id_key)
    outgoing, incoming, edges, seen = {i: [] for i in ids}, {i: [] for i in ids}, [], set()
    for edge in graph["edges"]:
        if not isinstance(edge, dict) or edge.get("from") not in outgoing or edge.get("to") not in outgoing:
            raise ValueError("Chaque arc doit relier deux sommets existants.")
        _finite(edge.get("weight"), "Le poids")
        pair = edge["from"], edge["to"]
        if pair in seen:
            raise ValueError("Arc dirigé dupliqué.")
        seen.add(pair)
        edges.append({"from": pair[0], "to": pair[1], "weight": edge["weight"]})
    edges.sort(key=lambda e: (_id_key(e["from"]), _id_key(e["to"])))
    for edge in edges:
        outgoing[edge["from"]].append(edge)
        incoming[edge["to"]].append(edge)
    for endpoint in endpoints:
        if not isinstance(endpoint, str) or endpoint not in outgoing:
            raise ValueError(f"Sommet inconnu : {endpoint}.")
    return ids, edges, outgoing, incoming


def distance(a, b):
    """Distance euclidienne ; les coordonnées du préréglage sont en km."""
    for point in (a, b):
        for key in ("x", "y"):
            _finite(point.get(key), f"Coordonnée {key}")
    value = hypot(a["x"] - b["x"], a["y"] - b["y"])
    if not isfinite(value):
        raise OverflowError("La distance dépasse la plage numérique finie.")
    return value


def villes_exemple():
    """Copie éditable : six villes fictives, neuf liaisons non pondérées."""
    rows = [("A", "Aulne", 0, 0), ("B", "Bocage", 3, 0), ("C", "Clairval", 0, 4),
            ("D", "Dune", 3, 4), ("E", "Estive", 6, 4), ("F", "Fontaine", 6, 8)]
    return {"nodes": [dict(zip(("id", "name", "x", "y"), row)) for row in rows],
            "edges": [{"id": pair, "from": pair[0], "to": pair[1]}
                      for pair in ("AB", "AC", "BC", "BD", "CD", "BE", "DE", "DF", "EF")]}


def ponderer_villes(model, bidirectionnel=True):
    """Calcule les poids depuis x,y ; deux sens déjà présents sont dédupliqués.

    Les éventuels poids saisis sont remplacés par les distances géométriques.
    bidirectionnel=False conserve uniquement les sens explicitement fournis.
    """
    if not isinstance(bidirectionnel, bool):
        raise ValueError("bidirectionnel doit être un booléen.")
    raw = {"nodes": model.get("nodes"), "edges": [dict(e, weight=0) for e in model.get("edges", [])]}
    _prepare(raw)
    nodes = [dict(n) for n in raw["nodes"]]
    by_id, edges, seen = {n["id"]: n for n in nodes}, [], set()
    for node in nodes:
        distance(node, node)
    for edge in raw["edges"]:
        pairs = [(edge["from"], edge["to"])]
        if bidirectionnel:
            pairs.append((edge["to"], edge["from"]))
        for source, target in pairs:
            if (source, target) not in seen:
                seen.add((source, target))
                edges.append({**edge, "from": source, "to": target,
                              "weight": distance(by_id[source], by_id[target])})
    return {"nodes": nodes, "edges": edges}


def dijkstra(graphe, depart, arrivee):
    ids, edges, outgoing, _ = _prepare(graphe, depart, arrivee)
    if any(e["weight"] < 0 for e in edges):
        raise ValueError("Dijkstra exige des poids non négatifs, même hors du trajet.")
    labels = {i: _absent() for i in ids}
    labels[depart] = {"distance": 0, "path": [depart]}
    pending = list(ids)
    while pending:
        chosen = min(pending, key=lambda i: _result_key(labels[i]))
        current = labels[chosen]
        if current["distance"] == inf:
            break
        pending.remove(chosen)
        if chosen == arrivee:
            break
        for edge in outgoing[chosen]:
            if edge["to"] in pending:
                candidate = {"distance": _sum(current["distance"], edge["weight"]), "path": current["path"] + [edge["to"]]}
                if _result_key(candidate) < _result_key(labels[edge["to"]]):
                    labels[edge["to"]] = candidate
    return labels[arrivee]


def bellman_ford(graphe, depart, arrivee):
    ids, edges, _, incoming = _prepare(graphe, depart, arrivee)
    labels = {i: _absent() for i in ids}
    labels[depart] = {"distance": 0, "path": [depart]}
    for _ in range(len(ids) - 1):
        following = dict(labels)
        for edge in edges:
            prefix = labels[edge["from"]]
            if prefix["distance"] != inf:
                candidate = {"distance": _sum(prefix["distance"], edge["weight"]), "path": prefix["path"] + [edge["to"]]}
                if _result_key(candidate) < _result_key(following[edge["to"]]):
                    following[edge["to"]] = candidate
        if following == labels:
            break
        labels = following
    reached, pending = {arrivee}, [arrivee]
    while pending:
        for edge in incoming[pending.pop()]:
            if edge["from"] not in reached:
                reached.add(edge["from"])
                pending.append(edge["from"])
    for edge in edges:
        prefix = labels[edge["from"]]["distance"]
        if prefix != inf and edge["to"] in reached and _sum(prefix, edge["weight"]) < labels[edge["to"]]["distance"]:
            raise ValueError("Cycle négatif pertinent : aucun plus court chemin fini.")
    return labels[arrivee]


def floyd_warshall(graphe, depart=None, arrivee=None):
    """Résultat par paire, ou matrice dict[source][destination] sans arguments.

    Une matrice complète est refusée si un cycle négatif affecte une paire.
    Un appel par paire ne refuse que les cycles pertinents pour cette paire.
    """
    if (depart is None) != (arrivee is None):
        raise ValueError("Préciser les deux extrémités, ou aucune.")
    ids, edges, _, _ = _prepare(graphe, *((depart, arrivee) if depart is not None else ()))
    matrix = {i: {j: {"distance": 0, "path": [i]} if i == j else _absent() for j in ids} for i in ids}
    for edge in edges:
        candidate = {"distance": edge["weight"], "path": [edge["from"], edge["to"]]}
        if _result_key(candidate) < _result_key(matrix[edge["from"]][edge["to"]]):
            matrix[edge["from"]][edge["to"]] = candidate
    for k in ids:
        previous = {i: dict(row) for i, row in matrix.items()}
        for i in ids:
            for j in ids:
                left, right = previous[i][k], previous[k][j]
                if left["distance"] != inf and right["distance"] != inf:
                    candidate = {"distance": _sum(left["distance"], right["distance"]), "path": left["path"] + right["path"][1:]}
                    if _result_key(candidate) < _result_key(matrix[i][j]):
                        matrix[i][j] = candidate
    for k in ids:
        if matrix[k][k]["distance"] < 0 and (depart is None or (matrix[depart][k]["distance"] != inf and matrix[k][arrivee]["distance"] != inf)):
            raise ValueError("Cycle négatif pertinent : aucun plus court chemin fini.")
    return matrix if depart is None else matrix[depart][arrivee]


def parcours_bornes(graphe, borne, depart=None, arrivee=None, max_results=10000, max_expansions=1000000):
    """Chemins simples orientés, au moins un arc, coût STRICTEMENT inférieur.

    Aucun élagage par coût intermédiaire : les poids négatifs sont permis.
    Une recherche interrompue ne fournit pas forcément les K meilleurs chemins.
    expansions compte les préfixes examinés, y compris les sommets de départ.
    """
    ids, _, outgoing, _ = _prepare(graphe, *[i for i in (depart, arrivee) if i is not None])
    _finite(borne, "La borne")
    for value in (max_results, max_expansions):
        if isinstance(value, bool) or not isinstance(value, int) or value < 1:
            raise ValueError("Les budgets doivent être des entiers strictement positifs.")
    stack = [([origin], 0) for origin in reversed(ids if depart is None else [depart])]
    results, expansions, warning = [], 0, None
    while stack:
        if expansions >= max_expansions:
            warning = "Budget de préfixes atteint : liste incomplète, sans garantie des K meilleurs chemins."
            break
        path, cost = stack.pop()
        expansions += 1
        if len(path) > 1 and (arrivee is None or path[-1] == arrivee) and cost < borne:
            if len(results) == max_results:
                warning = "Budget de résultats atteint : liste incomplète, sans garantie des K meilleurs chemins."
                break
            results.append({"path": path, "distance": cost})
        if arrivee is not None and path[-1] == arrivee:
            continue
        for edge in reversed(outgoing[path[-1]]):
            if edge["to"] not in path:
                stack.append((path + [edge["to"]], _sum(cost, edge["weight"])))
    results.sort(key=_result_key)
    return {"paths": results, "complete": warning is None, "warning": warning, "expansions": expansions}


def routes_dependantes(debit):
    """Débit externe figé en véhicules/min ; durées en minutes, pas de trafic simulé."""
    _finite(debit, "Le débit externe")
    if not 0 <= debit <= 100:
        raise ValueError("Le débit externe doit être compris entre 0 et 100 véhicules/min.")
    routes = [{"id": "ABD", "path": ["A", "B", "D"], "times": [2, 2 + debit / 10], "duration": 4 + debit / 10},
              {"id": "ACD", "path": ["A", "C", "D"], "times": [4, 4], "duration": 8}]
    best = min(route["duration"] for route in routes)
    return {"load": debit, "unit": "min", "routes": routes, "best": [r for r in routes if r["duration"] == best], "bestDuration": best}


def sensibilite_dependance(debit):
    """Dérivées par rapport au débit ; au seuil, la durée minimale a une cassure."""
    result = routes_dependantes(debit)
    return {**result, "threshold": 40, "derivativeUnit": "min²/véhicule",
            "routeDerivatives": {"ABD": 0.1, "ACD": 0},
            "bestDerivative": 0.1 if debit < 40 else (0 if debit > 40 else None),
            "leftDerivative": 0.1 if debit <= 40 else 0,
            "rightDerivative": 0.1 if debit < 40 else 0}
