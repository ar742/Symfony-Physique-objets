# Un réseau, un maximum global et plusieurs nappes

Référence du 11 septembre 2026 pour le **premier des deux préréglages** de l’atelier `/graphes/production/branches`, dont le maximum à lois fixées vaut **7/32 = 0,21875**. Le [préréglage complémentaire à douze branches actives](EXEMPLE-ACTIF-BRANCHES.md) atteint 0,447553125 ; ses sommes reçues aux nœuds 2 à 8 sont proches au départ, source exclue, sans renormalisation. Les lois et les preuves des deux cas restent distinctes. Les anciens exemples donnant 0,54432, la variante b=0,83 et le bouton de construction libre restent retirés de cette interface ; leurs développements demeurent dans les documents historiques.

Les valeurs sont des données fictives de modèle et des résultats calculés. Ce réseau abstrait ne décrit pas une installation industrielle mesurée. Il respecte les [fondements du projet](FONDEMENTS-DU-PROJET.md) : chaque branche constitue un système Exp. IN → TH → Exp. OUT, [cas 1b](FORMES-ANALYSE.md). Les nœuds raccordent les branches ; ils ne portent aucune fonction de fabrication.

## Les lois et les partages du problème

La source 1 fournit exactement 1. Pour une branche e=i→j, xₑ est son alimentation allouée, fₑ(xₑ) son coefficient de rendement et yₑ=gₑ(xₑ)=xₑfₑ(xₑ) sa production. Le nœud additionne les productions reçues puis partage entièrement cette somme. Le résultat est r=y28+y48+y68. Comme 0≤fₑ≤1, chaque branche vérifie 0≤yₑ≤xₑ et le réseau vérifie r≤1. Les pertes se somment : Σₑ(xₑ−yₑ)=1−r.

Les lois de coefficient sont continues par morceaux : zéro jusqu’à a, segment montant jusqu’à (b,c), puis segment jusqu’à (1,d), avec 0≤a<b<1 et 0≤d≤c≤1. Le paramètre b situe le maximum du **coefficient** ; il ne situe pas nécessairement celui de la **production** x f(x).

| Branches | a | b | c | d | Production sur [0,1] |
| --- | ---: | ---: | ---: | ---: | --- |
| 1→2 | 0 | 0,1 | 0,9 | 0 | P(x)=9x² pour x≤0,1 ; P(x)=x(1−x) ensuite |
| 1→5 | 0 | 0,1 | 0 | 0 | g15(x)=0 |
| 2→3 et 2→8 | 0 | 0,01 | 0,99 | 0 | Q(x)=99x² pour x≤0,01 ; Q(x)=x(1−x) ensuite |
| 5→3, 5→7, 7→6, 7→4, 3→4, 3→6, 4→8, 6→8 | 0 | 0,001 | 1 | 1 | T(x)=1000x² pour x≤0,001 ; T(x)=x ensuite |

Les formules coïncident aux raccords. Les huit lois T conservent leur portion initiale : une petite entrée positive inférieure à 0,001 subit une perte. La branche 1→5 reçoit une allocation, mais ne fournit jamais de production ; « inactive » ne signifie donc pas que son entrée est nulle.

Les cinq commandes appartiennent à [0,1] : s1 alloue une fraction vers 1→2, s2 vers 2→3, s5 vers 5→3, s3 vers 3→4, s7 vers 7→6. Le complément va à l’autre branche sortante du même nœud. En 4 et 6, l’unique sortie reçoit toute la somme disponible.

### Le témoin initial, avant toute recherche

Le départ est s1=s2=s5=s7=1/2 et s3=1. **Il est déjà optimal.** La recherche globale vérifie une borne sans recevoir la preuve analytique comme certificat ; la grille évalue ses propres configurations.

| Nœud | Somme reçue | Allocations x | Productions y |
| --- | ---: | --- | --- |
| 1 | 1, source imposée | x12=x15=0,5 | y12=0,25 ; y15=0 |
| 2 | 0,25 | x23=x28=0,125 | y23=y28=7/64=0,109375 |
| 5 | 0 | x53=x57=0 | y53=y57=0 |
| 3 | 0,109375 | x34=0,109375 ; x36=0 | y34=0,109375 ; y36=0 |
| 7 | 0 | x76=x74=0 | y76=y74=0 |
| 4 | 0,109375 | x48=0,109375 | y48=0,109375 |
| 6 | 0 | x68=0 | y68=0 |
| 8 | 0,21875 | Aucune sortie | r=y28+y48+y68=7/32 |

Ainsi, x12=0,5 est l’entrée de la branche 1→2 ; la somme reçue au **nœud 2** vaut y12=0,25. Ce sont deux positions différentes. Les pertes de la configuration totalisent 25/32=0,78125.

## Ce que signifie « global »

La question principale maximise r sur **tous les cinq partages**, avec les douze lois du tableau fixées. L’ordre topologique détermine ensuite tous les flux. Toute configuration compatible en flux peut être représentée par ces partages ; si un nœud reçoit zéro, ses fractions ne sont pas identifiables et ne changent pas ses flux nuls.

La borne se démontre directement. Posons A=P(u), u=x12, v=x23. Pour 0≤u≤1, P(u)≤u(1−u)≤1/4 ; pour 0≤t≤1, Q(t)≤t(1−t). Dans les portions proches de zéro, l’écart avec cette parabole vaut x(1−x/b)≥0. Les transmissions aval n’amplifient jamais la production et 1→5 ne fournit rien. Pour tout partage :

```text
r ≤ Q(v)+Q(A−v)
  ≤ A−v²−(A−v)²
  = A−A²/2−2(v−A/2)²
  ≤ A−A²/2 ≤ 7/32.
```

La dernière fonction est croissante pour A∈[0,1/4]. Le témoin du tableau atteint cette borne. C’est une preuve globale pour ce modèle, indépendante d’un maillage et de la seule annulation d’un gradient.

Le maximum n’est **pas unique dans les cinq fractions**. Il impose s1=s2=1/2, mais s5 et s7 sont libres puisque les nœuds 5 et 7 ne reçoivent rien. À la sortie de 2→3, les 7/64 peuvent prendre une seule route sans perte, s3=0 ou 1, ou être partagés en deux parts au moins égales à 0,001 :

```text
s3 ∈ {0,1} ∪ [8/875 ; 867/875].
```

Une petite part strictement comprise entre 0 et 0,001 diminue r. L’isolement du sommet dans une coupe de deux variables n’implique donc pas l’isolement de la configuration entière.

## Le vrai lagrangien du réseau non linéaire

Les variables explicites sont les douze entrées xₑ et les douze sorties yₑ, dans D=[0,1]²⁴. Définissons les sept bilans et les douze lois :

```text
h1 = 1−x12−x15,
hi = Σ_(k→i) yki − Σ_(i→j) xij, pour i=2,…,7,
ke = ge(xe)−ye.
```

Le nœud 8 intervient dans l’objectif r. Avec cette convention de signes, μ et ν sont libres en signe :

```text
L_NLP(x,y;μ,ν) = y28+y48+y68 + Σ_(i=1..7) μi hi + Σ_e νe [ge(xe)−ye].
```

Sur chaque configuration compatible, h=k=0 et L_NLP=r. Pour n’importe quels μ et ν fixés, une majoration de L sur **tout D**, y compris les points incompatibles, majore donc le rendement réalisable maximal. C’est la dualité faible, écrite ici pour une maximisation. Elle n’exige pas que ce réseau soit convexe. Les conventions et le principe général sont exposés dans le chapitre 5 des [diapositives officielles de Boyd et Vandenberghe](https://web.stanford.edu/~boyd/cvxbook/bv_cvxslides.pdf).

### Des multiplicateurs analytiques qui ferment exactement la borne

Pour les lois précises du tableau, choisir :

```text
μ1=0 ; μ2=3/4 ; μ3=μ4=μ5=μ6=μ7=1,
ν12=3/4 ; tous les autres νe=1.
```

Ces coefficients sont construits pour ce problème. Ils ne sont pas empruntés à une relaxation linéaire. Tous les coefficients des variables y se compensent. En notant E_T les huit branches de transmission :

```text
L_NLP = (3/4)P(x12)
      + [Q(x23)−(3/4)x23] + [Q(x28)−(3/4)x28]
      + Σ_(e∈E_T) [T(xe)−xe].
```

Le terme g15(x15) est nul. Sur [0,1], les trois majorations séparées sont :

```text
(3/4)P(x) ≤ 3/16,
Q(x)−(3/4)x ≤ x/4−x² = 1/64−(x−1/8)² ≤ 1/64,
T(x)−x ≤ 0.
```

Elles incluent les portions initiales des lois. Il en résulte **L_NLP≤7/32 pour tout D**. Au témoin, x12=1/2, x23=x28=1/8 et chaque transmission est soit nulle, soit sans perte : L_NLP=r=7/32. Le supremum du lagrangien pour ces multiplicateurs est donc exactement égal à l’optimum primal. Cette égalité est démontrée pour ce cas ; aucune dualité forte générale des réseaux non convexes n’est présumée.

L ne dépend plus des douze y ni de x15. Les transmissions ont également plusieurs maximisants : x=0 ou x∈[0,001;1]. Le maximum de L dans ses 24 variables n’est pas un sommet isolé.

### Dérivées complètes et bornes actives

Sur une portion différentiable, pour e=i→j :

```text
∂L/∂xij = νij g′ij(xij)−μi,
∂L/∂yij = μj−νij              si j≠8,
∂L/∂yi8 = 1−νi8,
∂L/∂μi = hi ; ∂L/∂νe = ke.
```

Toutes les dérivées en y sont nulles pour les multiplicateurs retenus. Au témoin, P′(1/2)=0, Q′(1/8)=3/4 et T′(7/64)=1 : les dérivées des entrées positives sont nulles. Les six entrées de transmission x53,x57,x76,x74,x36,x68 valent zéro et ont une dérivée libre **−1**. Cela convient à un maximum sur leur borne inférieure : la seule direction admissible immédiate augmente x et fait diminuer L.

Pour expliciter ces bornes avec z=(x,y), écrire L+αᵀz+βᵀ(1−z), α,β≥0. Au témoin, α=1 pour les six entrées précédentes, α=0 ailleurs et β=0. Le gradient corrigé est nul et la complémentarité est satisfaite. Cette stationnarité sous contraintes accompagne la preuve ; elle ne la remplace pas. Au coude d’une loi, les dérivées gauche et droite sont examinées séparément. Le programme renvoie une dérivée non définie plutôt que de fabriquer un zéro.

## Les deux nappes de rendement compatible

Dans ces vues, les flux et les sorties sont recalculés en respectant les bilans et les lois à chaque point. L_NLP restreint à ces configurations vaut r. On fixe s3=1, s5=s7=1/2 pour les expressions de référence suivantes ; d’autres s3 sans perte sont possibles, mais les seuils aval doivent être revérifiés au point considéré.

### Deux entrées de branche : u=x12 et v=x23

Le domaine physique est 0≤u≤1 et 0≤v≤P(u). Lorsque u>0,1, v>0,01, p−v>0,01 et Q(v)>0,001, avec p=u(1−u), la route 3→4→8 transmet sans perte et :

```text
R(u,v)=p−v²−(p−v)²,
∂R/∂u=(1−2p+2v)(1−2u),
∂R/∂v=2p−4v.
```

En (u*,v*)=(1/2,1/8), les deux dérivées s’annulent et la Hessienne vaut diag(−3/2,−4), définie négative. Le maximum est donc intérieur et strict dans cette coupe. Le rectangle u∈[0,4;0,6], v∈[0,025;0,225] reste dans les portions annoncées : p≥0,24, p−v≥0,015 et Q(v)≥0,024375.

### Deux fractions : s=s1 et t=s2

Les entrées de 2→3 et 2→8 deviennent pt et p(1−t), où p=s(1−s). Dans les portions paraboliques et avec les transmissions aval sans perte, poser K=t²+(1−t)² :

```text
S(s,t)=p−p²K,
∂S/∂s=(1−2pK)(1−2s),
∂S/∂t=2p²(1−2t).
```

En (s*,t*)=(1/2,1/2), les deux dérivées sont nulles et la Hessienne vaut diag(−3/2,−1/4). Les deux coupes ont la même valeur maximale, avec des courbures différentes parce qu’elles utilisent des coordonnées différentes. L’ordre des composantes du gradient et des lignes/colonnes de la Hessienne suit celui des axes affichés, y compris s2 puis s1.

Les formules ne sont pas appliquées hors de leurs portions. Le module vérifie les entrées des trois branches paraboliques et chacune des branches aval. Une égalité de seuil peut permettre la bonne valeur sans permettre une Hessienne locale lisse. Les couples comportant s5 ou s7 ont une direction inactive. Un couple faisant varier s3 peut montrer des plateaux, des cassures, voire un maximum de frontière près de 0 ou 1 ; il ne reçoit pas automatiquement la formule du sommet intérieur (s1,s2).

## Les trois nappes libres du lagrangien exact

On fixe μ et ν aux valeurs démontrées, puis **22 des 24 variables** aux valeurs du témoin. On fait varier indépendamment deux entrées choisies parmi x12,x23,x28. Les bilans et les lois ne sont pas réappliqués. Un point hors contraintes représente donc L_NLP, **pas** le rendement d’un réseau réalisable. Il respecte cependant la borne L_NLP≤7/32 sur D.

Dans le voisinage parabolique, x et y désignent les deux axes du tableau :

| Axes | L_NLP(x,y) | Gradient | Point stationnaire | Hessienne |
| --- | --- | --- | --- | --- |
| x12, x23 | ¾x(1−x)+¼y−y²+1/64 | (¾−3x/2, ¼−2y) | (1/2,1/8) | diag(−3/2,−2) |
| x12, x28 | ¾x(1−x)+¼y−y²+1/64 | (¾−3x/2, ¼−2y) | (1/2,1/8) | diag(−3/2,−2) |
| x23, x28 | 3/16+¼(x+y)−x²−y² | (¼−2x, ¼−2y) | (1/8,1/8) | diag(−2,−2) |

Chaque substitution du point stationnaire annule les deux dérivées et donne L=7/32. Les deux premières expressions exigent x>0,1 et y>0,01 ; la troisième x,y>0,01. Le calcul de la surface utilise les lois complètes lorsque la fenêtre dépasse ces portions. Les dérivées deviennent 13,5x pour le terme ¾P(x) avant 0,1, et 198x−¾ pour le terme Q(x)−¾x avant 0,01. Aux raccords, elles ne coïncident pas.

Ces trois Hessiennes diffèrent de celles des rendements compatibles R et S. Dans R, par exemple, modifier v entraîne aussi x28=p−v et la propagation aval ; dans une coupe libre L(x12,x23), x28 et les sorties y restent fixes. Si la référence est une autre configuration que le témoin, les autres coordonnées restent celles de cette référence : la constante additive change, et le sommet de la coupe n’atteint pas nécessairement 7/32.

## Le calcul global et ses relaxations restent indépendants

Le moteur optimise les cinq partages avec ses bornes de productions quadratiques par morceaux, ses relaxations linéaires et ses subdivisions spatiales. Il ne lit ni les métadonnées de sommet ni le certificat analytique précédent. La grille parcourt un ensemble fini annoncé ; un arrêt au budget ne devient pas une exploration exhaustive. Les bornes, l’écart et le statut numérique restent consultables. Le principe de subdivision et de bornes est présenté dans les [notes officielles de Stanford sur la méthode branch and bound](https://stanford.edu/class/ee364b/lectures/bb_notes.pdf).

Pour un PL réellement résolu, max(q₀+qᵀz) sous Az≤h et 0≤z≤U, son lagrangien utilise ses propres multiplicateurs λ≥0 :

```text
L_PL(z;λ)=q₀+qᵀz+λᵀ(h−Az),
sup_(0≤z≤U) L_PL = q₀+λᵀh+Σ_j max(0,qj−(Aᵀλ)j) Uj.
```

À λ fixé, L_PL est affine : ses dérivées sont constantes. Il n’est pas l’une des trois nappes courbes du lagrangien non linéaire. Le diagnostic conserve la provenance du PL, les multiplicateurs, les résidus, les marges numériques et la région couverte. Une seule relaxation contenant la meilleure solution ne remplace pas la couverture de toute la recherche. Les [développements historiques](LAGRANGIEN-SURFACES.md) détaillent ce diagnostic.

## Modifier les paramètres et lire les surfaces

Le panneau avancé de paramètres bornés commence avec min=max pour chaque paramètre de chacune des douze lois : il décrit initialement le même problème. Élargir une plage ou modifier une loi définit une autre optimisation. La reconnaissance exacte du préréglage empêche alors d’appliquer son certificat 7/32 à des fonctions différentes. L’[étude des paramètres](OPTIMISATION-BRANCHES.md) donne les domaines, les enveloppes et les limites numériques de cette extension.

Si les paramètres sont entièrement libres dans leur domaine mathématique, la borne universelle r≤1 peut être atteinte sur 1→2→8 avec s1=1,s2=0 et un coefficient égal à 1 aux deux entrées x=1, par exemple a=0,3,b=0,5,c=d=1 sur ces branches. Cette construction est une remarque sur un autre problème, conservée dans la documentation ; elle n’est pas un préréglage ni un bouton de l’atelier courant.

Le rayon, les 20/40/60 divisions et le zoom vertical modifient la représentation, pas les lois, les flux ni l’objectif. Le zoom local porte des valeurs absolues ; l’échelle globale reste disponible. Les profils, voisins et dérivées complètent les nappes sans créer un pic artificiel. Les parties hors contraintes des vues libres doivent rester identifiées, et les projections de marqueurs sont réévaluées dans la coupe affichée.

## Repères de mise en œuvre et portée

- [Préréglage et reconnaissance exacte](../app/public/scripts/branch-interior-example.mjs).
- [Analyse conditionnelle des rendements R et S](../app/public/scripts/branch-peak-analysis.mjs).
- [Lagrangien non linéaire, certificat et trois coupes libres](../app/public/scripts/branches-exact-lagrangian.mjs).
- [Moteur d’optimisation](../app/public/scripts/branches-engine.mjs) et [diagnostic des PL](../app/public/scripts/branches-lagrangian.mjs).
- [Présentation du cas et des équations](../app/templates/graph/_branch-global-analysis.html.twig).

Les dérivations propres au réseau sont originales. Les sources universitaires citées justifient les principes généraux de dualité et de calcul par bornes, pas les valeurs de ce préréglage. Les contrôles incluent les lois par morceaux, bilans, différences finies, orientations d’axes et comparaisons au moteur ; le [journal](AVANCEES.md) consigne les validations effectivement achevées. Les PDF commercialisés, rendus privés, données SQL et secrets restent hors du dépôt.
