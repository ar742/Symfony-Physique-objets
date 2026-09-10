# Lagrangiens et surfaces du réseau de douze branches

Complément du 10 septembre 2026 à l’[optimisation des branches](OPTIMISATION-BRANCHES.md). L’auteur demande de voir le lagrangien effectivement utilisé et une surface à deux variables au voisinage d’un maximum. Ce document distingue le problème non linéaire du réseau, les relaxations linéaires calculées et la surface des productions réalisables.

Le modèle demeure celui des [fondements](FONDEMENTS-DU-PROJET.md) : chaque branche transforme son alimentation x en production y=x f(x), avec un rendement f dans [0,1]. La source vaut 1, les nœuds additionnent et répartissent intégralement, et r=y28+y48+y68≤1. Les paramètres, flux et valeurs représentés sont supposés ou calculés ; aucune mesure n’est introduite. La forme analytique des branches reste le [cas 1b](FORMES-ANALYSE.md).

## Trois objets à nommer séparément

| Objet | Variables et données fixées | Rôle |
| --- | --- | --- |
| Lagrangien du réseau non linéaire, L_NLP | Alimentations x, productions y ; lois et multiplicateurs d’égalités déclarés | Écrire les lois et les bilans dans une fonction ; il ne constitue pas à lui seul une résolution globale |
| Lagrangien d’une relaxation linéaire, L_PL | Variables z du sous-problème, avec ses vrais multiplicateurs λ fixés | Calculer une majoration de ce sous-problème, avec correction du résidu dual et marge |
| Surface réalisable R(s1,s2) | Deux partages indépendants ; autres partages et toutes les lois figés | Montrer comment varie la production recalculée, dans une coupe à deux dimensions du problème |

La troisième ligne fournit la nappe courbe recherchée. La deuxième expose l’usage effectif du lagrangien dans les calculs. Elles ne portent ni sur les mêmes variables ni sur le même domaine.

L’explorateur 3D distingue trois vues dans ce même cadre : la production réalisable suivant deux fractions, le plan du vrai lagrangien d’un PL suivant deux de ses variables, et la courbe des entrées couplées A2/A5 et de la production finale lorsque seul s1 varie. Le mode, les axes, les données figées et la provenance du résultat sont identifiés séparément.

## Lagrangien du problème non linéaire

Pour chaque arc e=i→j, écrire g_e(x_e)=x_e f_e(x_e). À lois fixées, les variables explicites sont les douze x_e et les douze y_e. Les contraintes de bilan sont :

```text
h_1(x,y) = 1 − x12 − x15 = 0
h_i(x,y) = Σ_(k→i) y_ki − Σ_(i→j) x_ij = 0     pour i=2,…,7
k_e(x,y) = g_e(x_e) − y_e = 0                  pour chacun des 12 arcs
r(y) = y28 + y48 + y68.
```

Les sommes ne portent que sur les arcs existants. Le nœud 8 est représenté par l’objectif, sans contrainte de sortie fictive. Les bornes 0≤x_e≤1 et 0≤y_e≤1 sont conservées dans le domaine D. On obtient, avec des multiplicateurs réels μ_i et ν_e libres de signe :

```text
L_NLP(x,y;μ,ν) = r(y) + Σ_(i=1..7) μ_i h_i(x,y)
                        + Σ_e ν_e [g_e(x_e)−y_e].
```

Ce choix de signe est explicite ; changer le signe d’une égalité et celui de son multiplicateur ne change pas son rôle. Il s’agit du lagrangien des égalités, les bornes restant dans D. Ajouter des multiplicateurs pour les inégalités produirait une autre écriture : leurs contributions ne s’annulent pas automatiquement à tout point admissible, mais seulement sous les conditions appropriées de complémentarité.

Sur un état qui respecte les bilans et les lois, les termes d’égalité s’annulent, donc **L_NLP=r**, quels que soient μ et ν. Cette identité ne prouve pas que l’état maximise r. Pour obtenir une borne par dualité dans cette convention de maximisation, il faudrait calculer ou majorer globalement :

```text
H(μ,ν) = sup_(x,y∈D) L_NLP(x,y;μ,ν) ≥ r_max.
```

Évaluer L_NLP en un seul point, annuler certaines dérivées ou dessiner une portion de sa surface ne calcule pas ce supremum. Les g_e sont quadratiques par morceaux et les égalités y_e=g_e(x_e) ne définissent généralement pas un ensemble convexe. Les conditions stationnaires ordinaires peuvent aussi manquer de sens à une cassure. Les définitions du lagrangien, de la dualité faible et les conditions de suffisance des KKT sont présentées dans les [diapositives officielles de Boyd et Vandenberghe, chapitre 5](https://web.stanford.edu/~boyd/cvxbook/bv_cvxslides.pdf), notamment aux pages PDF 156–157, 166 et 174–175. Leur convention est la minimisation ; les signes et bornes ci-dessus sont adaptés à notre maximisation.

L’application ne fabrique pas des μ ou ν à partir des multiplicateurs des programmes linéaires : ceux-ci appartiennent à d’autres contraintes, notamment aux tangentes et sécantes des relaxations.

## Le lagrangien réellement employé pour les bornes linéaires

Un sous-problème de la recherche spatiale retient certaines portions et certains intervalles des lois. Il remplace les courbes par des contraintes linéaires qui contiennent tous les points possibles de cette région. Le programme obtenu s’écrit :

```text
maximiser q0 + qᵀz
sous Az ≤ h et 0 ≤ z ≤ U.
```

Le vecteur z contient des flux de partage et les productions qui n’ont pas été éliminées. Il ne s’agit pas du vecteur des cinq fractions s. Les bilans sont exploités dans cette formulation ; les contraintes conservées, leur ordre et les bornes de boîte doivent accompagner les multiplicateurs.

Pour les multiplicateurs calculés λ≥0, le lagrangien est :

```text
L_PL(z;λ) = q0 + qᵀz + λᵀ(h−Az)
           = C + wᵀz
C = q0 + λᵀh ; w = q−Aᵀλ.
```

Chaque marge h_i−(Az)_i est non négative pour un point admissible de ce PL. Ainsi L_PL(z;λ)≥q0+qᵀz. En maximisant cette fonction affine sur la boîte explicite :

```text
B_brut = sup_(0≤z≤U) L_PL(z;λ)
       = C + Σ_j max(0,w_j) U_j.
B_certifié = B_brut + marge_numérique.
```

La partie positive de w compense un résidu dual éventuel. Cette formule ne suppose pas que w≤0 ait été exactement obtenu. Les contraintes de boîte ajoutées au PL peuvent aussi avoir leurs propres multiplicateurs ; leur présence dans le lagrangien et dans le domaine de ce supremum reste valide. Le calcul conserve q0 et les facteurs de normalisation. C’est une application de la dualité faible, expliquée dans les [diapositives de Boyd et Vandenberghe](https://web.stanford.edu/~boyd/cvxbook/bv_cvxslides.pdf), avec une correction explicite permise par les bornes U du modèle.

À λ fixé, L_PL est **affine en z**. Une coupe suivant deux coordonnées indépendantes de z est un plan, éventuellement horizontal. Son maximum sur une boîte se trouve sur un bord ou une face ; ce n’est pas la nappe courbe du réseau original. Un sommet du polytope admissible du PL et un sommet lisse d’une surface non linéaire sont également des objets différents.

Dans cette vue, les autres composantes de z restent fixées au point du meilleur état reconstruit, exprimé dans les variables de ce PL. Faire varier les deux coordonnées peut violer des contraintes Az≤h : ces parties du plan sont signalées comme hors contraintes. Elles peuvent servir à lire le lagrangien, mais elles ne représentent pas des configurations réalisables de la relaxation, encore moins du réseau. Les coordonnées doivent conserver leurs propres bornes U ; elles ne sont pas renommées s1 ou s2.

### Lire un diagnostic issu d’un calcul

Le diagnostic doit désigner un PL effectivement résolu et préciser sa région : identifiant du sous-problème, portions sélectionnées, intervalles, noms des variables et contraintes. Pour comparer au résultat retenu, choisir une relaxation contenant ce résultat à la tolérance annoncée. La lecture comporte :

- la matrice A, le second membre h, q, q0 et U ;
- les λ associés aux mêmes lignes, y compris les bornes de boîte ajoutées par le solveur ;
- le point effectivement calculé par le PL, distinct du point du réseau reconstruit ;
- les marges h−Az et les contributions λ_i[h_i−(Az)_i] à chacun des points examinés ;
- la valeur de l’objectif, celle de L_PL, les résidus, B_brut et la borne après marge.

Le solveur normalise ses lignes par des facteurs positifs. Pour afficher la matrice avant cette normalisation, il faut dénormaliser les multiplicateurs : λ_i=λ_i,normalisé/échelle_i. Le changement d’échelle de l’objectif est déjà rétabli dans les multiplicateurs du certificat ; il ne doit pas être appliqué une seconde fois.

La valeur du réseau reconstruite peut différer de l’objectif au point du PL : la relaxation autorise des points qui ne satisfont pas les lois complètes. La borne d’un sous-problème ne vaut que sur sa région. La borne globale résulte de la couverture de toutes les régions restantes ou écartées avec justification ; afficher un seul PL ne remplace pas cette couverture.

Lorsque la coupure source, la somme des maxima des trois branches terminales ou la borne universelle suffit avant tout PL, le diagnostic doit le dire et montrer ce certificat. Il n’existe alors aucun λ de PL à afficher pour cette exécution. L’interface expose le minimum de ces trois bornes directes et l’écart au rendement ; une fermeture par la borne terminale ne doit pas être attribuée à la source. C’est notamment possible pour les boîtes proposées, dont un témoin atteint r=0,9. La [spécification des branches](OPTIMISATION-BRANCHES.md) décrit `certificates.sourceCertificate`, les régions ouvertes, la tolérance et le statut numérique. Les nombres flottants et leurs marges restent distincts d’une preuve en arithmétique exacte.

Le module [branches-lagrangian.mjs](../app/public/scripts/branches-lagrangian.mjs) effectue cette inspection sans relancer d’optimisation. `explainBranchesLagrangian` utilise les PL enregistrés par [branches-engine.mjs](../app/public/scripts/branches-engine.mjs) et leur géométrie reconstruite ; `evaluateLagrangianPoint` calcule objectif, lagrangien, marges et résidus au point demandé. Les valeurs du certificat viennent du [solveur linéaire borné](../app/public/scripts/bounded-linear-program.mjs). Le diagnostic conserve séparément `atBest`, `atLp`, `upperBounds.relaxation`, `upperBounds.searchNode` et `upperBounds.global`.

Dans l’exécution initiale vérifiée le 10 septembre, le PL retenu porte l’identifiant 55, avec 15 variables et 136 contraintes. Après développement et arrondi des coefficients significatifs :

```text
L_PL(z;λ) ≈ 0,5443200576790044 − 1,242597656249766 x_2_3.
```

Les autres coefficients sont numériquement proches de zéro ; ils ne sont pas supprimés du calcul. Au meilleur état, x_2_3=0 et r≈0,5443200000000002, tandis que L_PL≈0,5443200576790044. Le supremum brut sur la boîte vaut environ 0,5443200576790074 ; le certificat après marge donne environ 0,5443200576807237. Cette différence illustre la distinction entre production, lagrangien de relaxation et borne corrigée. Les identifiants et nombres peuvent changer après modification du problème ou du calcul ; l’interface doit reprendre les données de l’exécution, sans réutiliser ces valeurs comme constantes.

## Une surface avec deux commandes indépendantes

Le premier choix pédagogique est :

```text
t = s1 : part de la source allouée à 1→2
v = s2 : part disponible en 2 allouée à 2→3
R(t,v) = production finale du réseau recalculé
         avec s1=t, s2=v et s3,s5,s7 fixés.
```

La part de 2 dirigée vers la sortie 8 vaut 1−v : accroître s2 ne signifie donc pas envoyer davantage directement vers 8. Chaque paire (t,v) appartient à [0,1]². Le calcul reconstruit successivement toutes les entrées et sorties dans l’ordre du graphe, avec y=x f(x). Il respecte ainsi les bilans ; les valeurs de l’état affiché peuvent être contrôlées indépendamment du maillage graphique.

Toutes les lois doivent rester fixées pendant cette coupe. Si l’état retenu provient d’une optimisation des paramètres, sa surface utilise ses douze quadruplets reconstruits et figés. Réoptimiser les paramètres ou les autres partages à chaque point produirait une autre fonction de valeur et demanderait un nouveau calcul sous contraintes à chaque point.

La surface se situe dans l’ensemble admissible défini par les lois et les bilans. Sur elle, le lagrangien d’égalités du réseau vaut R(t,v). Cela autorise la mention « production réalisable ; égale à L_NLP sur les contraintes d’égalité », mais pas l’affirmation que les multiplicateurs du PL ont créé ou optimisé directement cette nappe.

Le meilleur point d’une grille 3D est seulement le meilleur des points échantillonnés de cette coupe. Le marqueur du meilleur état trouvé par la recherche continue doit être évalué à ses coordonnées exactes, même s’il tombe entre les nœuds du maillage ; son statut et son écart de bornes déterminent si l’optimalité a été établie à la tolérance annoncée. Le domaine dessiné, les trois autres fractions, les lois et l’état de référence restent visibles. Un zoom près de la frontière est tronqué à [0,1] et ne crée pas de part négative.

Un résultat de la grille des cinq fractions ne se situe sur cette même coupe que si ses trois autres fractions sont identiques aux valeurs figées. Sinon, placer un marqueur « grille projetée » signifie reprendre seulement ses deux coordonnées, conserver les trois fractions de la coupe et **recalculer** sa hauteur. La valeur du résultat complet de grille doit alors rester distincte. Deux marqueurs ne comparent le même problème que si les douze lois et la source sont les mêmes.

### Pourquoi les entrées des nœuds 2 et 5 ne forment pas une surface indépendante

Si « Exp. IN 2 » et « Exp. IN 5 » désignent les sommes disponibles en ces nœuds, elles valent :

```text
A2 = g12(t)
A5 = g15(1−t),  0≤t≤1.
```

À source et lois fixées, le couple (A2,A5) décrit une **courbe paramétrée à une dimension**. En général A2+A5≤1 ; ce n’est pas le partage brut (t,1−t), car les rendements ont déjà été appliqués. La courbe peut comporter des portions nulles ou ne pas identifier t de façon unique. Un rectangle de valeurs arbitraires A2/A5 contiendrait des couples sans partage source compatible.

Ces quantités peuvent être affichées comme conséquences des réglages ou dans un graphique de raccord. Pour obtenir deux axes d’alimentation indépendants, il faudrait modifier explicitement le problème, par exemple ajouter un apport indépendant ; ce n’est pas le modèle actuel.

La troisième vue représente précisément la courbe 3D `(A2(s1), A5(s1), r(s1))`. Les quatre autres fractions et les douze lois y sont figées. La troisième coordonnée donne la production finale du réseau recalculé ; elle ne crée pas une deuxième commande indépendante. Chaque point conserve sa valeur de s1, notamment si la projection dans le plan A2/A5 est ambiguë. Cette vue explique le couplage des entrées, sans remplir artificiellement le rectangle A2×A5.

### Autres choix d’axes possibles

| Axes | Sens | Limite à annoncer |
| --- | --- | --- |
| s1 et s2 | Partage source et bifurcation du chemin court | Choix utile près des maxima fixes présentés ci-dessous |
| Deux autres fractions parmi les cinq | Coupe de commandes indépendantes | Une fraction d’un nœud non alimenté peut donner une direction parfaitement plate |
| Deux paramètres de loi | Étude de conception à autres données fixées | Domaine admissible à contrôler ; ce n’est plus le même problème à lois fixées |
| Deux coordonnées z d’un PL | Plan affine L_PL à λ fixé | Montrer aussi les contraintes de la relaxation ; ce n’est pas une production de réseau reconstruite |

Un choix d’axes est une déclaration de la question examinée. Il ne constitue pas une réduction équivalente de toute l’optimisation à deux variables.

## Exemples près des maxima à lois fixées

### Valeurs initiales : s1=0,8, s2=0

Les douze lois valent `(a,b,c,d)=(0,3 ; 0,8 ; 0,9 ; 0,6)`. Le chemin 1→2→8 reçoit x12=0,8 puis x28=0,72 et donne r=0,54432. L’autre branche source reçoit 0,2, sous son seuil. Les autres fractions peuvent être figées aux valeurs du résultat retenu.

Au voisinage de ce point, les autres routes sont inactives et la surface s’écrit :

```text
R(t,v) = g((1−v)g(t)).
```

Le maximum est à la frontière v=0. En t=0,8, g change de portion ; la nappe a une cassure et non un sommet intérieur lisse. Les dérivées unilatérales calculées au point sont :

```text
∂R/∂t à gauche  = +4,80168
∂R/∂t à droite  = −0,6156
∂R/∂v vers v>0  = −1,47744.
```

Elles décrivent une augmentation vers la cassure puis une diminution, et une diminution lorsqu’on quitte la frontière par une direction admissible. Une différence centrée en t qui traverse la cassure n’est pas une dérivée ordinaire ; une différence centrée en v demanderait un partage négatif. Ces signes sont des diagnostics locaux. La preuve globale r≤0,54432 est donnée séparément dans les [repères analytiques](OPTIMISATION-BRANCHES.md#repères-analytiques-pour-les-deux-domaines-proposés).

### Variante b=0,83

Les autres paramètres restent a=0,3, c=0,9, d=0,6, sur les douze branches. Avec s1=0,83 et s2=0 :

```text
x12 = 0,83 ; y12 = 0,747
x28 = 0,747 ; y28 ≈ 0,567015283018868.
```

Cette configuration fournit le résultat continu vérifié, accompagné de la borne du calcul global. Le maximum se situe encore sur v=0 et à la cassure t=b. Un maillage au pas 0,1 ne contient pas t=0,83 : le meilleur point de cette grille peut donc être plus bas. La surface doit distinguer son maillage de représentation, le marqueur exact du résultat et l’écart des bornes du solveur.

## Ce qu’un diagnostic de maximum peut conclure

Un point peut être à la frontière du domaine des commandes, à une cassure de loi, sur une direction plate ou à l’intérieur d’une portion différentiable. Ces situations doivent être distinguées avant de demander un gradient ou une courbure. Pour une portion différentiable et un maximum intérieur isolé, une annulation du gradient est un contrôle local attendu ; elle ne démontre pas l’optimalité globale du réseau non convexe. À la frontière ou à une cassure, examiner les directions admissibles et les dérivées unilatérales pertinentes.

Un zoom et son maillage décrivent les variations locales de la coupe. Une direction plate peut simplement correspondre à un nœud sans alimentation ; elle ne signifie pas que toute modification du réseau est indifférente. Un maximum apparent dans la coupe ne prouve rien sur les trois fractions figées ni sur des paramètres tenus constants. La portée globale vient des bornes et de leur couverture, ou d’une preuve analytique séparée du scénario.

L’échelle verticale garde les repères 0 et1 pour situer la production par rapport à la source. Elle ne doit pas transformer un écart numérique minuscule en relief spectaculaire. En mode L_PL, des valeurs hors[0,1] restent toutefois possibles, particulièrement hors des contraintes ; l’échelle s’étend pour les montrer et ne les écrête pas. Les nombres, résidus et étiquettes du diagnostic permettent de lire un plan presque horizontal même si son relief est visuellement faible.

Le lagrangien du réseau, la dualité des PL, les surfaces de production et leurs contrôles restent donc liés par leurs contraintes et leurs résultats identifiables. Aucune entropie, temporalité, énergie conservée ni mesure industrielle supplémentaire n’est déduite de leur représentation. Les références officielles ont été consultées le 10 septembre 2026 ; les équations et exemples propres à ce réseau sont des dérivations du modèle du projet.
