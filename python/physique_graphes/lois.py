"""Lois scalaires enregistrées en Python, sans code exécutable dans les JSON.

Une fonction personnelle prend ``(entree, parametres)`` et renvoie un nombre.
Elle peut lever LawDomainError pour signaler une entrée hors de son domaine.
"""

from collections.abc import Callable, Mapping
import math
from numbers import Real

Law = Callable[[float, Mapping], float]


class LawDomainError(ValueError):
    """État incompatible avec le domaine d'une loi ; aucun écrêtage implicite."""


def finite_number(value, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, Real) or not math.isfinite(value):
        raise ValueError(f"{label} doit être un nombre fini.")
    return float(value)


def validate_parameters(parameters: Mapping) -> dict:
    """Même convention que production-engine.mjs : 0≤a<b<1, 0≤d≤c≤1."""
    if not isinstance(parameters, Mapping):
        raise ValueError("Les paramètres a, b, c, d doivent former un dictionnaire.")
    try:
        result = {key: finite_number(parameters[key], key) for key in ("a", "b", "c", "d")}
    except KeyError as error:
        raise ValueError(f"Paramètre absent : {error.args[0]}.") from error
    a, b, c, d = (result[key] for key in ("a", "b", "c", "d"))
    if not (0 <= a < b < 1 and 0 <= d <= c <= 1):
        raise ValueError("Il faut 0 ≤ a < b < 1 et 0 ≤ d ≤ c ≤ 1.")
    return result


def piecewise_response(value: float, parameters: Mapping) -> float:
    """f(x), production nodale ou coefficient de rendement d'une branche."""
    p = validate_parameters(parameters)
    value = finite_number(value, "L'entrée")
    if not 0 <= value <= 1:
        raise LawDomainError("L'entrée sort de [0, 1] ; aucun écrêtage n'est appliqué.")
    if value <= p["a"]:
        return 0.0
    if value <= p["b"]:
        return p["c"] * ((value - p["a"]) / (p["b"] - p["a"]))
    if value == 1:
        return p["d"]
    return p["c"] + (p["d"] - p["c"]) * ((value - p["b"]) / (1 - p["b"]))


def piecewise_yield(value: float, parameters: Mapping) -> float:
    """g(x)=x f(x), production effective portée par une branche."""
    return value * piecewise_response(value, parameters)


def identity(value: float, parameters: Mapping) -> float:
    """Transmission sans transformation, sur les entrées non négatives."""
    value = finite_number(value, "L'entrée")
    if value < 0:
        raise LawDomainError("Une entrée de flux ne peut pas être négative.")
    return value


BUILTIN_LAWS: dict[str, Law] = {
    "identity": identity,
    "piecewise_response": piecewise_response,
    "piecewise_yield": piecewise_yield,
}


def law_registry(custom: Mapping[str, Law] | None = None) -> dict[str, Law]:
    """Copie indépendante du registre ; les noms intégrés ne sont pas redéfinis."""
    result = dict(BUILTIN_LAWS)
    if custom is not None:
        if not isinstance(custom, Mapping):
            raise ValueError("Le registre personnel doit former un dictionnaire de fonctions.")
        for name, function in custom.items():
            if not isinstance(name, str) or not name or not callable(function):
                raise ValueError("Une loi personnelle doit avoir un nom et une fonction Python.")
            if name in result and function is not result[name]:
                raise ValueError(f"Le nom de loi intégré {name!r} est réservé.")
            result[name] = function
    return result


def validate_law(specification: Mapping, registry: Mapping[str, Law]) -> None:
    if not isinstance(specification, Mapping):
        raise ValueError("Une loi est un objet {name, parameters}.")
    name = specification.get("name")
    if not isinstance(name, str) or name not in registry:
        raise ValueError(f"Loi inconnue : {name!r}. Importez sa fonction dans le registre Python.")
    parameters = specification.get("parameters", {})
    if not isinstance(parameters, Mapping):
        raise ValueError("Les paramètres d'une loi doivent former un objet.")
    if name in ("piecewise_response", "piecewise_yield"):
        validate_parameters(parameters)


def evaluate_law(specification: Mapping, value: float, registry: Mapping[str, Law]) -> float:
    """Évalue une loi déjà validée ; un résultat non fini/négatif est incompatible."""
    result = registry[specification["name"]](value, specification.get("parameters", {}))
    try:
        result = finite_number(result, "La sortie de la loi")
    except ValueError as error:
        raise LawDomainError(str(error)) from error
    if result < 0:
        raise LawDomainError("La loi produit un flux négatif ; ce DAG utilise des flux non négatifs.")
    return result
