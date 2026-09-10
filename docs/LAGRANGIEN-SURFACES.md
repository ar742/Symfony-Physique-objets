# Lagrangiens et surfaces du réseau de douze branches

Complément du 10 septembre 2026 à l’[optimisation des branches](OPTIMISATION-BRANCHES.md). L’auteur demande de voir le lagrangien effectivement utilisé et une surface à deux variables au voisinage d’un maximum. Ce document distingue le problème non linéaire du réseau, les relaxations linéaires calculées et la surface des productions réalisables.

Le modèle demeure celui des [fondements](FONDEMENTS-DU-PROJET.md) : chaque branche transforme son alimentation x en production y=x f(x), avec un rendement f dans [0,1]. La source vaut 1, les nœuds additionnent et répartissent intégralement, et r=y28+y48+y68≤1. Les paramètres, flux et valeurs représentés sont supposés ou calculés ; aucune mesure n’est introduite. La forme analytique des branches reste le [cas 1b](FORMES-ANALYSE.md).

## Trois objets à nommer séparément

| Objet | Variables et données fixées | Rôle |
| --- | --- | --- |
| Lagrangien du réseau non linéaire, L_NLP | Alimentations x, productions y ; lois et multiplicateurs d’égalités déclarés | Écrire les lois et les bilans dans une fonction ; il ne constitue pas à lui seul une résolution globale |
| Lagrangien d’une relaxation linéaire, L_PL | Variables z du sous-problème, avec ses vrais multiplicateurs λ fixés | Calculer une majoration de ce sous-problème, avec correction du résidu dual et marge |
| Surface réalisable de rendement | Deux alimentations de branche ou deux fractions ; autres partages et toutes les lois figés | Montrer comment varie la production recalculée, dans une coupe à deux dimensions du problème |

La troisième ligne fournit la nappe courbe recherchée. La deuxième expose l’usage effectif du lagrangien dans les calculs. Elles ne portent ni sur les mêmes variables ni sur le même domaine.

L’explorateur distingue la surface de rendement suivant les alimentations u=x12 et v=x23, les coupes suivant deux fractions et le plan du vrai lagrangien d’un PL. La courbe couplée A2/A5 de la première version n’est plus un mode de l’interface. Le voisinage initial est resserré autour du meilleur résultat, avec un rayon de 0,03, un zoom vertical local explicitement annoncé, des coupes orthogonales et un tableau de voisins. L’échelle globale reste disponible. Le mode, les axes, les données figées et la provenance du résultat sont identifiés séparément.

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

## La vue locale suivant deux alimentations de branche

Les axes de cette vue sont deux alimentations allouées à des branches identifiées :

```text
u = x12                 entrée de la branche 1→2
v = x23                 entrée de la branche 2→3
A2 = g12(u)             somme reçue au nœud 2
x28 = A2−v              alimentation restante de la branche 2→8
0≤u≤1 ; 0≤v≤g12(u).
```

Ce domaine possède deux dimensions lorsque g12(u)>0, mais ce n’est pas tout le rectangle [0,1]² : la branche 2→3 ne peut recevoir davantage que la somme disponible au nœud 2. La vue signale les couples incompatibles ; elle ne les écrête pas et ne leur attribue aucune production.

La reconstruction utilise s1=u, puis s2=v/g12(u) lorsque g12(u)>0. Les fractions s3, s5, s7 et les douze lois restent fixées à celles de l’état de référence. Si g12(u)=0, seul v=0 est admissible ; s2 n’est alors pas identifié par les flux et conserve la valeur de référence, sans effet sur les productions nulles. Le réseau est ensuite entièrement recalculé, ce qui définit R_f(u,v).

**L’entrée d’une branche et la somme d’un nœud ne sont pas interchangeables.** Au résultat initial, u=x12=0,8, tandis que A2=y12=0,72. Le rendement de 1→2 a déjà été appliqué dans A2. L’autre axe est v=x23=0 ; il ne désigne ni A2 ni une entrée du nœud 7.

Les coupes suivant deux fractions restent disponibles séparément. Par exemple R_s(t,w) utilise t=s1, w=s2 et recalcule le réseau, à s3,s5,s7 fixés. Les deux descriptions sont reliées par u=t et v=w g12(t). Elles ne donnent donc pas les mêmes dérivées ni les mêmes graduations sur leur deuxième axe. Augmenter v ou s2 oriente une alimentation supplémentaire vers 2→3 et diminue celle dirigée directement vers 8.

### Référence, paramètres et marqueurs

Toutes les lois restent fixées pendant une coupe. Si la référence provient d’une optimisation des paramètres, elle fournit ses douze quadruplets reconstruits et figés. Réoptimiser les paramètres ou les autres partages à chaque point produirait une autre fonction de valeur et demanderait un nouveau calcul sous contraintes à chaque point.

Sur les points recalculés admissibles, les égalités de bilan et de loi sont satisfaites, donc L_NLP=r. Cette identité ne transforme pas la surface de rendement en plan du lagrangien des PL et ne fournit pas des multiplicateurs du réseau original.

Après le calcul, le voisinage est centré sur le meilleur résultat retenu, avec ses coordonnées exactes ; le réglage local initial est de 0,03 de chaque côté, tronqué aux bornes et à l’admissibilité. Le maillage sert à représenter la surface, pas à retrouver artificiellement son sommet. Le statut de recherche et l’écart des bornes déterminent si ce résultat est certifié à la tolérance annoncée ou reste le meilleur état connu après un arrêt.

Un résultat de grille appartient à la même coupe si les trois fractions non explorées sont celles de la référence. Sinon, son marqueur reprend ses deux coordonnées, conserve les trois fractions figées et **recalcule** sa hauteur ; il est qualifié de projection. Dans la vue des flux, les coordonnées reprises sont ses x12 et x23. La valeur du résultat complet de grille reste distincte. Deux marqueurs ne comparent le même problème que si les douze lois et la source sont identiques.

## Pourquoi A2 et A7 ne donnent pas la nappe attendue près de ce résultat

Si « Exp. IN 2 » et « Exp. IN 7 » désignent les sommes disponibles aux nœuds, leurs valeurs sont :

```text
A2 = g12(s1)
A5 = g15(1−s1)
A7 = g57((1−s5) A5).
```

Avec les lois initiales, a=0,3. Au meilleur partage s1=0,8, la branche 1→5 reçoit 0,2 et produit zéro. Plus généralement, dès que s1>0,7, son entrée est inférieure au seuil : A5=0 et **A7=0**, quelle que soit s5. Un voisinage resserré autour de s1=0,8 ne peut donc faire varier A7 comme une deuxième entrée indépendante.

Si s2 et les autres commandes restent fixés, les points admissibles se réduisent localement à une courbe avec A7=0. Pour s2=0, r=g28(A2) près de A2=0,72 ; cette fonction est croissante et le maximum est au bord A2=0,72. Une représentation fidèle ne peut transformer ce bord en dôme lisse intérieur.

Si s2 varie aussi, A2 et A7 ne déterminent même plus r à eux seuls : pour (A2,A7)=(0,72 ; 0), s2=0 donne r=0,54432, tandis que s2=0,1 donne r=0,4059072. Il faut donc déclarer les commandes fixées avant de parler d’une fonction r(A2,A7). Cela motive les axes de branche u=x12 et v=x23, dont le domaine et les conséquences sont explicitement calculés.

Le couple A2/A5 de la première version était lui aussi couplé : à lois et source fixées, (g12(s1),g15(1−s1)) ne dépend que d’une commande. L’interface n’en propose plus une vue 3D autonome. Ces dépendances restent des propriétés du réseau, et non des alimentations externes que l’on pourrait régler librement.

## Exemples près des maxima à lois fixées

### Valeurs initiales : u=0,8, v=0

Les douze lois valent `(a,b,c,d)=(0,3 ; 0,8 ; 0,9 ; 0,6)`. Le chemin 1→2→8 reçoit x12=0,8 puis x28=0,72 et donne r=0,54432. L’autre branche source reçoit 0,2, sous son seuil. Les autres fractions peuvent être figées aux valeurs du résultat retenu.

Au voisinage de ce point, les autres routes sont inactives et la surface des alimentations s’écrit :

```text
R_f(u,v) = g28(g12(u)−v).
```

Le maximum est à la frontière v=0. En u=0,8, g12 change de portion ; la nappe a une cassure et non un sommet intérieur lisse. Les dérivées unilatérales calculées au point sont :

```text
∂R_f/∂u à gauche  = +4,80168
∂R_f/∂u à droite  = −0,6156
∂R_f/∂v vers v>0  = −2,052.
```

Elles décrivent une augmentation vers la cassure puis une diminution, et une diminution lorsqu’on quitte la frontière par une direction admissible. Une différence centrée en u traverse la cassure ; une différence centrée en v demanderait une alimentation négative. Dans la vue des fractions, la dérivée suivant s2 vaut plutôt −1,47744, car v=s2 A2. Ces signes sont des diagnostics locaux. La preuve globale r≤0,54432 est donnée séparément dans les [repères analytiques](OPTIMISATION-BRANCHES.md#repères-analytiques-pour-les-deux-domaines-proposés).

### Coupes orthogonales et voisins

Deux courbes passent par le point de référence : R_f(u,v*) à v fixé, puis R_f(u*,v) à u fixé. Elles respectent le domaine admissible et permettent de lire le changement de pente ainsi que le bord v=0. Le tableau de voisins examine le centre et les déplacements ±rayon/3 sur chaque axe ; un voisin incompatible est nommé comme tel, sans inventer une valeur de r.

Avec le rayon initial 0,03, ces déplacements valent 0,01. Pour les lois initiales :

| Position | u | v | Rendement calculé |
| --- | ---: | ---: | ---: |
| Centre | 0,80 | 0 | 0,54432 |
| Voisin à gauche | 0,79 | 0 | 0,49764306312 |
| Voisin à droite | 0,81 | 0 | 0,5378740605 |
| Voisin vers v positif | 0,80 | 0,01 | 0,52398 |
| Voisin vers v négatif | 0,80 | −0,01 | Incompatible |

Ces nombres montrent que les voisins admissibles sont plus bas. Ils ne démontrent pas à eux seuls qu’aucun autre maximum n’existe ailleurs dans le réseau. Les coupes et le tableau complètent la surface ; ils ne sont pas des calculs de gradient à une cassure.

### Variante b=0,83

Les autres paramètres restent a=0,3, c=0,9, d=0,6, sur les douze branches. Avec s1=0,83 et s2=0 :

```text
x12 = 0,83 ; y12 = 0,747
x28 = 0,747 ; y28 ≈ 0,567015283018868.
```

Cette configuration fournit le résultat continu vérifié, accompagné de la borne du calcul global. Dans les coordonnées des alimentations, u=0,83 et v=0. Le maximum se situe encore sur v=0 et à la cassure u=b. Un maillage de fractions au pas 0,1 ne contient pas s1=0,83 : le meilleur point de cette grille peut donc être plus bas. La surface doit distinguer son maillage de représentation, le marqueur exact du résultat et l’écart des bornes du solveur.

## Ce qu’un diagnostic de maximum peut conclure

Un point peut être à la frontière du domaine des commandes, à une cassure de loi, sur une direction plate ou à l’intérieur d’une portion différentiable. Ces situations doivent être distinguées avant de demander un gradient ou une courbure. Pour une portion différentiable et un maximum intérieur isolé, une annulation du gradient est un contrôle local attendu ; elle ne démontre pas l’optimalité globale du réseau non convexe. À la frontière ou à une cassure, examiner les directions admissibles et les dérivées unilatérales pertinentes.

Un zoom et son maillage décrivent les variations locales de la coupe. Une direction plate peut simplement correspondre à un nœud sans alimentation ; elle ne signifie pas que toute modification du réseau est indifférente. Un maximum apparent dans la coupe ne prouve rien sur les trois fractions figées ni sur des paramètres tenus constants. La portée globale vient des bornes et de leur couverture, ou d’une preuve analytique séparée du scénario.

### Zoom vertical local et échelle globale

Le zoom vertical local est proposé explicitement pour lire les différences près du résultat. L’axe porte les valeurs absolues de r et l’intervalle affiché ; le mot « local » indique que son origine peut être différente de zéro. Une marge de 10 % autour des valeurs et une étendue minimale de 10⁻⁴ évitent un cadrage dégénéré ou l’amplification d’un simple bruit d’arrondi. La référence au rendement maximal universel 1 reste annoncée, sans forcer 0 et1 à appartenir à ce cadrage local.

Le mode global conserve au contraire les repères 0 et1. Pour L_PL, les deux modes s’étendent aux valeurs calculées pertinentes, y compris hors[0,1] ; ils ne les écrêtent pas. Les parties hors contraintes restent identifiées. Un zoom est un changement d’échelle, pas une modification des valeurs ou de la courbure : il peut rendre la cassure plus lisible, mais ne transforme pas un plan en dôme ni un maximum de frontière en maximum intérieur. Les nombres et les résidus permettent de contrôler ce que montre le relief.

Le lagrangien du réseau, la dualité des PL, les surfaces de production et leurs contrôles restent donc liés par leurs contraintes et leurs résultats identifiables. Aucune entropie, temporalité, énergie conservée ni mesure industrielle supplémentaire n’est déduite de leur représentation. Les références officielles ont été consultées le 10 septembre 2026 ; les équations et exemples propres à ce réseau sont des dérivations du modèle du projet.
