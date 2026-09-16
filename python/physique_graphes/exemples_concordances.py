"""Educational starting points for the native nodal concordance workshop.

The graph and source remain fixed. Each returned model has a full 8×8 matrix;
only the twelve existing incoming arcs influence its transformations. Examples
are calculated configurations, not observations or optimizer certificates.
"""

from copy import deepcopy

from . import concordances as c


_NODES = tuple(str(i) for i in range(1, 9))
_ACTIVE = frozenset((edge["to"], edge["from"]) for edge in c.GRAPH["edges"])

# Insertion order is the intended menu order. Descriptions explicitly delimit
# statements about all shares from values at the initial shares 0.5.
EXAMPLES = {
    "reference": {
        "title": "Référence · maximum 0,5",
        "description": "Avec les lois de cet exemple inchangées, les deux premières transformations donnent Y₂=Y₅=s₁(1−s₁), puis les nœuds aval transmettent à l’identique. Ainsi Y₈=2s₁(1−s₁)≤0,5 dans les deux modes ; le départ atteint ce maximum, indépendamment des quatre autres parts.",
    },
    "negative": {
        "title": "Maximum négatif · −1 en mode signé",
        "description": "Les transformations amont sont des identités, donc X₈=1 pour tous les partages. Avec e₈=0 et les trois concordances entrantes égales à −1, C₈=−1 : Y₈=−1 en mode signé et Y₈=0 en mode rectifié, pour tous les partages.",
    },
    "neutral": {
        "title": "Concordances nulles · transmission neutre",
        "description": "Tous les environnements valent 1 et tous les coefficients ε sont nuls. Chaque transformation est une identité ; les partages intégraux conservent Y₈=1 pour toutes les parts, dans les deux modes. La surface est un plateau.",
    },
    "positive": {
        "title": "Concordances positives · amplification",
        "description": "Les 56 coefficients hors diagonale valent +1 et les environnements valent 1 : chaque nœud applique Y=X(1+X). Au départ, avec toutes les parts à 0,5, Y₈≈18,8831489235 dans les deux modes. Cette valeur calculée n’est pas annoncée comme un maximum.",
    },
    "inhibitory": {
        "title": "Concordances négatives · inhibition",
        "description": "Les 56 coefficients hors diagonale valent −1 et les environnements valent 1 : Y=X(1−X). Ici les entrées restent dans [0,1], donc les productions restent non négatives dans les deux modes. Au départ Y₈≈0,2350690216 ; ce résultat n’est pas une preuve de maximum.",
    },
    "inactive": {
        "title": "Coefficients hors arcs · aucune influence",
        "description": "Seuls les 44 coefficients sans arc associé valent +1 ; les douze coefficients actifs valent 0 et les environnements valent 1. Les transferts absents étant nuls, Y₈=1 pour tous les partages, dans les deux modes. La matrice ne crée aucune liaison.",
    },
    "seed-7": {
        "title": "Matrice mixte · graine 7, e=0,5",
        "description": "Tirage LCG32 reproductible des 56 coefficients hors diagonale, avec tous les environnements à 0,5. Au départ Y₈≈0,0160872623 dans les deux modes. Les autres partages peuvent changer les signes et les résultats ; seul un calcul avec sa borne renseigne le maximum.",
    },
    "seed-8": {
        "title": "Matrice mixte · graine 8, e=0,5",
        "description": "Tirage LCG32 reproductible des 56 coefficients hors diagonale, avec tous les environnements à 0,5. Au départ Y₈≈0,2059498928 dans les deux modes. Cette valeur dépend des parts initiales ; elle ne constitue pas un maximum établi ni une preuve d’équivalence des deux modes.",
    },
    "seed-34": {
        "title": "Matrice mixte · graine 34, e=0,5",
        "description": "Tirage LCG32 reproductible, avec tous les environnements à 0,5. Au départ Y₈≈0,2491817925 dans les deux modes. L’égalité de ces deux valeurs à ce point ne prouve ni l’égalité des maxima ni l’absence de productions négatives ailleurs.",
    },
}


def _matrix(value=0):
    return {n: {origin: 0 if n == origin else value for origin in _NODES} for n in _NODES}


def create_example(example_id):
    """Return an independent native model with pedagogical provenance.

    All starts have five shares 0.5 and Y1=1. The chosen example does not change
    the caller's selected domain; in particular, ``negative`` is a signed
    negative-maximum example and a rectified zero-output example.
    """
    if not isinstance(example_id, str) or example_id not in EXAMPLES:
        raise ValueError(f"Unknown concordance example: {example_id!r}")
    model = c.create_negative_scenario() if example_id == "negative" else c.create_scenario()
    if example_id == "reference":
        matrix = _matrix()
        for n, row in model["epsilon"].items():
            matrix[n].update(row)
        model["epsilon"] = matrix
    elif example_id in ("neutral", "positive", "inhibitory"):
        model["epsilon"] = _matrix({"neutral": 0, "positive": 1, "inhibitory": -1}[example_id])
    elif example_id == "inactive":
        model["epsilon"] = {n: {origin: int(n != origin and (n, origin) not in _ACTIVE)
                                for origin in _NODES} for n in _NODES}
    elif example_id.startswith("seed-"):
        model["environments"] = {n: .5 for n in model["environments"]}
        model = c.randomize(model, int(example_id.split("-")[1]))
    matrix_provenance = deepcopy(model.get("provenance"))
    model["provenance"] = {"kind": "pedagogical-example", "example_id": example_id, "version": 1}
    if example_id.startswith("seed-"):
        model["provenance"]["matrix"] = matrix_provenance
    c.validate_model(model)
    return model


def randomize_matrix(model, seed):
    """Change only epsilon/provenance; preserve every other field by deep copy.

    Validation and the deterministic generator are delegated to the native
    engine. Unlike its canonicalizer, this adapter retains custom labels and
    attributes supplied by the user. Provenance describes the new draw rather
    than continuing to attribute the changed matrix to the prior example.
    """
    generated = c.randomize(model, seed)
    result = deepcopy(model)
    result["epsilon"] = generated["epsilon"]
    result["provenance"] = generated["provenance"]
    return result
