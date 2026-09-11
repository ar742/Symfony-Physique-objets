# Douze branches : rendement, production et optimisation

> **Atelier actuel — 11 septembre 2026 :** consulter [l’unique préréglage global 7/32 et son lagrangien exact](EXEMPLE-GLOBAL-BRANCHES.md).
> Les réglages, boutons, plages initiales et résultats numériques décrits ci-dessous retracent les versions précédentes ; les exemples 0,54432, b=0,83 et la construction libre ne sont plus proposés dans l’interface.
> Les méthodes générales restent documentées ici. Le panneau avancé actuel commence avec min=max aux lois du préréglage, comme précisé dans la nouvelle référence.

Cinquième exemple du volet Production, précisé par l’auteur le 10 septembre 2026 et accessible sous `/graphes/production/branches`. **Chaque branche possède un coefficient de rendement f ; sa production est y=x f(x).** Les huit nœuds additionnent les productions reçues et répartissent la somme disponible. Le précédent [atelier de huit machines](OPTIMISATION-PRODUCTION.md) conserve son modèle propre, avec les transformations aux nœuds.

Chaque branche porte l’analyse Exp. IN → TH → Exp. OUT du [cas 1b](FORMES-ANALYSE.md) : alimentation allouée, application du rendement et calcul de la production, production transmise. Le réseau, les lois et les conversions sont supposés ; les résultats sont calculés, sans mesure industrielle inventée. Il s’agit d’une configuration statique compatible, sans durée ni stock ajoutés.

## Topologie et bilans

Les douze arcs orientés sont fixés :

```text
1 → 2, 5
2 → 3, 8
5 → 3, 7
7 → 6, 4
3 → 4, 6
4 → 8
6 → 8
```

Un croisement de traits sans disque n’est pas un raccord. L’ordre `1, 2, 5, 3, 7, 4, 6, 8` respecte ce graphe sans cycle ; il décrit une dépendance de calcul.

Sur i→j, `x_ij` est l’alimentation allouée et `y_ij=x_ij f_ij(x_ij)` la production qui contribue à la somme disponible en j. L’apport externe au nœud 1 vaut **exactement 1**, avec partage intégral. Les conversions sont supposées égales à 1. En notant A_i la somme disponible :

```text
A_1 = 1
A_i = Σ_k y_ki                              pour i = 2,…,8
Σ_j x_ij = A_i                              pour i = 1,…,7
0 ≤ x_ij ≤ 1 ; y_ij = x_ij f_ij(x_ij)
r = A_8 = y_28 + y_48 + y_68                objectif à maximiser
```

Toutes les sommes portent seulement sur les arcs présents. La répartition ne duplique pas une alimentation. Le rendement appartient à [0,1], donc `0≤y_ij≤x_ij`. Le modèle n’écrête pas une entrée incompatible et n’ajoute ni abandon arbitraire d’excédent ni réinjection. La différence `x_ij−y_ij` vient du rendement : elle ne devient pas une production transmise à un autre arc.

Les cinq commandes de partage sont :

| Commande | Première allocation | Allocation complémentaire |
| --- | --- | --- |
| s1 | x12 = s1 A1 | x15 = (1−s1) A1 |
| s2 | x23 = s2 A2 | x28 = (1−s2) A2 |
| s5 | x53 = s5 A5 | x57 = (1−s5) A5 |
| s3 | x34 = s3 A3 | x36 = (1−s3) A3 |
| s7 | x76 = s7 A7 | x74 = (1−s7) A7 |

Chacune appartient à [0,1], bornes incluses. Les nœuds 4 et 6 allouent toute leur somme à leur unique sortie. Une somme nulle rend la fraction correspondante indéterminée par les flux ; la reconstruction peut alors choisir 0,5 sans changer la configuration productive.

En sommant les bilans sur le graphe sans cycle, les transferts internes se compensent et les différences `x−y` sont non négatives. Ainsi :

```text
r = 1 − Σ_(i→j) (x_ij−y_ij) ≤ 1.
```

Cette borne appartient au modèle de rendement confirmé. Les sorties de trois branches terminales ne constituent pas trois sources indépendantes. Les quantités restent normalisées : un bilan physique en énergie ou matière demanderait des unités et des références supplémentaires.

## Rendement affine, production quadratique par morceaux

Chaque branche possède ses propres a, b, c, d. Les valeurs proposées sont identiques au départ : `(0,3 ; 0,8 ; 0,9 ; 0,6)`, avec cinq partages initiaux égaux à 0,5.

```text
          0                                  si 0 ≤ x ≤ a
f(x) =    c (x−a)/(b−a)                      si a < x ≤ b
          c + (d−c)(x−b)/(1−b)               si b < x ≤ 1

0 ≤ a < b < 1 ; 0 ≤ d ≤ c ≤ 1.
```

Le rendement vaut 0 en a, c en b et d en 1. La dernière portion devient un plateau si c=d ; c=0 donne un rendement nul. Pour x>0, `f(x)=y/x`. En x=0, la loi définit f(0)=0 et y=0, sans former le quotient 0/0.

La fonction optimisée sur chaque branche est la production g(x)=x f(x) :

```text
          0                                        si 0 ≤ x ≤ a
g(x) =    c (x²−ax)/(b−a)                          si a < x ≤ b
          [(d−c)x² + (c−bd)x]/(1−b)                si b < x ≤ 1.
```

La portion montante du rendement donne une production quadratique convexe ; la portion descendante donne une production quadratique concave, ou affine si c=d. Le maximum du rendement en b ne situe donc pas automatiquement le maximum de la production. Les résultats et la courbe doivent distinguer f, x et y.

Les champs préparent les prochains calculs. Changer de branche conserve les réglages préparés ; la comparaison les applique ensemble. Le sélecteur de résultat choisit séparément l’état représenté dans le graphe, les tableaux et les analyses. Les commandes du résultat peuvent différer des partages encore présents dans le formulaire.

Le bouton « Exemple : b = 0,83 entre deux points de grille » prépare `(a,b,c,d)=(0,3 ; 0,83 ; 0,9 ; 0,6)` sur les douze branches et les cinq partages à 0,5. Il faut ensuite lancer la comparaison. Ce scénario examine l’effet de la discrétisation au pas 0,1 ; il reste distinct des valeurs proposées au chargement initial.

## Grille finie des cinq partages

Pour n divisions, chaque partage prend les n+1 valeurs `0, 1/n, …, 1`. Le moteur parcourt les `(n+1)^5` configurations et recalcule les productions avec `y=x f(x)`. Toute configuration incompatible est exclue des candidats admissibles.

| Pas h | n | Configurations complètes |
| --- | ---: | ---: |
| 0,2 | 5 | 7 776 |
| 0,1 | 10 | 161 051 |
| 0,05 | 20 | 4 084 101 |
| 0,02 | 50 | 345 025 251 |
| 0,01 | 100 | 10 510 100 501 |

Le réglage initial n=10 et le budget de 200 000 configurations permettent de terminer cette grille. L’interface propose aussi 1 000 000 et 5 000 000 évaluations. Une grille terminée donne son maximum fini ; elle ne démontre pas le maximum des partages continus. Si le budget est atteint ou le calcul interrompu, le résultat concerne uniquement la partie visitée. Le compteur et le statut d’achèvement doivent accompagner la valeur.

Ces dénombrements ne sont pas des durées mesurées. Une évaluation de grille et un sous-problème global sont des opérations différentes ; comparer leurs compteurs ne suffit pas à comparer les performances.

## Recherche continue et bornes spatiales

Le domaine de partages est continu. Les productions sont quadratiques par morceaux ; imposer un régime ne les rend pas affines. Les anciennes formulations linéaires du modèle y=f(x) ne résolvent donc pas le problème présent.

La recherche utilise une séparation progressive des intervalles d’alimentation et des relaxations linéaires des productions quadratiques. Sur une portion convexe, une corde fournit une majoration et les tangentes des minorations ; les rôles s’inversent sur une portion concave. Une relaxation contient les possibilités de la loi, mais peut aussi contenir des points non réalisables. Elle sert à obtenir une borne supérieure.

Une configuration candidate est reconstruite puis recalculée avec les productions complètes pour alimenter la borne inférieure. Une subdivision doit couvrir toute la région parente ; une région ouverte ou numériquement incertaine conserve une borne prudente. C’est le principe de la [séparation et évaluation, Boyd et Mattingley](https://stanford.edu/class/ee364b/lectures/bb_notes.pdf). Il faut distinguer un arrêt sur budget d’un écart des bornes inférieur à la tolérance annoncée.

Le moteur combine plusieurs majorations : la borne universelle 1, les capacités des branches terminales et la coupure immédiatement après la source. Cette dernière maximise la somme des deux productions supérieures `G12(t)+G15(1−t)` sur [0,1], par calcul des extrema des portions quadratiques. Aucun traitement ultérieur ne peut augmenter cette somme puisque y≤x. Une configuration qui atteint déjà cette borne peut terminer le contrôle sans programme linéaire supplémentaire ; la borne utilisée doit être identifiée dans le résultat.

Les programmes linéaires portent sur des alimentations et des productions, avec bilans linéaires aux nœuds. Les fractions se reconstruisent ensuite à partir des flux ; on ne remplace pas les produits fraction×somme inconnue par des constantes. Les budgets de recherche et le statut de chaque résultat doivent rester visibles. Une solution satisfaisante ou des conditions de stationnarité ne prouvent pas, à elles seules, l’optimum global.

La tolérance absolue proposée est `10^-7`. Le budget initial de 10 000 sous-problèmes peut être réglé de 1 à 50 000 dans l’interface. Un budget atteint garde les régions encore ouvertes et leur borne ; il n’autorise pas à annoncer leur optimum. La subdivision resserre les relaxations, tandis que les configurations retenues sont recalculées avec les lois complètes.

### Borne lagrangienne avec correction du résidu dual

La dualité faible produit une borne sans supposer le problème initial convexe. Le chapitre 5 de [Boyd et Vandenberghe](https://web.stanford.edu/~boyd/cvxbook/bv_cvxbook.pdf) présente ce principe ; on l’écrit ici pour la maximisation d’une relaxation.

Pour `max q0+qᵀz`, sous `Az≤h` et `0≤z≤U`, prenons λ≥0. Pour tout z admissible :

```text
q0 + qᵀz ≤ L(z,λ) = q0 + qᵀz + λᵀ(h−Az)
                    ≤ q0 + λᵀh + Σ_j max(0,q_j−(Aᵀλ)_j) U_j.
```

La dernière expression est une borne supérieure. Même si `Aᵀλ≥q` n’est pas exactement vérifié, la partie positive du résidu est compensée par les bornes finies U. Le contrôle conserve la constante q0 et les facteurs d’échelle, examine le résidu primal et ajoute une marge numérique. Pour examiner une incompatibilité, une borne strictement négative de l’objectif nul contredirait l’existence d’un point admissible.

Les nombres flottants et les marges ne constituent pas une arithmétique formelle exacte. Un certificat numérique doit annoncer sa tolérance et la couverture du domaine. Le lagrangien contribue à la borne ; la subdivision et la conservation des régions encore possibles donnent sa portée globale.

## Partages et rendements à paramètres bornés

La conception ajoute quatre paramètres par branche, soit 48 paramètres et cinq partages. Les plages initiales, modifiables indépendamment pour les douze branches, sont :

| Paramètre | Minimum | Maximum |
| --- | ---: | ---: |
| a | 0,2 | 0,4 |
| b | 0,7 | 0,9 |
| c | 0,8 | 1 |
| d | 0,5 | 0,7 |

Les intervalles sont fermés dans [0,1], avec `a_max<b_min`, `b_max<1` et `d_max≤c_min`. Ces conditions assurent l’admissibilité de toutes les combinaisons d’une boîte indépendante. Elles sont plus restrictives que la seule admissibilité d’un quadruplet. Aucun coût de modification ni lien entre les paramètres de branches différentes n’est ajouté.

À alimentation x fixée, les rendements permis forment exactement un intervalle `[f_min(x),f_max(x)]`. En notant θ=(a,b,c,d) :

```text
θ_min,1 = (a_max,b_min,c_min,d_min)
θ_min,2 = (a_max,b_max,c_min,d_min)
f_min(x) = min(f(x;θ_min,1),f(x;θ_min,2))
θ_max(x) = (a_min,clip(x,b_min,b_max),c_max,d_max)
f_max(x) = f(x;θ_max(x)).
```

Les productions permises forment alors exactement `[x f_min(x), x f_max(x)]`, puisque x≥0. Les enveloppes de rendement sont affines par morceaux ; celles de production deviennent quadratiques par morceaux. La représentation géométrique des fonctions affines, décrite notamment par [Huchette et Vielma](https://arxiv.org/abs/1708.00050), ne suffit pas à transformer ce dernier domaine en union finie de polygones exacts : ses relaxations doivent tenir compte de la courbure.

L’absence de trou entre les extrêmes découle de la connexité de la boîte et de la continuité de la réponse, avec dénominateurs strictement positifs. Pour x>0, une production cible y permet de reconstruire un rendement cible y/x, puis un quadruplet admissible. Pour x=0, seule y=0 est réalisable et les paramètres restent indéterminés par ce point. La reconstruction doit vérifier ses paramètres, son erreur et le réseau recalculé.

Une bande ne représente pas une loi unique dont les paramètres changeraient automatiquement avec x. Chaque configuration retient un quadruplet par branche, qui définit ensuite sa loi complète. La représentation mathématique exacte de l’ensemble admissible et l’approximation numérique de sa recherche restent distinctes.

## Repères analytiques pour les deux domaines proposés

Ces preuves fournissent des références indépendantes de l’exécution du solveur. Elles concernent la source fixée à 1 et les paramètres ou plages annoncés ; modifier b, une boîte ou la topologie change le problème.

### Lois initiales fixées : r maximal = 0,54432

Avec `(a,b,c,d)=(0,3 ; 0,8 ; 0,9 ; 0,6)`, la production g atteint son maximum 0,72 en x=0,8. À la source, `g(t)+g(1−t)≤0,72`. Si les deux branches sont actives, t appartient à [0,3 ; 0,7] et cette somme quadratique convexe est au plus 0,504 ; sinon une branche est inactive et l’autre ne dépasse pas 0,72.

Sur [0 ; 0,72], g est convexe, croissante et g(0)=0. Pour des entrées positives de somme S≤0,72, la convexité donne `Σg(x_i)≤g(S)`. Le total produit après deux arcs est donc au plus `g(0,72)=0,54432`. Les traitements restants ne peuvent augmenter ce total. On obtient ainsi `r≤0,54432`.

La borne est atteinte avec `s1=0,8` et `s2=0` : le chemin `1→2→8` reçoit successivement 0,8 puis 0,72, et produit 0,72 puis 0,54432. L’autre branche source reçoit 0,2, sous son seuil. Les trois autres partages n’influencent pas ces flux. Cette configuration figure notamment dans les grilles de pas 0,2 et 0,1 ; leur maximum mathématique coïncide donc ici avec le maximum continu, si elles sont parcourues entièrement.

### Plages proposées : r maximal = 0,9

La production supérieure réalisable d’une branche pour ces boîtes est :

```text
G(x) = 0                       pour 0 ≤ x ≤ 0,2
       2x² − 0,4x              pour 0,2 ≤ x ≤ 0,7
       x                       pour 0,7 ≤ x ≤ 0,9
       3,7x − 3x²              pour 0,9 ≤ x ≤ 1.
```

La coupure source donne `r≤G(t)+G(1−t)`. Par symétrie, il suffit de t∈[0 ; 0,5]. Sur les intervalles successifs [0 ; 0,1], [0,1 ; 0,2], [0,2 ; 0,3] et [0,3 ; 0,5], le maximum de cette somme vaut respectivement 0,9, 0,9, 0,8 et 0,76. Ainsi `r≤0,9`.

La borne est atteinte par `s1=0,9`, `s2=0` et `(a,b,c,d)=(0,2 ; 0,9 ; 1 ; 0,7)` sur `1→2` et `2→8`. Chaque branche active reçoit 0,9, fonctionne au rendement 1 et transmet 0,9. L’autre branche source reçoit 0,1 et reste inactive pour toutes les lois de sa boîte. Les autres lois peuvent être choisies dans leurs plages, sans influence sur ce chemin. Ce résultat utilise les boîtes précisées ; il n’accorde pas un rendement unitaire à toute alimentation.

## Paramètres libres : une construction atteint r=1

Sans autres contraintes que celles du rendement, la borne globale reste `r≤1`. Elle est atteinte en envoyant toute la source par `1→2→8` : `s1=1`, `s2=0`, et rendement f(1)=d=1 sur ces deux branches. Choisir par exemple a=0,3, b=0,5 et c=d=1 pour ces lois respecte les contraintes. Les autres partages n’affectent pas ce chemin, faute d’alimentation ; ils peuvent rester à 0,5.

Les deux branches actives reçoivent x=1 et transmettent y=1. L’admissibilité et la borne universelle établissent l’optimum de ce problème libre, sans coût de conception. Cette construction ne résout pas le problème des lois initiales fixées ni celui des plages proposées, qui bornent notamment d au-dessous de 1.

## Résultats numériques vérifiés du modèle y=x f(x)

Les tests du moteur du 10 septembre 2026 confirment les repères suivants. La production est arrondie à six décimales dans ce tableau ; les bornes supérieures sont arrondies vers le haut à douze décimales. Les écarts et les statuts sont calculés avant ces arrondis, avec une tolérance absolue de `10^-7`.

| Domaine | Meilleure production r | Borne supérieure | Écart calculé | Sous-problèmes traités |
| --- | ---: | ---: | ---: | ---: |
| Lois initiales fixées | 0,544320 | 0,544320057681 | ≈5,768×10⁻⁸ | 57 |
| Variante b=0,83, autres paramètres conservés | 0,567015 | 0,567015305720 | ≈2,270×10⁻⁸ | 68 |
| Boîtes proposées | 0,900000 | 0,900000000011 | ≈1,046×10⁻¹¹ | 0 |

Dans le scénario initial, les grilles de pas 0,2 et 0,1 terminent leurs 7 776 et 161 051 configurations, toutes compatibles, et retrouvent 0,54432. Pour b=0,83, la grille de pas 0,1 trouve environ 0,473276490174316, avec s1=0,9 et les quatre autres commandes à 0. La recherche continue retient s1=0,83 et les autres à 0, pour une production d’environ 0,567015283018868. Cette variante illustre un écart réel de discrétisation.

Pour les boîtes proposées, la borne de coupure source suffit : aucun programme linéaire supplémentaire n’est nécessaire. Son certificat est enregistré dans `certificates.sourceCertificate`. Le moteur retient ici s1=0,1, s5=s7=0, avec passage par `1→5→7→4→8` et les lois `(0,2 ; 0,9 ; 1 ; 0,7)` sur les arcs actifs. Il atteint la même borne analytique 0,9 que le témoin plus court décrit plus haut ; l’optimum ne détermine pas une configuration unique.

Ces nombres sont des résultats de calcul et des contrôles internes, sans mesure externe. Ils ne préjugent pas de la durée, du nombre de subdivisions ni du statut obtenu après modification des lois, des plages ou des budgets.

## Interface, reproduction et portée

L’[explorateur des lagrangiens et surfaces](LAGRANGIEN-SURFACES.md) propose trois vues distinctes : le vrai L affine d’un PL enregistré, la production réalisable suivant deux fractions et une nappe en flux u=x12, v=x23 autour de la meilleure configuration. Un recentrage, un zoom vertical local explicite, deux coupes orthogonales et un tableau de voisins rendent le maximum de frontière lisible. Il conserve les autres données, recalcule les marqueurs projetés et signale les parties hors contraintes du PL. Un plan, un plateau ou une cassure est conservé tel quel ; aucun pic artificiel n’est ajouté et aucune coupe ne remplace le contrôle global des bornes.

La page permet de préparer chaque rendement, copier une loi sur les douze branches, choisir le pas et le budget de grille, puis comparer. Un second formulaire prépare les plages de conception ; la construction libre est accessible séparément. Changer l’état affiché déplace ensemble le graphe, les tableaux, la courbe et l’analyse de branche. Les ancres qualifient le réseau, l’arc, le cas et la position, par exemple `reseau-5-3-1b-2.0`.

Le module `branch-study.mjs` gère l’interface ; `branch-study-worker.mjs` exécute les recherches. L’export JSON conserve les paramètres, les commandes, les résultats et les options propres aux recherches à lois fixées et à paramètres bornés. Il ne publie rien et ne constitue pas une mesure indépendante.

Le vérificateur `php tools/verify-branches.php` examine le rendu, les contrôles, les liens, l’accessibilité structurelle, les routes et les ressources HTTP. Il n’exécute pas les recherches JavaScript. Les tests numériques et la recette navigateur complètent cette vérification ; seuls les résultats recalculés avec y=x f(x) peuvent documenter la livraison dans [le journal](AVANCEES.md).

Le critère reste la maximisation de r. Une entropie des partages, un coût, des stocks ou des contraintes technologiques créeraient un autre problème à définir. Cet atelier n’ajoute aucune fiche au catalogue des 37 analyses historiques 6×6. Les ouvrages commerciaux et leurs extractions restent privés. Les références universitaires ci-dessus ont été consultées le 10 septembre 2026 ; elles étayent les méthodes générales, pas les paramètres fictifs ni une validation expérimentale de ce réseau.
