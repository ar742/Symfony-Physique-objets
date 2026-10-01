# Graphes : atelier Python local

Cet atelier permet de modifier les modèles du volet Graphes, de calculer leurs états et de tracer graphes, courbes et nappes avec Plotly. Les calculs s’exécutent en Python sur votre ordinateur ; ils n’appellent pas les moteurs JavaScript du site.

L’application s’ouvre sur **http://localhost:8501**. Elle est indépendante de Symfony et de Docker : le site Symfony peut continuer à fonctionner sur **http://localhost:8080**. Il n’est pas nécessaire de démarrer Docker pour utiliser cet atelier. Les données des exemples sont fictives ; les résultats sont calculés, pas mesurés.

L’environnement et le carnet ont été validés sous **Windows avec Python 3.12.14**. Le minimum demandé par l’installation est Python 3.12, notamment pour les versions fixées des dépendances.

## Installer et lancer sous Windows

1. Ouvrir **PowerShell normalement**, sans droits administrateur.
2. Se placer dans le dossier `python` de votre copie du dépôt. Remplacer le chemin ci-dessous par le vôtre :

   ```powershell
   Set-Location "C:\chemin\Symfony-Physique-objets\python"
   ```

3. Lors de la première utilisation, créer l’environnement local et installer les dépendances. Le script demande **Python 3.12 ou plus** :

   ```powershell
   .\installer.ps1
   ```

   Si le script ne trouve pas votre interpréteur Python, lui fournir son chemin :

   ```powershell
   .\installer.ps1 -Python "C:\chemin\vers\python.exe"
   ```

   Les dépendances sont déclarées dans [requirements.txt](requirements.txt) ; le script installe les versions fixées dans [requirements-lock.txt](requirements-lock.txt). Elles sont installées dans le sous-dossier `.venv`, sans modifier le Python d’autres projets. Cette première installation nécessite une connexion Internet.

4. Lancer l’application :

   ```powershell
   .\lancer.ps1
   ```

   Le navigateur s’ouvre sur l’atelier ; **http://localhost:8501** reste accessible directement. Si l’atelier est déjà lancé, le script reconnaît son processus et vérifie qu’il répond, puis ouvre sa page sans démarrer un second serveur. Lors d’un nouveau démarrage, garder PowerShell ouvert pendant l’utilisation ; **Ctrl+C** arrête ce serveur local. Lors des utilisations suivantes, cette seule commande de lancement suffit. Si un autre service occupe le port, le script le signale sans l’arrêter : utiliser par exemple `.\lancer.ps1 -Port 8502`. L’option `-NoBrowser` permet un lancement sans ouverture automatique du navigateur.

5. Pour ouvrir le carnet Jupyter à la place de l’application, ou dans une seconde fenêtre PowerShell placée dans le même dossier :

   ```powershell
   .\lancer-carnet.ps1
   ```

   Jupyter utilise le port **8888** par défaut ; `.\lancer-carnet.ps1 -Port 8889` permet d’en choisir un autre. Ouvrir [notebooks/01_explorer_les_graphes.ipynb](notebooks/01_explorer_les_graphes.ipynb), puis choisir **Exécuter → Exécuter toutes les cellules**. Le noyau `Python 3` lancé par ce script utilise le Python du `.venv`. Le carnet accepte un répertoire de travail situé dans `python/` ou dans `python/notebooks/`. Il ne contient aucun chemin personnel.

Après l’installation, un double-clic sur [Lancer-atelier.cmd](Lancer-atelier.cmd) offre également un lancement de l’application depuis l’Explorateur Windows.

Si PowerShell refuse les scripts en raison de sa politique d’exécution, les lancer dans un processus dédié, sans modifier la politique générale :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\lancer.ps1
```

Pour diagnostiquer directement le lancement, depuis `python/` :

```powershell
.\.venv\Scripts\python.exe -m streamlit run app.py
.\.venv\Scripts\python.exe -m jupyter lab notebooks/01_explorer_les_graphes.ipynb
```

## Premier parcours en dix minutes

1. **01 · Villes** : choisir A et F. Les trois algorithmes donnent une distance minimale de **12 km** dans le préréglage. Modifier une coordonnée, appliquer, puis recalculer. La position d’arrivée est fixée par votre sélection ; elle n’est pas déduite de la seule position de départ.
2. **02 · Dépendances** : faire varier le débit autour de **40 véhicules/min**. Les parcours A–B–D et A–C–D durent chacun 8 minutes au seuil. Le débit est un paramètre externe figé, pas un trafic simulé.
3. **03 · Production → Machines couplées · cycles** : comparer les trois scénarios. L’exemple équilibré approche `(0,275 ; 0,265 ; 0,1875)`, le départ nul sous seuil reste nul et l’exemple oscillant alterne entre deux états.
4. Dans **03 · Production → DAG · branches ou machines**, choisir les **12 branches actives**. Le départ donne `0,447553125`. Modifier une loi ou un partage, examiner les pertes et la nappe, puis lancer une recherche locale. Le point affiché n’est pas automatiquement un maximum du modèle modifié.
5. **04 · Concordances** : le départ associe une matrice aléatoire signée, des environnements **nuls** et cinq parts à 0,5. Choisir un type de matrice et, indépendamment, un type d’environnements ; le panneau adjacent permet d’affiner les valeurs. Comparer les modes signé et rectifié, puis rechercher une meilleure configuration en faisant varier les distributions, les environnements ou les concordances actives. Tableau, graphe et nappes se placent automatiquement sur le meilleur état trouvé.
6. **05 · Liaisons symétriques** : l’exemple à huit nœuds sert de départ à un atelier de **2 à 24 nœuds**. Dans **Construire le graphe**, choisir le nombre puis **Créer un dessin vide**. Relier deux nœuds par deux clics ou par glissement ; cliquer sur une liaison la retire. Le mode **Déplacer** organise le dessin et **Annuler** permet de corriger les gestes. **Valider le graphe et passer à l’analyse** ouvre les formules ; **Rechercher le maximum** centre ensuite les nappes sur le résultat retenu. Les contraintes déterminent le minimum de variables ; les coupes en emploient deux à la fois lorsqu’il en existe au moins deux. L’exemple « Quatre nœuds » possède exactement deux coordonnées libres. La saisie au clavier et l’ordre de calcul restent accessibles en complément, avec IN₁=1 et OUTₙ=INₙ. [Guide de construction et formules](../docs/GRAPHES-PERSONNALISES-PYTHON.md).
7. Télécharger une **étude JSON** et une **figure HTML**. En 04 et 05, l’étude rassemble les paramètres et les résultats ; les autres familles proposent aussi leur éditeur et leur export de modèle. Les modifications de l’interface vivent dans la session ; ces exports permettent de conserver votre travail.

## Les cinq familles et leurs conventions

| Famille | Modèle et fonctions principales | Ce que le résultat permet d’affirmer |
|---|---|---|
| 01 · Villes | `reseaux.villes_exemple`, `ponderer_villes`, `dijkstra`, `bellman_ford`, `floyd_warshall`, `parcours_bornes` | Plus court chemin pour les poids fournis ; énumération de chemins **simples**, sans sommet répété, sous une borne **stricte**. |
| 02 · Dépendances | `routes_dependantes`, `sensibilite_dependance` | Comparaison statique de deux durées pour `q ∈ [0,100]` véhicules/min. La sensibilité de la meilleure durée a une cassure à 40. |
| 03 · Production | `production.production_exemple`, `f_piecewise`, `simuler_production` ; `dag.evaluate` et `optimisation.optimiser` | Simulation synchrone des réseaux cycliques, ou propagation statique sur un DAG. Ces deux cadres restent distincts. |
| 04 · Concordances | `concordances.evaluate`, `explain_lagrangian` ; `optimisation_concordances.variables`, `gradient`, `search` | Trois groupes de variables, recherches bornées, différentielles et nappes compatibles. Les intervalles certifiants sont réservés aux distributions à paramètres fixes. |
| 05 · Liaisons symétriques | `graphes_symetriques.compile_graph`, `search`, `global_bound`, `surface` ; `Graph.state`, `kkt` | 2 à 24 nœuds, réduction rationnelle, zéros forcés et nombre minimal de coordonnées. KKT et intervalles génériques ; certificat Bernstein réservé à l’exemple initial. |

**Villes.** Le préréglage comporte six sommets et neuf liaisons bidirectionnelles. `villes_exemple()` fournit neuf liaisons non pondérées ; `ponderer_villes()` calcule dix-huit arcs dirigés depuis les coordonnées. Il remplace les éventuels poids saisis par ces distances. Pour des poids abstraits ou négatifs, appeler les algorithmes directement avec un graphe pondéré. Dijkstra refuse tout poids négatif ; Bellman–Ford et Floyd–Warshall refusent les cycles négatifs pertinents pour la paire demandée. Sans extrémités, Floyd–Warshall renvoie une matrice complète et refuse tout cycle négatif affectant une paire. À coût égal, le départage privilégie moins d’arcs, puis l’ordre des identifiants. Une recherche de parcours interrompue retourne `complete=False` et un avertissement : sa liste n’est pas nécessairement celle des K meilleurs parcours. Les parcours inverses sont distincts lorsque toutes les paires sont explorées.

**Machines cycliques.** Les productions `y[k]` sont lues simultanément pour former les alimentations et calculer `y[k+1]`. Les contributions passent par les fractions et coefficients de conversion explicites ; les fractions sortantes somment au plus à 1. L’alimentation est plafonnée à 1 conformément à ce modèle ; l’excédent est affiché mais n’est pas stocké. `sent` et `offered` proviennent de l’ancien état ; `nextSent` et `nextOffered` du nouvel état. Le résidu final est recalculé à l’état final. Un faible résidu ne prouve ni stabilité, ni optimum ; l’alternance des cinq derniers états ne prouve pas une période asymptotique.

**DAG statique.** Les lois sont exclusivement portées par les branches (`mode="branches"`) ou les nœuds (`mode="nodes"`). Dans les préréglages, `piecewise_yield` produit `x f(x)` sur une branche et `piecewise_response` produit `f(x)` au nœud. Les sorties sont entièrement réparties, sans écrêtage ni stock. Une entrée hors du domaine d’une loi rend l’état incompatible. Avec une loi personnelle, le moteur attend directement la **production de sortie** : il ne multiplie pas automatiquement une deuxième fois par `x`. Les attributs `loss=input−output` peuvent être négatifs pour une loi amplificatrice ; ils ne décrivent alors pas une dissipation physique. En présence de plusieurs puits, `production` concerne le puits choisi et `exported` la somme des sorties terminales.

**Concordances.** Le DAG est ici fixé à huit nœuds et douze arcs. `X_i=Σq_ji`, `C_i=e_i+Σε_ij q_ji`, puis `Y_i=X_i C_i` en signé ou `max(0,X_i C_i)` en rectifié. Source `Y1=1`, objectif **Y8 après TH8**, sans plafond positif ajouté. Le mode signé répartit également les sorties négatives, avec leur signe. La matrice est indexée par destinataire puis fournisseur : huit zéros diagonaux, douze coefficients actifs, quarante-quatre valeurs hors arcs conservées mais inactives. Les environnements e et les concordances ε appartiennent ici à **[−1,1]** ; les fractions de distribution restent dans **[0,1]**. L’extension de e au domaine signé est propre à cette version Python, distincte du cadre initial du PDF et du site Symfony. Une graine fixe rend le tirage reproductible ; les exemples aléatoires ne sont pas un échantillon représentatif de tous les réseaux possibles. Les équations, indices et différentielles sont développés dans [Concordances en Python](../docs/CONCORDANCES-PYTHON.md).

## Régler et rechercher dans 04 · Concordances

La ligne supérieure propose **Type de matrice ε**, le panneau **Régler les environnements, matrice, etc.**, puis **Type d’environnements eᵢ**. Les deux menus sont indépendants : choisir une matrice conserve les environnements et les parts ; choisir les environnements conserve la matrice et les parts. Le traitement signé/rectifié reste un choix séparé.

Les types comprennent les valeurs nulles, +1, −1, des profils de référence, des graines fixes 7/8/34, des tirages positifs ou signés et des valeurs personnalisées. Ces noms décrivent des paramètres, **pas un maximum ou un résultat imposé**. Une matrice nulle n’est une transmission identique qu’avec des environnements adéquats ; e=0 ne supprime pas nécessairement les termes de concordance. Les graines 7/8/34 des menus ne remettent pas automatiquement e à 0,5.

Le panneau permet d’éditer les graines, les sept e, la matrice et les cinq partages. Pour faire varier une graine, sélectionner un type **aléatoire** ; un type à graine fixe conserve la graine annoncée dans son nom. La matrice colorée garde l’échelle −1 à +1 et repère par ● les douze concordances actives. Les 44 autres valeurs hors diagonale restent conservées, sans créer de nouvelles liaisons.

Pour une recherche, choisir **un seul groupe** :

| Groupe | Variables libres | Variables conservées |
|---|---|---|
| Distributions | Cinq parts dans [0,1]. | Les sept e et toute la matrice ε. |
| Environnements | Sept e dans [−1,1]. | Les cinq parts et toute la matrice ε. |
| Concordances actives | Douze ε dans [−1,1]. | Les cinq parts, les sept e et les 44 ε hors arcs. |

Le choix par défaut compare **SLSQP** et **l’évolution différentielle**, depuis les mêmes réglages. Une grille finie est aussi disponible ; l’encadrement global par intervalles concerne uniquement les distributions. Chaque méthode rapporte son budget, son statut et, lorsqu’elle en possède une, sa borne supérieure. Un accord entre deux méthodes heuristiques ne certifie pas le maximum continu.

Après recherche, la meilleure configuration trouvée alimente automatiquement le tableau des flux, le graphe, les dérivées et les nappes. Aucun bouton d’adoption n’est nécessaire. Les réglages initiaux restent en haut ; après leur modification, les résultats d’un autre problème ne sont plus présentés comme courants. La nappe principale représente **L compatible = Y8**, avec tous les flux recalculés. Elle varie deux coordonnées du groupe choisi autour de la configuration retenue, en respectant leurs bornes. Les deux profils passent par ce centre ; la coupe libre de L, hors contraintes, est proposée séparément comme complément.

Depuis un carnet, les types sont disponibles sans interface :

```python
from physique_graphes.types_concordances import (
    create_default_model, apply_matrix_type, apply_environment_type,
)
from physique_graphes import concordances as c

modele = create_default_model(seed=34)  # matrice signée, e=0, parts=.5
modele = apply_environment_type(modele, "random-signed", seed=8)
modele = apply_matrix_type(modele, "positive")  # conserve les e et les parts
etat = c.evaluate(modele, domain="signed")
```

Le module historique `exemples_concordances.py` reste disponible pour reproduire les anciens **exemples complets**, notamment leurs environnements e=0,5. Ces exemples ne sont pas assimilés aux nouvelles sélections indépendantes de paramètres. Le carnet initial conserve ses choix explicites et reproductibles.

Pour lancer puis examiner une recherche depuis Python :

```python
from physique_graphes import optimisation_concordances as recherche

resultat = recherche.search(
    modele, "shares", method="evolution", domain="signed",
    seed=42, max_evaluations=1000,
)
retenu = resultat["best_model"]
print(resultat["best_state"]["objective"], resultat["status"])
derivees = recherche.gradient(retenu, "shares", domain="signed")
print(derivees["names"], derivees["gradient"])
```

Remplacer `"shares"` par `"environments"` ou `"epsilon"` change uniquement le groupe étudié. La méthode `"interval"` est réservée à `"shares"` et son budget s’exprime avec `max_nodes`, tandis que les méthodes `"local"`, `"evolution"` et `"grid"` utilisent `max_evaluations`. Le champ `best_model` contient les paramètres effectivement retenus ; une modification des paramètres après la recherche impose un nouveau calcul.

## Modifier les modèles JSON

Dans les familles qui le proposent, ouvrir **Modèle complet · attributs, topologie, lois · importer / exporter**. Modifier le texte ou importer un fichier, puis **Appliquer le modèle**. Télécharger ensuite le modèle pour le conserver. L’éditeur de DAG permet notamment de changer les noms, coordonnées, attributs, topologie et lois.

En **04**, cet éditeur complet a été retiré : les réglages se font dans les menus et le panneau supérieur, et le DAG reste fixe. **Enregistrer les résultats JSON** produit le fichier `concordances-etude-resultats.json`, qui conserve les paramètres et les calculs. Pour reprendre ses valeurs dans un script ou un carnet, charger explicitement le modèle retenu, ou le modèle initial :

```python
import json
from pathlib import Path
from physique_graphes import concordances as c

etude = json.loads(Path("concordances-etude-resultats.json").read_text(encoding="utf-8"))
modele = etude["model"]  # etude["initial_model"] pour les réglages de départ
c.validate_model(modele)
etat = c.evaluate(modele, domain=etude["domain"])
```

Le mode signé ou rectifié est repris explicitement : appeler le moteur sans ce choix utilise son mode rectifié par défaut, qui peut produire un autre résultat.

Un DAG minimal à deux branches peut s’écrire ainsi :

```json
{
  "version": 1,
  "name": "Transmission partagée",
  "mode": "branches",
  "source": {"node": "A", "input": 1},
  "sink": "C",
  "nodes": [
    {"id": "A", "name": "Source", "attributes": {"unite": "normalisée"}},
    {"id": "B", "name": "Puits secondaire"},
    {"id": "C", "name": "Puits étudié"}
  ],
  "edges": [
    {"id": "AB", "from": "A", "to": "B", "fraction": 0.4,
     "law": {"name": "identity", "parameters": {}}},
    {"id": "AC", "from": "A", "to": "C", "fraction": 0.6,
     "law": {"name": "identity", "parameters": {}}}
  ]
}
```

Les identifiants sont des chaînes, les fractions sortantes somment à 1 et tous les nœuds sont accessibles depuis la source. Les commandes binaires désignent la fraction vers la **première branche sortante dans le JSON** ; l’autre reçoit son complément. L’ordre des branches fait donc partie de la définition des commandes. Les nœuds ayant plus de deux sorties restent calculables avec leurs fractions explicites, mais l’optimiseur fourni ne varie que les partages binaires.

Depuis un script ou le carnet :

```python
from physique_graphes import dag

modele = dag.create_branch_active()
modele = dag.with_binary_controls(modele, {"1": 0.55, "5": 0.30})
etat = dag.evaluate(modele)
print(etat["feasible"], etat["production"])
# À exécuter si vous souhaitez créer un fichier :
# dag.save_model(modele, "mon-modele.json")
# modele = dag.load_model("mon-modele.json")
```

Les modèles de villes et de machines cycliques utilisent les clés du site (`nodes`, `edges`, `machines`, `allocations`, etc.). Les concordances utilisent `initial_controls` en Python ; pour reprendre dans un script un ancien export web portant `initialControls`, renommer explicitement cette clé. Un modèle JSON contient des données et des noms de lois, **pas du code exécutable**.

## Écrire une loi personnelle

Le fichier [examples/lois_personnelles.py](examples/lois_personnelles.py) fournit une fonction modifiable et le registre `PERSONAL_LAWS`, déjà importé par l’application. Une fonction reçoit `(entree, parametres)` et renvoie une sortie finie, non négative. Lever `LawDomainError` pour déclarer une entrée incompatible avec la loi ; ne pas écrêter implicitement une valeur pour masquer cette incompatibilité.

```python
from physique_graphes.lois import LawDomainError, finite_number

def rendement_constant(entree, parametres):
    eta = finite_number(parametres["eta"], "eta")
    if not 0 <= eta <= 1 or entree < 0:
        raise LawDomainError("Domaine : eta dans [0,1], entrée non négative.")
    return eta * entree

PERSONAL_LAWS = {"rendement_constant": rendement_constant}
```

Sur une branche du modèle, remplacer uniquement sa description de loi :

```python
from examples.lois_personnelles import PERSONAL_LAWS
from physique_graphes import dag

modele = dag.create_branch_active()
modele["edges"][0]["law"] = {
    "name": "rendement_constant", "parameters": {"eta": 0.9}
}
etat = dag.evaluate(modele, registry=PERSONAL_LAWS)
```

Une loi définie dans le carnet peut être transmise de la même façon par un dictionnaire `{nom: fonction}`. Les noms intégrés `identity`, `piecewise_response` et `piecewise_yield` sont réservés. Le JSON ne charge pas de module et n’évalue pas d’expression. Modifier une loi personnelle signifie modifier du code Python local ; après modification de ce fichier, relancer l’application ou le noyau du carnet pour repartir d’un registre à jour. Les preuves d’un préréglage ne s’appliquent pas automatiquement à ses lois modifiées.

## Ce qui est certifié, calculé ou seulement recherché

- **DAG et SciPy** : SLSQP est une recherche locale ; l’évolution différentielle explore un domaine borné. Les deux retournent un meilleur état trouvé, sans borne supérieure globale : `certified=False`, `upper_bound=None`. L’apport et les lois restent fixes ; seuls les partages binaires varient. Les références `7/32` et `143217/320000` sont propres aux modèles exacts documentés sur le site, pas des certificats produits par SciPy.
- **SLSQP et évolution différentielle pour les concordances** : ces recherches produisent des témoins pour le groupe choisi, sans certificat global. La première est locale ; la seconde explore plus largement selon sa graine et son budget. Les conditions de stationnarité sur une boîte sont nécessaires à un maximum régulier, jamais suffisantes pour le certifier.
- **Grille de concordances** : une grille complète de `d` divisions visite `(d+1)^n` points, avec n=5 pour les distributions, 7 pour les environnements ou 12 pour les concordances actives. Elle est exhaustive sur ces points, pas sur le continuum. Un budget insuffisant donne un résultat incomplet.
- **Intervalles de concordances** : à e et ε fixes, `search_global` encadre la recherche sur les **cinq distributions seulement**. Il rapporte un témoin, une borne supérieure et un écart. Le statut `certified` signifie que l’écart est inférieur à la tolérance demandée selon ses calculs d’intervalles arrondis vers l’extérieur. `node-limit` ou `uncertain` laissent une borne ouverte ; ils ne prouvent pas que le meilleur témoin est optimal. Les coupures fondées sur la positivité ne sont pas utilisées en signé. Ce certificat ne s’étend pas à la recherche sur e ou ε.
- **Lagrangien des concordances** : la formule à 26 coordonnées libres `q/X/Y` et 21 égalités est évaluée aux paramètres retenus. Sur les états compatibles, **L=Y8** ; hors contraintes, L n’est pas une production réalisable et peut montrer une selle. Les différentielles sur les parts, e ou ε intègrent les effets aval. Les adjoints à la référence ne sont pas un certificat global ; à une rupture, une sélection de sous-gradient n’est pas une dérivée classique affirmée.
- **Portée du portage** : le solveur global par PL de tous les régimes des huit machines, le solveur spatial des branches et leurs lagrangiens particuliers à 24 coordonnées ne sont pas portés ici. Les nappes Python des DAG montrent des états compatibles recalculés ; les nappes libres de `L` sont celles des concordances à 26 coordonnées. Un graphe visuellement bombé ou un gradient faible ne fournit pas de preuve supplémentaire.

Le carnet montre une nappe compatible et une coupe libre du lagrangien pour le même modèle signé, avec légendes distinctes. Les axes verticaux portent les valeurs numériques calculées, avec leur signe et sans soustraction de la valeur au centre ; leur cadrage peut agrandir visuellement un faible écart.

## Fichiers et vérifications

| Fichier | Rôle |
|---|---|
| [app.py](app.py) | Application Streamlit et éditeurs. |
| [ui_concordances.py](ui_concordances.py) | Page 04 : types indépendants, recherches, flux, dérivées et nappes. |
| [notebooks/01_explorer_les_graphes.ipynb](notebooks/01_explorer_les_graphes.ipynb) | Parcours reproductible : villes, dépendances, cycles, DAG, concordances. |
| [physique_graphes/reseaux.py](physique_graphes/reseaux.py) | Chemins et dépendances temporelles. |
| [physique_graphes/production.py](physique_graphes/production.py) | Machines en cycles synchrones. |
| [physique_graphes/dag.py](physique_graphes/dag.py), [lois.py](physique_graphes/lois.py) | Modèles de DAG et registre de lois. |
| [physique_graphes/optimisation.py](physique_graphes/optimisation.py) | Recherches SciPy sans certificat global. |
| [physique_graphes/concordances.py](physique_graphes/concordances.py) | Propagation nodale, recherches, intervalles et lagrangien. |
| [physique_graphes/types_concordances.py](physique_graphes/types_concordances.py) | Types de matrice et d’environnements, graines et provenance. |
| [physique_graphes/optimisation_concordances.py](physique_graphes/optimisation_concordances.py) | Groupes de variables, recherches et différentielles compatibles. |
| [physique_graphes/visualisation.py](physique_graphes/visualisation.py) | Figures Plotly partagées entre l’application et le carnet. |

Depuis le dossier `python/`, lancer les tests :

```powershell
.\.venv\Scripts\python.exe -m pytest tests -q
```

Les tests de parité avec les moteurs JavaScript utilisent Node.js lorsqu’il est disponible ; ce sont des contrôles de développement, pas une dépendance des calculs Python. Cette comparaison porte sur le domaine commun aux moteurs ; elle ne couvre pas l’extension Python aux environnements négatifs, vérifiée séparément. Le carnet est livré sans sorties enregistrées : **Exécuter toutes les cellules** les recrée avec vos paramètres. Les PDF privés et les extractions des ouvrages ne sont ni nécessaires à cet atelier ni inclus dans ce dossier.
