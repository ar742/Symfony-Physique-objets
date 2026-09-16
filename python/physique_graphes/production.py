"""Machines fictives, production affine par morceaux et cycles synchrones.

Ce modèle normalisé ne prétend pas conserver l'énergie. Les allocations et
conversions sont explicites ; le surplus d'alimentation n'est jamais stocké.
Les clés des dictionnaires reprennent celles du moteur JavaScript.
"""

from math import isfinite


def _finite(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value):
        raise ValueError(f"{label} doit être un nombre fini.")


def _unit(value, label):
    _finite(value, label)
    if not 0 <= value <= 1:
        raise ValueError(f"{label} doit être compris entre 0 et 1.")


def _parameters(params):
    if not isinstance(params, dict):
        raise ValueError("Les paramètres a, b, c, d sont requis.")
    for key in ("a", "b", "c", "d"):
        _unit(params.get(key), key)
    if not params["a"] < params["b"] < 1:
        raise ValueError("Les seuils doivent respecter 0 ≤ a < b < 1.")
    if params["d"] > params["c"]:
        raise ValueError("Les productions doivent respecter 0 ≤ d ≤ c ≤ 1.")


def _evaluate(x, params):
    a, b, c, d = (params[key] for key in ("a", "b", "c", "d"))
    if x <= a:
        return 0
    if x <= b:
        return c * ((x - a) / (b - a))
    return d if x == 1 else c + (d - c) * ((x - b) / (1 - b))


def f_piecewise(x, params):
    """Réponse continue : les paramètres et x ne sont pas corrigés par écrêtage."""
    _parameters(params)
    _unit(x, "L’alimentation x")
    return _evaluate(x, params)


def _prepare(model):
    if not isinstance(model, dict) or not isinstance(model.get("machines"), list) or not model["machines"] or not isinstance(model.get("allocations"), list):
        raise ValueError("Le modèle doit définir des machines et un tableau allocations.")
    index, machines, allocations, seen = {}, [], [], set()
    for machine in model["machines"]:
        if not isinstance(machine, dict) or not isinstance(machine.get("id"), str) or not machine["id"].strip() or machine["id"] in index:
            raise ValueError("Chaque machine doit posséder un identifiant non vide et unique.")
        _parameters(machine)
        _unit(machine.get("external"), "L’apport externe")
        initial = machine.get("initial", 0)
        _unit(initial, "La production initiale")
        index[machine["id"]] = len(machines)
        machines.append({**machine, "initial": initial})
    for row in model["allocations"]:
        if not isinstance(row, dict) or row.get("from") not in index or row.get("to") not in index:
            raise ValueError("Chaque allocation doit relier des machines existantes.")
        _unit(row.get("fraction"), "La fraction allouée")
        _finite(row.get("conversion"), "Le coefficient de conversion")
        if row["conversion"] <= 0:
            raise ValueError("Le coefficient de conversion doit être strictement positif.")
        pair = row["from"], row["to"]
        if pair in seen or (pair[0] == pair[1] and row["fraction"] != 0):
            raise ValueError("Allocation dupliquée ou fraction diagonale non nulle.")
        seen.add(pair)
        allocations.append({key: row[key] for key in ("from", "to", "fraction", "conversion")})
    allocations.sort(key=lambda row: tuple(row[k].encode("utf-16-be", "surrogatepass") for k in ("from", "to")))
    fractions = [0] * len(machines)
    for row in allocations:
        fractions[index[row["from"]]] += row["fraction"]
    if any(value > 1 for value in fractions):
        raise ValueError("La somme des fractions sortantes d’une machine dépasse 1.")
    return machines, allocations, index, fractions


def _difference(a, b):
    return max(abs(x - y) for x, y in zip(a, b))


def _transition(prepared, previous):
    machines, allocations, index, fractions = prepared
    raw, flows = [machine["external"] for machine in machines], []
    for row in allocations:
        sent = row["fraction"] * previous[index[row["from"]]]
        offered = row["conversion"] * sent
        raw[index[row["to"]]] += offered
        if not isfinite(raw[index[row["to"]]]):
            raise OverflowError("L’alimentation cumulée dépasse la plage numérique finie.")
        flows.append({**row, "sent": sent, "offered": offered})
    inputs = [min(1, value) for value in raw]
    outputs = [_evaluate(x, machine) for x, machine in zip(inputs, machines)]
    for flow in flows:
        flow["nextSent"] = flow["fraction"] * outputs[index[flow["from"]]]
        flow["nextOffered"] = flow["conversion"] * flow["nextSent"]
        if not isfinite(flow["nextOffered"]):
            raise OverflowError("Le flux converti dépasse la plage numérique finie.")
    return {"previousOutputs": list(previous), "rawInput": raw, "input": inputs,
            "overflow": [value - x for value, x in zip(raw, inputs)], "outputs": outputs,
            "externalOutputs": [(1 - fraction) * y for fraction, y in zip(fractions, outputs)],
            "flows": flows, "residual": _difference(outputs, previous)}


def pas_production(model, outputs):
    """Lit y[k] pour toutes les machines puis produit y[k+1], sans stock.

    sent/offered proviennent de y[k] ; nextSent/nextOffered de y[k+1].
    Les tableaux suivent l'ordre des machines, les flux l'ordre des identifiants.
    """
    prepared = _prepare(model)
    if not isinstance(outputs, list) or len(outputs) != len(prepared[0]):
        raise ValueError("Le vecteur de production doit contenir une valeur par machine.")
    for value in outputs:
        _unit(value, "La production")
    return _transition(prepared, list(outputs))


def simuler_production(model, cycles=40, tolerance=1e-7):
    """Horizon exact ; résidu final recalculé ||F(y_final)−y_final||∞.

    approximate signifie seulement un faible résidu, jamais un optimum.
    period2Observed constate une alternance des cinq derniers états ; il ne
    prouve ni convergence, ni stabilité, ni comportement asymptotique.
    """
    prepared = _prepare(model)
    if isinstance(cycles, bool) or not isinstance(cycles, int) or not 0 <= cycles <= 10000:
        raise ValueError("Le nombre de cycles doit être un entier entre 0 et 10 000.")
    _finite(tolerance, "La tolérance")
    if tolerance <= 0:
        raise ValueError("La tolérance doit être strictement positive.")
    outputs = [machine["initial"] for machine in prepared[0]]
    history = [{"index": 0, "previousOutputs": None, "rawInput": None, "input": None,
                "overflow": None, "outputs": list(outputs), "externalOutputs": None,
                "flows": [], "residual": None}]
    for cycle in range(1, cycles + 1):
        row = _transition(prepared, outputs)
        history.append({"index": cycle, **row})
        outputs = row["outputs"]
    residual = _transition(prepared, outputs)["residual"]
    approximate = residual <= tolerance
    period2 = not approximate and cycles >= 4 and all(
        _difference(history[cycles - offset]["outputs"], history[cycles - offset - 2]["outputs"]) <= tolerance
        for offset in (0, 1, 2))
    return {"history": history, "finalOutputs": list(outputs), "residual": residual,
            "status": "approximate" if approximate else "stillvarying", "cycles": cycles,
            "tolerance": tolerance, "period2Observed": period2}


def production_exemple(preset="balanced"):
    """Données éditables identiques aux trois préréglages du site."""
    presets = {
        "balanced": ("Production équilibrée", "Réponse progressive avec rétroactions modérées ; les données sont fictives et les parts restent propres à chaque machine.",
                     (.1, .5, .8, .4), [.2, .15, .1], [("M1", "M2", .3), ("M1", "M3", .1), ("M2", "M3", .25), ("M3", "M1", .2)]),
        "threshold": ("Démarrage bloqué par les seuils", "Depuis zéro, les apports externes restent sous les seuils. Une autre initialisation peut conduire à un autre état ; zéro n’est pas l’unique équilibre.",
                      (.2, .4, .8, .6), [.1, .1, .1], [("M1", "M2", .5), ("M2", "M3", .5), ("M3", "M1", .5)]),
        "oscillating": ("Alternance de deux états", "Deux machines couplées atteignent le segment décroissant de leur réponse. Depuis zéro, elles alternent ; la troisième reste inactive dans ce scénario.",
                       (0, .5, 1, 0), [.5, .5, 0], [("M1", "M2", .5), ("M2", "M1", .5)]),
    }
    if not isinstance(preset, str) or preset not in presets:
        raise ValueError(f"Scénario de production inconnu : {preset}.")
    title, description, params, external, links = presets[preset]
    return {"preset": preset, "title": title, "description": description,
            "machines": [{"id": f"M{i + 1}", "name": f"Machine {i + 1}", **dict(zip(("a", "b", "c", "d"), params)),
                          "external": external[i], "initial": 0} for i in range(3)],
            "allocations": [{"from": source, "to": target, "fraction": fraction, "conversion": 1}
                            for source, target, fraction in links]}
