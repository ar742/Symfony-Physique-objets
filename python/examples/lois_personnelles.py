"""Exemple : depuis python/, exécuter ``python -m examples.lois_personnelles``.

La fonction est importée/enregistrée normalement en Python. Un JSON ne peut
ni l'importer lui-même, ni exécuter une expression ou un chemin de module.
"""

from physique_graphes.dag import create_branch_active, evaluate
from physique_graphes.lois import LawDomainError, finite_number


def rendement_constant(entree, parametres):
    """Exemple modifiable : la sortie est eta*entree, avec eta dans [0, 1]."""
    eta = finite_number(parametres["eta"], "eta")
    if not 0 <= eta <= 1 or entree < 0:
        raise LawDomainError("Cette loi demande eta dans [0, 1] et une entrée positive ou nulle.")
    return eta * entree


PERSONAL_LAWS = {"rendement_constant": rendement_constant}


def main():
    modele = create_branch_active()
    modele["edges"][0]["law"] = {"name": "rendement_constant", "parameters": {"eta": .9}}
    modele["edges"][0]["attributes"]["commentaire"] = "Loi personnelle de la branche 1→2."
    resultat = evaluate(modele, registry=PERSONAL_LAWS)
    print(f"Compatible : {resultat['feasible']} ; production : {resultat['production']}")


if __name__ == "__main__":
    main()
