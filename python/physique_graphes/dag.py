"""Graphe orienté acyclique, statique, à répartitions complètes explicites.

Mode ``branches`` : les nœuds somment, chaque branche transforme son entrée.
Mode ``nodes`` : chaque nœud transforme la somme reçue, les branches répartissent.
Il n'y a ni stock, ni itération temporelle, ni écrêtage, ni fonction issue d'un JSON.
Les attributs libres et les coordonnées graphiques restent dans le modèle éditable.
"""

from collections import deque
from collections.abc import Mapping
from copy import deepcopy
import json
import math
from pathlib import Path

from .lois import LawDomainError, evaluate_law, finite_number, law_registry, validate_law


def _identifier(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} doit être une chaîne non vide.")
    return value


def _prepare(model, registry):
    if not isinstance(model, Mapping) or model.get("mode") not in ("branches", "nodes"):
        raise ValueError("Le modèle doit choisir mode='branches' ou mode='nodes'.")
    mode = model["mode"]
    nodes, edges = model.get("nodes"), model.get("edges")
    if not isinstance(nodes, list) or not nodes or not isinstance(edges, list):
        raise ValueError("nodes est une liste non vide ; edges est une liste.")
    by_id = {}
    for node in nodes:
        if not isinstance(node, Mapping):
            raise ValueError("Chaque nœud doit former un objet.")
        identifier = _identifier(node.get("id"), "L'identifiant du nœud")
        if identifier in by_id:
            raise ValueError(f"Nœud dupliqué : {identifier}.")
        for coordinate in ("x", "y"):
            if coordinate in node:
                finite_number(node[coordinate], f"La coordonnée {coordinate} de {identifier}")
        by_id[identifier] = node
    outgoing = {identifier: [] for identifier in by_id}
    incoming = {identifier: [] for identifier in by_id}
    edge_ids = set()
    for edge in edges:
        if not isinstance(edge, Mapping):
            raise ValueError("Chaque branche doit former un objet.")
        identifier = _identifier(edge.get("id"), "L'identifiant de la branche")
        if identifier in edge_ids:
            raise ValueError(f"Branche dupliquée : {identifier}.")
        edge_ids.add(identifier)
        origin = _identifier(edge.get("from"), "L'origine de la branche")
        destination = _identifier(edge.get("to"), "La destination de la branche")
        if origin not in by_id or destination not in by_id:
            raise ValueError(f"Extrémité inconnue pour la branche {identifier}.")
        fraction = finite_number(edge.get("fraction"), f"La fraction de {identifier}")
        if not 0 <= fraction <= 1:
            raise ValueError(f"La fraction de {identifier} sort de [0, 1].")
        outgoing[edge["from"]].append(edge)
        incoming[edge["to"]].append(edge)
    for identifier, group in outgoing.items():
        if group and not math.isclose(math.fsum(edge["fraction"] for edge in group), 1, rel_tol=0, abs_tol=1e-12):
            raise ValueError(f"Les fractions sortantes de {identifier} doivent sommer à 1.")
    for supports, active in ((nodes, mode == "nodes"), (edges, mode == "branches")):
        for support in supports:
            if active:
                if "law" not in support:
                    raise ValueError(f"Loi absente sur {support['id']} dans le mode {mode}.")
                validate_law(support["law"], registry)
            elif "law" in support:
                raise ValueError("Les lois doivent être exclusivement sur les branches OU les nœuds.")
    source = model.get("source")
    if not isinstance(source, Mapping):
        raise ValueError("source doit désigner un nœud et une entrée input.")
    source_id = _identifier(source.get("node"), "Le nœud source")
    if source_id not in by_id:
        raise ValueError("Le nœud source est inconnu.")
    source_input = finite_number(source.get("input"), "L'entrée de la source")
    if source_input < 0:
        raise ValueError("L'entrée de la source doit être non négative.")
    if "budget" in source and finite_number(source["budget"], "Le budget") < 0:
        raise ValueError("Le budget doit être non négatif.")
    if incoming[source["node"]]:
        raise ValueError("Le nœud source ne doit pas avoir de branche entrante.")
    sink = _identifier(model.get("sink"), "Le puits")
    if sink not in by_id or outgoing[sink]:
        raise ValueError("sink doit désigner un nœud terminal.")
    degrees = {identifier: len(group) for identifier, group in incoming.items()}
    ready = deque(identifier for identifier in by_id if degrees[identifier] == 0)
    order = []
    while ready:
        identifier = ready.popleft()
        order.append(identifier)
        for edge in outgoing[identifier]:
            degrees[edge["to"]] -= 1
            if degrees[edge["to"]] == 0:
                ready.append(edge["to"])
    if len(order) != len(nodes):
        raise ValueError("Un cycle est présent ; ce modèle doit être un DAG.")
    reachable = {source["node"]}
    for identifier in order:
        if identifier in reachable:
            reachable.update(edge["to"] for edge in outgoing[identifier])
    if len(reachable) != len(nodes):
        raise ValueError("Tous les nœuds doivent être accessibles depuis la source.")
    return by_id, outgoing, incoming, order


def validate_model(model, *, registry=None) -> list[str]:
    """Vérifie le schéma et renvoie l'ordre topologique ; ne simule pas les lois."""
    return _prepare(model, law_registry(registry))[3]


def evaluate(model, *, registry=None) -> dict:
    """État calculé, jamais une mesure ou une garantie d'optimalité.

    Un schéma invalide lève ValueError. Un état hors domaine/budget renvoie
    feasible=False et production=None. Les sorties déjà calculées restent visibles.
    ``loss`` signifie input−output ; en mode nodes ce bilan peut être négatif
    (amplification du modèle fictif), donc ne désigne pas forcément une dissipation.
    Plusieurs puits sont possibles : production concerne sink, exported leur somme.
    """
    functions = law_registry(registry)
    by_id, outgoing, incoming, order = _prepare(model, functions)
    source = model["source"]
    state = {"feasible": False, "reason": None, "mode": model["mode"], "order": order,
             "nodes": {}, "edges": {}, "q": {}, "y": {}, "production": None,
             "source_input": float(source["input"]), "exports": {}, "exported": None,
             "total_loss": None, "balance_residual": None}
    if "budget" in source and source["input"] > source["budget"]:
        state["reason"] = "L'entrée de la source dépasse son budget."
        return state
    location = source["node"]
    try:
        for identifier in order:
            location = f"nœud {identifier}"
            received = math.fsum(state["edges"][edge["id"]]["output"] for edge in incoming[identifier])
            external = source["input"] if identifier == source["node"] else 0.0
            value = received + external
            if not math.isfinite(value):
                raise LawDomainError("La somme des entrées n'est pas finie.")
            output = evaluate_law(by_id[identifier]["law"], value, functions) if model["mode"] == "nodes" else value
            state["nodes"][identifier] = {"input": value, "output": output, "incoming": received,
                                               "external": external, "loss": value - output}
            for edge in outgoing[identifier]:
                location = f"branche {edge['id']}"
                branch_input = output * edge["fraction"]
                branch_output = evaluate_law(edge["law"], branch_input, functions) if model["mode"] == "branches" else branch_input
                state["edges"][edge["id"]] = {"from": edge["from"], "to": edge["to"],
                    "input": branch_input, "output": branch_output, "fraction": edge["fraction"],
                    "loss": branch_input - branch_output}
                state["q"][edge["id"]] = branch_input
                state["y"][edge["id"]] = branch_output
    except LawDomainError as error:
        state["reason"] = f"{location} : {error}"
        return state
    state["exports"] = {identifier: state["nodes"][identifier]["output"] for identifier in order if not outgoing[identifier]}
    state["exported"] = math.fsum(state["exports"].values())
    state["total_loss"] = math.fsum(item["loss"] for kind in ("nodes", "edges") for item in state[kind].values())
    state["balance_residual"] = state["source_input"] - state["exported"] - state["total_loss"]
    state.update(feasible=True, production=state["nodes"][model["sink"]]["output"])
    return state


def binary_controls(model) -> dict[str, float]:
    """Une commande par nœud à deux sorties, désignant sa première branche JSON."""
    groups = {node["id"]: [] for node in model["nodes"]}
    for edge in model["edges"]:
        groups[edge["from"]].append(edge)
    return {identifier: group[0]["fraction"] for identifier, group in groups.items() if len(group) == 2}


def with_binary_controls(model, controls: Mapping[str, float], *, source_input=None) -> dict:
    """Copie avec commandes partielles ; conserve les autres partages et attributs."""
    if not isinstance(controls, Mapping):
        raise ValueError("Les commandes doivent former un dictionnaire.")
    result = deepcopy(model)
    available = binary_controls(result)
    for identifier, value in controls.items():
        if identifier not in available:
            raise ValueError(f"{identifier} n'est pas un nœud à deux sorties.")
        value = finite_number(value, f"Le partage de {identifier}")
        if not 0 <= value <= 1:
            raise ValueError("Un partage doit appartenir à [0, 1].")
        group = [edge for edge in result["edges"] if edge["from"] == identifier]
        group[0]["fraction"], group[1]["fraction"] = value, 1 - value
    if source_input is not None:
        value = finite_number(source_input, "L'entrée de la source")
        if value < 0:
            raise ValueError("L'entrée de la source doit être non négative.")
        result["source"]["input"] = value
    return result


def load_model(path) -> dict:
    """Lit seulement du JSON ; les lois personnelles sont enregistrées séparément."""
    with Path(path).open(encoding="utf-8-sig") as handle:
        return json.load(handle)


def save_model(model, path) -> None:
    """Enregistre tous les paramètres et attributs, sans sérialiser de fonctions."""
    Path(path).write_text(json.dumps(model, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


_BRANCH_PAIRS = [(1, 2), (1, 5), (2, 3), (2, 8), (5, 3), (5, 7),
                 (7, 6), (7, 4), (3, 4), (3, 6), (4, 8), (6, 8)]
_BRANCH_POSITIONS = [(0, .5), (.25, .85), (.5, .9), (.75, .85),
                     (.25, .15), (.75, .15), (.5, .1), (1, .5)]


def _law(name, a, b, c, d):
    return {"name": name, "parameters": {"a": a, "b": b, "c": c, "d": d}}


def _branch_model(name, laws, controls):
    nodes = [{"id": str(i), "name": f"Nœud {i}", "x": xy[0], "y": xy[1], "attributes": {}}
             for i, xy in enumerate(_BRANCH_POSITIONS, 1)]
    edges = [{"id": f"{a}-{b}", "from": str(a), "to": str(b), "fraction": 1,
              "law": deepcopy(laws[f"{a}-{b}"]), "attributes": {}} for a, b in _BRANCH_PAIRS]
    model = {"version": 1, "name": name, "mode": "branches", "source": {"node": "1", "input": 1},
             "sink": "8", "nodes": nodes, "edges": edges}
    return with_binary_controls(model, controls)


def create_branch_interior() -> dict:
    """Préréglage exact du site : référence calculée 7/32, sans preuve injectée."""
    laws = {f"{a}-{b}": _law("piecewise_yield", 0, .001, 1, 1) for a, b in _BRANCH_PAIRS}
    laws["1-2"] = _law("piecewise_yield", 0, .1, .9, 0)
    laws["1-5"] = _law("piecewise_yield", 0, .1, 0, 0)
    for key in ("2-3", "2-8"):
        laws[key] = _law("piecewise_yield", 0, .01, .99, 0)
    return _branch_model("branches-interieur-7-sur-32", laws, {"1": .5, "2": .5, "5": .5, "3": 1, "7": .5})


def create_branch_active() -> dict:
    """Douze branches actives : mêmes paramètres et partages que le module JS."""
    coefficients = {"1-2": (194 / 205, 19 / 205), "1-5": (194 / 205, 19 / 205),
        "2-3": (213 / 220, 8 / 99), "2-8": (59 / 100, 2 / 5),
        "5-3": (213 / 220, 16 / 99), "5-7": (213 / 220, 16 / 297),
        "7-6": (59 / 60, 320 / 1539), "7-4": (59 / 60, 320 / 1539),
        "3-4": (59 / 60, 320 / 1539), "3-6": (59 / 60, 320 / 1539),
        "4-8": (31 / 50, 2240 / 9747), "6-8": (31 / 50, 2240 / 9747)}
    laws = {key: _law("piecewise_yield", 0, .001, linear - curvature * .001, linear - curvature)
            for key, (linear, curvature) in coefficients.items()}
    return _branch_model("branches-actives-143217-sur-320000", laws, {"1": .5, "2": .5, "5": .25, "3": .5, "7": .5})


def create_machine_eight(preset="active") -> dict:
    """Huit machines du site : y=f(x) aux nœuds, sans multiplication par x."""
    if preset not in ("active", "plateau"):
        raise ValueError("Le préréglage machines est 'active' ou 'plateau'.")
    pairs = [(1, 2), (1, 3), (2, 4), (3, 4), (3, 5), (4, 6), (5, 6), (5, 7), (6, 8), (7, 8)]
    positions = [(0, .5), (.25, .85), (.25, .15), (.5, .85), (.5, .15), (.75, .85), (.75, .15), (1, .5)]
    model = {"version": 1, "name": f"machines-huit-{preset}", "mode": "nodes",
        "source": {"node": "M1", "input": .196 if preset == "active" else 0, "budget": .2}, "sink": "M8",
        "nodes": [{"id": f"M{i}", "name": f"Machine {i}", "x": xy[0], "y": xy[1],
                   "attributes": {}, "law": _law("piecewise_response", .1, .5, .8, .4)}
                  for i, xy in enumerate(positions, 1)],
        "edges": [{"id": f"M{a}M{b}", "from": f"M{a}", "to": f"M{b}", "fraction": 1, "attributes": {}}
                  for a, b in pairs]}
    return with_binary_controls(model, {key: 1 if preset == "active" else .5 for key in ("M1", "M3", "M5")})
