"""Types indépendants pour epsilon et e, avec tirages LCG32 reproductibles.

Les types décrivent des paramètres, pas des maxima du réseau. Modifier epsilon
ne modifie jamais e et réciproquement. Les résultats portent un enregistrement
par composante dans parameter_provenance ; un ancien champ provenance est
conservé comme historique, sans prétendre que son ancien exemple reste intact.
"""

from copy import deepcopy

from . import concordances as c


_NODES = tuple(str(i) for i in range(1, 9))
_ENVIRONMENT_NODES = _NODES[1:]
_ACTIVE = frozenset((edge["to"], edge["from"]) for edge in c.GRAPH["edges"])
_ALGORITHM = "lcg32-numerical-recipes-v1"


def _metadata(title, description, *, random=False, seed=None, generator=True):
    result = {"title": title, "description": description, "generator": generator,
              "uses_seed": random or seed is not None}
    if seed is not None:
        result["seed"] = seed
    return result


MATRIX_TYPES = {
    "neutre": _metadata("Neutre global · ε=0", "Tous les ε sont nuls. Les transformations dépendent encore des environnements e ; une transmission identique n’est pas imposée."),
    "positive": _metadata("Amplification globale · ε=+1", "Les 56 coefficients hors diagonale valent +1, la diagonale reste nulle. Les productions dépendent des environnements et des partages."),
    "inhibitory": _metadata("Inhibition globale · ε=−1", "Les 56 coefficients hors diagonale valent −1. Leur signe ne suffit pas à déterminer celui des productions, qui dépend aussi de e et des flux."),
    "reference": _metadata("Matrice de référence", "ε₂₁=ε₅₁=−1 ; tous les autres coefficients valent 0. Les environnements sont conservés : cette sélection seule ne rétablit pas le maximum de l’ancien exemple."),
    "negative": _metadata("Trois concordances finales −1", "ε₈₂=ε₈₄=ε₈₆=−1 ; les autres coefficients valent 0. La valeur finale dépend encore des environnements ; aucun maximum négatif n’est promis par cette matrice seule."),
    "inactive": _metadata("44 coefficients hors arcs +1", "Les 44 coefficients hors arcs valent +1, les douze coefficients actifs et la diagonale valent 0. Aucune liaison n’est créée ; les environnements restent inchangés."),
    "seed-7": _metadata("Matrice signée · graine 7", "Tirage LCG32 des 56 coefficients hors diagonale dans [−1,1[, graine 7. Les environnements courants sont conservés, sans les fixer à 0,5.", seed=7),
    "seed-8": _metadata("Matrice signée · graine 8", "Tirage LCG32 des 56 coefficients hors diagonale dans [−1,1[, graine 8. Aucun résultat de l’ancien exemple couplé à e=0,5 n’est attribué automatiquement.", seed=8),
    "seed-34": _metadata("Matrice signée · graine 34", "Tirage LCG32 des 56 coefficients hors diagonale dans [−1,1[, graine 34. Les environnements et les cinq partages restent inchangés.", seed=34),
    "random-positive": _metadata("ε · Aléatoire dans [0,1]", "Tirage LCG32 dans [0,1[ des 56 coefficients hors diagonale, selon la graine affichée. Huit zéros diagonaux ; les environnements sont conservés.", random=True),
    "random-signed": _metadata("ε · Aléatoire dans [−1,1]", "Tirage LCG32 dans [−1,1[ des 56 coefficients hors diagonale, selon la graine affichée. La matrice complète est conservée, mais douze coefficients seulement agissent.", random=True),
    "custom": _metadata("Matrice personnalisée", "Conserver ou éditer les valeurs courantes. Ce choix de l’interface ne génère aucune matrice.", generator=False),
}


ENVIRONMENT_TYPES = {
    "neutre": _metadata("Environnements nuls · e=0", "Les sept environnements e₂…e₈ valent 0. Les termes de concordance subsistent : ce choix ne supprime pas nécessairement les productions."),
    "positive": _metadata("Environnements +1", "Les sept environnements valent +1. Les coefficients ε sont conservés ; les transformations ne sont pas nécessairement des identités."),
    "inhibitory": _metadata("Environnements −1", "Les sept environnements valent −1. Les concordances et les flux peuvent changer le signe de C et des productions ; le traitement signé ou rectifié reste distinct."),
    "reference": _metadata("Environnements de référence · e=1", "Tous les environnements valent 1, sans modifier ε. Le maximum de l’ancien exemple de référence nécessite aussi sa matrice particulière."),
    "negative": _metadata("Profil amont 1, sortie 0", "e₂…e₇ valent 1 et e₈ vaut 0. La matrice n’est pas modifiée : ce profil seul ne fixe pas la production finale à −1."),
    "inactive": _metadata("Sans terme d’environnement · e=0", "Tous les environnements valent 0. Contrairement aux coefficients hors arcs, ces sept paramètres appartiennent aux transformations présentes ; ε reste inchangé."),
    "seed-7": _metadata("Environnements signés · graine 7", "Sept tirages LCG32 dans [−1,1[, dans l’ordre des nœuds 2 à 8, graine 7. La matrice reste inchangée.", seed=7),
    "seed-8": _metadata("Environnements signés · graine 8", "Sept tirages LCG32 dans [−1,1[, dans l’ordre des nœuds 2 à 8, graine 8. Le flux aléatoire est propre à cette composante.", seed=8),
    "seed-34": _metadata("Environnements signés · graine 34", "Sept tirages LCG32 dans [−1,1[, dans l’ordre des nœuds 2 à 8, graine 34. Aucun partage ni coefficient ε n’est changé.", seed=34),
    "random-positive": _metadata("e · Aléatoire dans [0,1]", "Sept tirages LCG32 dans [0,1[, selon la graine affichée, dans l’ordre 2 à 8. La matrice et les partages sont conservés.", random=True),
    "random-signed": _metadata("e · Aléatoire dans [−1,1]", "Sept tirages LCG32 dans [−1,1[, selon la graine affichée, dans l’ordre 2 à 8. Les valeurs négatives restent explicites.", random=True),
    "custom": _metadata("Environnements personnalisés", "Conserver ou éditer les sept valeurs courantes. Ce choix de l’interface ne génère aucun environnement.", generator=False),
}


def _selection(catalog, type_id, seed):
    if not isinstance(type_id, str) or type_id not in catalog:
        raise ValueError(f"Type de paramètres inconnu : {type_id!r}.")
    metadata = catalog[type_id]
    if not metadata["generator"]:
        raise ValueError("Le type custom est un choix d’édition, pas un générateur.")
    if metadata["uses_seed"]:
        seed = metadata.get("seed", seed)
        if isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed < 2**32:
            raise ValueError("La graine doit être un entier entre 0 et 2³²−1.")
    else:
        seed = None
    return seed


def _draws(seed, signed):
    state = seed
    while True:
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        unit = state / 2**32
        yield 2 * unit - 1 if signed else unit


def _record(result, component, type_id, seed):
    previous = result.get("parameter_provenance", {})
    if not isinstance(previous, dict):
        raise ValueError("parameter_provenance doit être un dictionnaire lorsqu’il est présent.")
    record = {"kind": "parameter-type", "version": 1, "type_id": type_id, "component": component}
    if seed is not None:
        record.update(seed=seed, algorithm=_ALGORITHM,
                      interval=[0 if type_id == "random-positive" else -1, 1], upper_exclusive=True,
                      draw_count=56 if component == "epsilon" else 7,
                      draw_order="destination 1..8, origine 1..8, diagonale sans tirage" if component == "epsilon" else "nœuds 2..8")
    result["parameter_provenance"] = {**previous, component: record}


def apply_matrix_type(model, type_id, *, seed=34):
    """Copie indépendante : remplace epsilon et sa seule provenance de composante.

    Pour seed-7/8/34, la graine du type prime sur l’argument seed. Pour les types
    non aléatoires, seed est sans effet. Aucun changement de domaine de calcul.
    """
    seed = _selection(MATRIX_TYPES, type_id, seed)
    if not isinstance(model, dict):
        raise ValueError("Un modèle dictionnaire est requis.")
    result = deepcopy(model)
    matrix = {n: {origin: 0 for origin in _NODES} for n in _NODES}
    if seed is not None:
        draws = _draws(seed, signed=type_id != "random-positive")
        for n in _NODES:
            for origin in _NODES:
                if n != origin:
                    matrix[n][origin] = next(draws)
    elif type_id in ("positive", "inhibitory"):
        value = 1 if type_id == "positive" else -1
        matrix = {n: {origin: 0 if origin == n else value for origin in _NODES} for n in _NODES}
    elif type_id == "reference":
        matrix["2"]["1"] = matrix["5"]["1"] = -1
    elif type_id == "negative":
        for origin in ("2", "4", "6"):
            matrix["8"][origin] = -1
    elif type_id == "inactive":
        matrix = {n: {origin: int(n != origin and (n, origin) not in _ACTIVE) for origin in _NODES} for n in _NODES}
    result["epsilon"] = matrix
    _record(result, "epsilon", type_id, seed)
    c.validate_model(result)
    return result


def apply_environment_type(model, type_id, *, seed=34):
    """Copie indépendante : remplace e₂…e₈ et leur provenance, jamais epsilon."""
    seed = _selection(ENVIRONMENT_TYPES, type_id, seed)
    if not isinstance(model, dict):
        raise ValueError("Un modèle dictionnaire est requis.")
    result = deepcopy(model)
    if seed is not None:
        draws = _draws(seed, signed=type_id != "random-positive")
        environments = {n: next(draws) for n in _ENVIRONMENT_NODES}
    elif type_id in ("positive", "reference", "negative"):
        environments = {n: 0 if type_id == "negative" and n == "8" else 1 for n in _ENVIRONMENT_NODES}
    else:
        environments = {n: -1 if type_id == "inhibitory" else 0 for n in _ENVIRONMENT_NODES}
    result["environments"] = environments
    _record(result, "environments", type_id, seed)
    c.validate_model(result)
    return result


def create_default_model(*, seed=34):
    """Départ : matrice signée reproductible et e=0 ; source/parts du moteur natif.

    L’interface peut fournir une graine nouvelle à chaque session, puis l’afficher.
    Une graine omise garde ici un résultat reproductible pour les scripts Python.
    """
    model = apply_environment_type(c.create_scenario(), "neutre")
    return apply_matrix_type(model, "random-signed", seed=seed)
