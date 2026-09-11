# Douze branches actives, sommes proches et maximum intérieur global

Préréglage complémentaire du 11 septembre 2026, sur le même graphe de huit nœuds et douze branches que l’[exemple 7/32](EXEMPLE-GLOBAL-BRANCHES.md). Les transformations restent sur les branches : yₑ=xₑfₑ(xₑ). Les nœuds additionnent puis partagent entièrement les productions. La source vaut 1 ; aucune normalisation supplémentaire des sommes reçues n’est appliquée.

Ce modèle remplit simultanément trois conditions au départ : **les douze entrées et sorties sont positives**, les sommes A2 à A8 ont un rapport maximal inférieur à 1,5, et les cinq fractions sont strictement intérieures à [0,1]. Le départ est déjà un maximum global pour ses lois fixes. Les nombres sont des paramètres fictifs et des résultats calculés, sans mesure industrielle ni conservation d’une énergie physique supposée.

## Les douze lois complètes

Toutes les lois ont a=0 et b=1/1000. On définit exactement :

```text
c = α−β/1000 ; d = α−β,
g(x)=x f(x) = (α/b−β)x²    pour 0≤x≤b,
             αx−βx²        pour b≤x≤1.
```

Les coefficients rationnels suivants définissent les paramètres sans arrondi préalable :

| Branches | α exact | β exact |
| --- | --- | --- |
| 1→2 et 1→5 | 194/205 | 19/205 |
| 2→3 | 213/220 | 8/99 |
| 2→8 | 59/100 | 2/5 |
| 5→3 | 213/220 | 16/99 |
| 5→7 | 213/220 | 16/297 |
| 7→6, 7→4, 3→4, 3→6 | 59/60 | 320/1539 |
| 4→8 et 6→8 | 31/50 | 2240/9747 |

Pour lire les paramètres de chaque branche, les valeurs suivantes sont arrondies à douze décimales. Le code calcule c et d à partir des fractions précédentes, sans réutiliser cet arrondi :

| Branche | a | b | c | d |
| --- | ---: | ---: | ---: | ---: |
| 1→2 | 0 | 0,001 | 0,946248780488 | 0,853658536585 |
| 1→5 | 0 | 0,001 | 0,946248780488 | 0,853658536585 |
| 2→3 | 0 | 0,001 | 0,968101010101 | 0,887373737374 |
| 2→8 | 0 | 0,001 | 0,589600000000 | 0,190000000000 |
| 5→3 | 0 | 0,001 | 0,968020202020 | 0,806565656566 |
| 5→7 | 0 | 0,001 | 0,968127946128 | 0,914309764310 |
| 7→6 | 0 | 0,001 | 0,983125406108 | 0,775406107862 |
| 7→4 | 0 | 0,001 | 0,983125406108 | 0,775406107862 |
| 3→4 | 0 | 0,001 | 0,983125406108 | 0,775406107862 |
| 3→6 | 0 | 0,001 | 0,983125406108 | 0,775406107862 |
| 4→8 | 0 | 0,001 | 0,619770185698 | 0,390185698164 |
| 6→8 | 0 | 0,001 | 0,619770185698 | 0,390185698164 |

On vérifie β>0 et 0<d<c<1 sur chaque branche. Toutes les productions satisfont 0≤g(x)≤x. Les portions proches de zéro sont conservées ; la parabole concave n’est pas substituée à la loi complète partout.

## Départ proposé et sommes reçues

Les partages sont **s1=s2=s3=s7=1/2 et s5=1/4**. Les directions de la première part sont respectivement 1→2, 2→3, 3→4, 7→6 et 5→3 ; le complément prend l’autre sortie du nœud. Les nœuds 4 et 6 n’ont qu’une sortie.

| Branche | Entrée x* | Coefficient f(x*) | Sortie y* |
| --- | ---: | ---: | ---: |
| 1→2 | 0,5 | 0,9 | 0,45 |
| 1→5 | 0,5 | 0,9 | 0,45 |
| 2→3 | 0,225 | 0,95 | 0,21375 |
| 2→8 | 0,225 | 0,5 | 0,1125 |
| 5→3 | 0,1125 | 0,95 | 0,106875 |
| 5→7 | 0,3375 | 0,95 | 0,320625 |
| 7→6 | 0,1603125 | 0,95 | 0,152296875 |
| 7→4 | 0,1603125 | 0,95 | 0,152296875 |
| 3→4 | 0,1603125 | 0,95 | 0,152296875 |
| 3→6 | 0,1603125 | 0,95 | 0,152296875 |
| 4→8 | 0,30459375 | 0,55 | 0,1675265625 |
| 6→8 | 0,30459375 | 0,55 | 0,1675265625 |

La plus petite entrée est 0,1125 et la plus petite sortie 0,106875. Aucun arc n’est artificiellement masqué comme inactif. Les valeurs reçues aux nœuds sont :

| Nœuds | Somme reçue A |
| --- | ---: |
| 2 et 5 | 0,45 |
| 3 et 7 | 0,320625 |
| 4 et 6 | 0,30459375 |
| 8 | r*=0,447553125=143217/320000 |

La condition de proximité demandée porte sur **les nœuds 2 à 8, source exclue, au départ** :

```text
max(A2,…,A8)/min(A2,…,A8)
  = 0,45/0,30459375 = 1600/1083 ≈ 1,477377654663 < 1,5.
```

Le maximum dépasse donc le minimum d’environ 47,74 % du minimum. Inclure la source égale à 1 ferait dépasser 1,5 : ce n’est pas le périmètre demandé. La proximité est une propriété vérifiée du témoin ; elle n’est pas ajoutée comme contrainte aux autres états de la recherche. La perte totale vaut 1−r*=0,552446875.

## Construction du certificat global

Utiliser les bilans hi et les lois ge(xe)−ye comme dans la [définition du lagrangien du réseau](EXEMPLE-GLOBAL-BRANCHES.md#le-vrai-lagrangien-du-réseau-non-linéaire). Choisir les potentiels :

```text
μ1=0,35 ; μ2=μ5=0,41 ; μ3=μ7=0,44 ; μ4=μ6=0,48 ; μ8=1,
ν_(i→j)=μj.
```

μ8=1 est le poids de la production finale dans l’objectif, pas un huitième bilan. Les sept autres μ multiplient les bilans. Les coefficients en y se compensent et :

```text
L(x,y;μ,ν)=μ1+Σ_(e=i→j) [μj ge(xe)−μi xe].
```

Sur chaque branche, mₑ=μi/μj, kₑ=y*ₑ/x*ₑ et :

```text
βₑ=(kₑ−mₑ)/x*ₑ > 0 ; αₑ=2kₑ−mₑ,
αₑ−mₑ=2βₑx*ₑ.
```

La parabole pₑ(x)=αₑx−βₑx² majore la loi complète. Sur 0≤x≤b, leur différence vaut αₑx(1−x/b)≥0 ; au-delà, elles coïncident. En posant wₑ=μjβₑ>0 :

```text
μj ge(x)−μi x
  ≤ wₑ(x*ₑ)²−wₑ(x−x*ₑ)².

Pour tous (x,y)∈[0,1]²⁴ :
L(x,y) ≤ μ1+Σₑwₑ(x*ₑ)²−Σₑwₑ(xₑ−x*ₑ)²
       = r*−Σₑwₑ(xₑ−x*ₑ)² ≤ r*.
```

Le témoin respecte les bilans et les lois, avec toutes les x*>b : il atteint r=L=r*. La dualité faible transforme donc cette majoration globale en preuve du maximum du réseau à lois fixes. Ce sont des dérivations particulières du modèle ; le principe général de dualité est donné au chapitre 5 des [diapositives officielles de Boyd et Vandenberghe](https://web.stanford.edu/~boyd/cvxbook/bv_cvxslides.pdf).

Cette fois, le maximum est **unique dans les cinq partages** : l’égalité impose chacun des douze x=x*. Les productions puis les sommes reçues sont fixées ; toutes ces sommes étant positives, chaque fraction se reconstruit de manière unique. Cette propriété distingue cet exemple du cas 7/32. Le lagrangien libre, lui, est indépendant des y après compensation : son maximum dans 24 variables n’est pas isolé.

## Dérivées du réseau compatible et courbure dans les cinq partages

Les lois et les trois autres fractions restent fixées lorsqu’on trace deux axes de partage. Dans un voisinage où toutes les entrées restent au-dessus de b, la composition exacte du réseau vérifie :

```text
r(s)=r*−Σₑwₑ[xe(s)−x*e]²,
∇r(s)=−2Σₑwₑ[xe(s)−x*e]∇xe(s),
∇r(s*)=0,
H_r(s*)=−2 Jᵀ diag(wₑ) J,   J_ej=∂xe/∂sj au témoin.
```

Le calcul de J suit les bilans dans l’ordre topologique. Avec Ai la somme reçue au nœud i et une allocation xe=si Ai, on a dxe=Ai dsi+si dAi ; pour son complément, dxe=−Ai dsi+(1−si)dAi. Une sortie unique a dxe=dAi. Les variations se propagent par dye=g′e(xe)dxe et dAj=Σdye. Au témoin, g′e(x*)=μi/μj. Ces récurrences concernent les entrées après les transformations précédentes ; les sommes nodales ne sont pas traitées comme des variables indépendantes.

Dans l’ordre **(s1,s2,s5,s3,s7)**, la Hessienne calculée vaut approximativement :

```text
[−0,406629139   0,163882963  −0,033289836   0             0          ]
[ 0,163882963  −0,227902216  −0,017548499   0             0          ]
[−0,033289836  −0,017548499  −0,073496999   0             0          ]
[ 0             0             0           −0,120446250   0,079406250]
[ 0             0             0            0,079406250  −0,120446250].
```

Sa négativité ne repose pas seulement sur les décimales affichées. Les lignes de J correspondant à x12,x23,x53,x34,x76 forment une matrice triangulaire à diagonale (1;0,45;0,45;0,320625;0,320625). J est donc de rang 5 ; comme tous les w sont positifs, H est définie négative. Ses valeurs propres numériques sont environ −0,50483208, −0,1998525, −0,14482007, −0,05837620 et −0,04104. Chacune des dix coupes suivant deux fractions a ainsi un maximum intérieur strict au témoin, les trois autres fractions étant maintenues à leurs valeurs témoins.

### Entrées de branche et variables libres : cinq nappes de référence

La nappe compatible en u=x12,v=x23 impose s1=u et s2=v/g12(u), sous 0≤v≤g12(u), avec s5=1/4,s3=s7=1/2. Au témoin (u,v)=(0,5;0,225), son gradient est nul. Le changement de coordonnées donne H_flux=DᵀH_partages D, avec les deux lignes non nulles de D : (1,0) puis (−s2 g′12(u)/A2,1/A2). Numériquement :

```text
H_flux ≈ [−0,92255507   0,84455639]
         [ 0,84455639  −1,12544304].
```

La nappe compatible en (s1,s2) a la sous-matrice supérieure gauche de H_partages. Ces deux surfaces réappliquent toutes les lois et tous les bilans. Les **trois coupes libres** du lagrangien figent au contraire les 22 autres coordonnées au témoin. Dans les portions x>b, elles prennent les formes exactes :

| Axes libres | L dans le voisinage | Gradient | Hessienne |
| --- | --- | --- | --- |
| u=x12, v=x23 | r*−(19/500)(u−1/2)²−(8/225)(v−9/40)² | (−(19/250)(u−1/2), −(16/225)(v−9/40)) | diag(−19/250,−16/225) |
| u=x12, v=x28 | r*−(19/500)(u−1/2)²−(2/5)(v−9/40)² | (−(19/250)(u−1/2), −(4/5)(v−9/40)) | diag(−19/250,−4/5) |
| u=x23, v=x28 | r*−(8/225)(u−9/40)²−(2/5)(v−9/40)² | (−(16/225)(u−9/40), −(4/5)(v−9/40)) | diag(−16/225,−4/5) |

Le gradient s’annule aux coordonnées témoins. Hors contraintes, ces hauteurs sont des valeurs de L et non des rendements réalisables. Le calcul reste celui des lois complètes si un axe franchit b ; une dérivée à une cassure n’est pas remplacée par zéro. Les formules des deux rendements et celles des trois lagrangiens ne sont pas interchangeables. À une autre référence, les coordonnées figées peuvent changer la constante et la valeur du sommet de la coupe libre.

## Grille, moteur numérique et preuve analytique : résultats distincts

Les onze tests du [préréglage](../app/tools/test-branch-active-example.mjs) contrôlent les douze lois, le ratio brut, les flux, les majorants, la compensation du lagrangien, la courbure, les différences finies et les deux recherches indépendantes. Un calcul rationnel séparé confirme r*=143217/320000 et le ratio 1600/1083.

Lors du contrôle du 11 septembre, la grille de pas 0,1 a parcouru ses 161 051 configurations. Elle trouve r≈0,44746136331802, avec s5=0,3 et les quatre autres partages à 0,5 : elle ne contient pas le partage optimal s5=0,25. L’écart au maximum exact vaut environ 0,000091761682. Un pas de 0,05 inclurait le témoin, mais demanderait 4 084 101 configurations pour une exploration complète ; cette exploration n’est pas prétendue exécutée ici.

Le solveur spatial seul garde le témoin initial r≈0,447553125. Lors des contrôles initiaux au budget de 1 000 sous-problèmes, il retourne `node-limit`, avec une borne de 0,48107282408962193 et un écart d’environ 0,03351969909. Au budget de 10 000, le contrôle effectué retourne `uncertain` après 3 217 sous-problèmes, avec la même borne prudente. **Ces exécutions spatiales seules ne certifient pas numériquement le maximum à leur tolérance 10⁻⁷.** Le certificat analytique précédent établit ce maximum séparément ; il n’est pas injecté dans le solveur pour remplacer son statut. Les nombres de sous-problèmes et marges peuvent évoluer avec le calcul ou ses options.

Un [certificat numérique générique distinct](../app/public/scripts/branches-smooth-certificate.mjs) a ensuite été ajouté. Il vérifie les lois et les flux du témoin, calcule les dérivées, puis estime les potentiels par moindres carrés avec factorisation QR. Il ne lit ni le préréglage, ni ses métadonnées, ni ses multiplicateurs analytiques. Pour ces potentiels, il maximise chaque loi pondérée sur **toutes** ses portions, en examinant extrémités et sommets concaves, puis ajoute des marges numériques. Ce supremum global et son écart au témoin produisent le statut ; le faible résidu de stationnarité ne suffit pas.

Au témoin actif, ce contrôle retrouve les potentiels précédents à l’arrondi près : borne brute 0,447553125, borne avec marge **0,4475531253301693**, écart **3,30169×10⁻¹⁰**, statut `certified` à la tolérance 10⁻⁷. Avec s5=0,3, il retourne au contraire `unresolved`, avec un écart d’environ 0,000127831851. Il s’agit d’un certificat numérique en nombres flottants avec marges, distinct de la preuve rationnelle exacte. Sa borne porte sur les lois fixes vérifiées ; elle ne s’applique pas à des boîtes de paramètres élargies.

La [fonction globale de l’atelier](../app/public/scripts/branches-global-study.mjs), `optimiseBranchesStudy`, utilise désormais ce contrôle après la préparation des candidats et bornes élémentaires du moteur. S’il clôt l’écart, elle conserve le témoin, annonce `smooth-witness-lagrangian`, zéro PL traité, et exporte le diagnostic complet dans `certificates.smoothWitness`. Sinon, elle exécute le moteur spatial avec les options et le budget demandés. Les résultats incertains du moteur spatial seul ci-dessus décrivent donc son analyse interne initiale ; l’atelier possède aussi ce certificat numérique indépendant qui clôt le cas actif.

Le budget `maxNodes` limite les sous-problèmes spatiaux : même un budget nul permet le contrôle dual indépendant. Une annulation demandée est respectée avant ce contrôle. Les boîtes de paramètres ne l’autorisent que si **toutes** leurs bornes sont égales deux à deux ; le calcul prend alors les lois effectives des boîtes, qui peuvent différer des lois nominales. Toute plage élargie reste confiée au moteur des bandes admissibles. Les [douze tests de cette orchestration](../app/tools/test-branches-global-study.mjs) vérifient ces cas, l’annulation, les validations et la conservation des vrais PL pour le cas 7/32.

Le [module du préréglage](../app/public/scripts/branch-active-example.mjs) expose les lois, la reconnaissance exacte, les flux témoins, les potentiels et la Hessienne. Le [diagnostic du lagrangien actif](../app/public/scripts/branch-active-lagrangian.mjs) sépare la borne analytique, sa reconstruction numérique et la majoration avec marge ; il vérifie la provenance avant d’exposer ses trois coupes libres. Modifier une loi définit un autre problème et désactive l’application automatique de sa preuve particulière. La proximité des nœuds, l’unicité et le gradient nul ne sont pas des garanties pour des paramètres modifiés. Les autres ateliers, fiches scientifiques et documents privés conservent leur périmètre.
