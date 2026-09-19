# Concordances en Python : paramètres, recherches et différentielles

Extension du 18 septembre 2026 de l’atelier local **04 · Environnement, concordances et production**. Cette page décrit l’interface Python sur `localhost:8501` et ses modules natifs. L’[étude nodale du site Symfony](CONCORDANCES-NODALES.md) conserve son propre cadre historique. Le document privé de l’auteur sert de référence de conception ; ni ce PDF ni ses rendus ou extractions ne sont publiés.

## Variables suivies et choix de l’auteur

Les transformations sont portées par les **nœuds**. Les douze arcs transfèrent les parts des sorties :

\[
1\to2,\quad1\to5,\quad2\to3,\quad2\to8,\quad5\to3,\quad5\to7,
\]
\[
7\to6,\quad7\to4,\quad3\to4,\quad3\to6,\quad4\to8,\quad6\to8.
\]

La source impose \(Y_1=1\), sans transformation TH₁. Pour \(i=2,\ldots,8\), les attributs calculés sont :

\[
X_i=\sum_{j:j\to i}q_{ji},\qquad
C_i=e_i+\sum_{j:j\to i}\varepsilon_{ij}q_{ji},\qquad
Y_i=\rho(X_iC_i).
\]

\(X_i\) est l’entrée totale Exp. IN, \(e_i\) l’environnement, \(C_i\) le coefficient résultant et \(Y_i\) la sortie Exp. OUT après THᵢ. La quantité \(q_{ij}\) est le transfert du fournisseur i vers le destinataire j. La concordance \(\varepsilon_{ij}\) est, au contraire, indexée **destinataire i, fournisseur j** : l’arc 1→2 utilise ε₂₁. Cette convention suit l’équation du document initial ; sa parenthèse décrivant l’orientation de ε emploie l’ordre inverse.

Les précisions successives de l’auteur ont la portée suivante :

| Élément | Cadre appliqué |
|---|---|
| Document initial | Loi \(Y_i=X_iC_i\), environnements dans [0,1], concordances dans [−1,1] ; le terme objectif écrit dans le lagrangien est la somme des valeurs absolues des arrivées en 8. |
| Objectif précisé ensuite | Maximiser **Y₈ après TH₈**. Les arrivées avant TH₈ restent des indicateurs, pas l’objectif. |
| Mise à zéro des sorties négatives | Mode rectifié : \(\rho(t)=\max(0,t)\). |
| Comparaison avec les sorties signées | Mode signé : \(\rho(t)=t\). Une sortie négative est répartie avec son signe. |
| Extension Python du 18 septembre | Environnements également permis dans **[−1,1]** ; types indépendants de matrice et d’environnements ; recherche sur les distributions, les environnements ou les concordances actives. |

On ne déduit pas les extensions du PDF seul. Les nombres sont les attributs d’un modèle abstrait ; les arcs organisent ses dépendances de calcul sans démontrer une causalité physique. Aucun plafond positif, stock ou cycle temporel n’est ajouté. En particulier, \(Y_8\le1\) n’est pas une propriété générale ; un maximum signé négatif n’est pas remplacé par zéro.

## Répartitions et domaines

Chaque sortie intermédiaire se partage intégralement :

\[
q_{ij}=\alpha_{ij}Y_i,\qquad
\sum_{j:i\to j}\alpha_{ij}=1,\qquad 0\le\alpha_{ij}\le1.
\]

| Commande | Première branche, fraction s | Seconde branche, fraction 1−s |
|---|---|---|
| s₁ | 1→2 | 1→5 |
| s₂ | 2→3 | 2→8 |
| s₅ | 5→3 | 5→7 |
| s₃ | 3→4 | 3→6 |
| s₇ | 7→6 | 7→4 |

Les sorties de 4 et 6 vont intégralement vers 8. Aucun bilan sortant n’est imposé en 8, qui n’a pas de branche sortante. Les contributions signées se somment algébriquement : un transfert négatif n’inverse pas l’orientation de son arc. Si \(Y_i=0\), les transferts sortants sont nuls ; sinon leurs rapports à \(Y_i\) sont les fractions entre 0 et 1.

La matrice complète comporte huit zéros diagonaux et 56 coefficients hors diagonale. **Douze coefficients seulement sont actifs** : les 44 autres multiplient des transferts absents, nuls. Ils sont conservés pour relire ou exporter la matrice, mais leur modification ne crée aucun arc.

Les deux indicateurs avant TH₈ sont \(X_8=q_{28}+q_{48}+q_{68}\) et \(|q_{28}|+|q_{48}|+|q_{68}|\). Ils coïncident en rectifié, mais peuvent différer en signé. Aucun des deux ne remplace \(Y_8=\rho(X_8C_8)\).

## Paramètres initiaux et commandes de l’interface

Une nouvelle session commence avec une **matrice aléatoire signée**, les sept environnements **nuls**, les cinq partages à 0,5 et le traitement **signé**. La graine est affichée et modifiable. Le modèle d’une session déjà ouverte est conservé plutôt que remplacé silencieusement.

En haut de page, le menu **Type de matrice ε**, le panneau adjacent **Régler les environnements, matrice, etc.** et le menu **Type d’environnements eᵢ** contrôlent des composantes indépendantes. Changer un type de matrice ne modifie ni les environnements ni les partages ; changer un type d’environnements conserve la matrice et les partages. Le mode signé/rectifié reste un choix distinct.

| Type | Matrice ε | Environnements e₂…e₈ |
|---|---|---|
| `neutre` | Tous les coefficients nuls. | Tous nuls. |
| `positive` | +1 hors diagonale, diagonale nulle. | Tous +1. |
| `inhibitory` | −1 hors diagonale, diagonale nulle. | Tous −1. |
| `reference` | ε₂₁=ε₅₁=−1, autres coefficients nuls. | Tous +1. |
| `negative` | ε₈₂=ε₈₄=ε₈₆=−1, autres coefficients nuls. | e₂…e₇=1 et e₈=0. |
| `inactive` | Les 44 coefficients hors arcs valent +1 ; les douze actifs valent 0. | Tous nuls. |
| `seed-7`, `seed-8`, `seed-34` | 56 tirages signés avec la graine fixe du type. | Sept tirages signés avec la graine fixe du type. |
| `random-positive` | 56 tirages dans [0,1[, avec la graine réglable. | Sept tirages dans [0,1[, avec la graine réglable. |
| `random-signed` | 56 tirages dans [−1,1[, avec la graine réglable. | Sept tirages dans [−1,1[, avec la graine réglable. |
| `custom` | Conserver et éditer les valeurs courantes. | Conserver et éditer les valeurs courantes. |

Ces noms qualifient des **paramètres**, pas des résultats du réseau. Par exemple, une matrice nulle ne signifie transmission identique que si les environnements adéquats sont aussi choisis ; e=0 ne supprime pas nécessairement les termes de concordance. Les types `reference` ou `negative` appliqués à une seule composante ne rétablissent pas à eux seuls les anciens exemples complets et leurs maxima connus.

Le panneau de réglage permet de modifier les deux graines, les sept e, la matrice complète et les cinq parts. Les types à graine fixe ignorent la graine saisie : pour la faire varier, choisir un type aléatoire. Une modification manuelle distingue la composante personnalisée de sa provenance antérieure. L’export conserve les valeurs effectives et la provenance de chaque composante.

Les tirages utilisent la suite déterministe `lcg32-numerical-recipes-v1`. La matrice parcourt les destinataires 1 à 8 puis les fournisseurs 1 à 8, sans tirage diagonal ; les environnements parcourent les nœuds 2 à 8. Les deux composantes ont des flux de génération séparés. La même graine et le même type reproduisent la même composante ; les valeurs tirées appartiennent à une grille finie, pas à une loi continue réalisée exactement.

## Quel problème est optimisé ?

Une recherche varie **un seul groupe à la fois**. Les autres données restent celles des réglages de départ :

| Groupe API | Variables | Domaine |
|---|---|---|
| `shares` | Les cinq distributions s₁, s₂, s₅, s₃, s₇. | [0,1]⁵ |
| `environments` | Les sept environnements e₂…e₈. | [−1,1]⁷ |
| `epsilon` | Les douze concordances associées aux arcs présents. | [−1,1]¹² |

La diagonale et les 44 concordances inactives ne sont pas des variables de recherche. Le choix du groupe ne transforme pas cette recherche en optimisation simultanée des 24 paramètres. L’objectif reste \(Y_8\) ; aucun coût de modification ou terme d’entropie n’est ajouté.

Les méthodes ont des portées différentes :

- **SLSQP** cherche localement une meilleure configuration bornée. Le diagnostic du solveur et un gradient faible ne démontrent pas un maximum global ; un plateau rectifié peut arrêter une recherche locale.
- **Évolution différentielle** explore le groupe retenu avec une graine et un budget explicites. Son meilleur état est un témoin, pas une borne supérieure du maximum continu.
- **Comparer SLSQP et évolution différentielle** lance les deux recherches depuis les mêmes réglages du même problème. Leur accord ne fournit pas de certificat supplémentaire.
- **Grille** énumère des valeurs réparties entre les bornes. Avec d divisions sur n variables, une grille complète compte \((d+1)^n\) configurations : n vaut 5, 7 ou 12 selon le groupe. Une limite d’évaluations peut interrompre l’énumération ; une grille même complète reste finie.
- **Intervalles**, disponibles pour les **distributions seulement**, encadrent le maximum sur les cinq parts à e et ε fixes. Le budget porte sur les boîtes subdivisées. Témoin, borne supérieure, écart et statut sont distincts ; une borne encore ouverte ne doit pas être présentée comme un optimum établi. Les coupures utilisant la positivité restent réservées aux flux rectifiés.

Après la recherche, tableau des flux, graphe, dérivées et nappes utilisent automatiquement la **meilleure configuration trouvée** parmi les méthodes lancées pour le problème courant. Les réglages de départ restent visibles et inchangés en haut de page. Ils permettent de relancer une comparaison depuis les mêmes données. Changer de modèle, de mode ou de groupe invalide l’association avec les anciens résultats ; ceux-ci ne deviennent pas la réponse d’un autre problème.

## Lagrangien compatible et lagrangien libre

À paramètres fixés, l’état libre comporte les douze transferts q, sept entrées X et sept sorties Y, soit **26 coordonnées**. Les **21 égalités** sont :

\[
h_i^X=X_i-\sum_jq_{ji},\qquad h_i^Y=Y_i-\rho(X_iC_i)
\quad(i=2,\ldots,8),
\]
\[
h_i^S=\sum_kq_{ik}-Y_i\quad(i=1,\ldots,7),\qquad Y_1=1.
\]

On définit

\[
\mathcal L=Y_8+\sum_{i=2}^8\lambda_i h_i^X+
\sum_{i=2}^8\mu_i h_i^Y+\sum_{i=1}^7\eta_i h_i^S.
\]

Les multiplicateurs des égalités sont libres en signe. Les bornes des paramètres et les conditions de partage restent nécessaires ; les égalités ne les remplacent pas. Sur chaque état compatible, **\(\mathcal L_{\mathrm{comp}}=Y_8\)**. C’est cette restriction, recalculée avec les lois et les bilans, que montre la nappe principale et que recherche l’optimisation.

La coupe libre, proposée en complément, fait varier deux coordonnées q/X/Y avec les 24 autres et les multiplicateurs fixes. Les bilans ne sont pas réappliqués. Hors contraintes, la valeur de \(\mathcal L\) n’est pas une production réalisable et sa surface peut être une selle. Maximiser Y₈ sous contraintes ne demande pas de maximiser \(\mathcal L\) dans toutes ses coordonnées libres.

Quand une recherche porte sur e ou ε, ces paramètres varient dans le problème réduit. À la configuration retenue, le diagnostic libre 26/21 est calculé à leurs **valeurs retenues**, ensuite fixées pour sa coupe. Les dérivées par rapport à e ou ε sont présentées séparément ; elles ne sont pas artificiellement ajoutées aux 26 coordonnées q/X/Y de cette coupe.

## Adjoint et différentielles sur le réseau

Dans une portion régulière, poser \(\phi_i=\rho'(X_iC_i)\). En signé, \(\phi_i=1\). En rectifié, elle vaut 1 si \(X_iC_i>0\) et 0 si \(X_iC_i<0\) ; au seuil, une dérivée classique n’est pas affirmée automatiquement.

L’adjoint part de \(p_8=1\) et remonte le graphe :

\[
v_{ji}=p_i\phi_i(C_i+X_i\varepsilon_{ij}),\qquad
p_j=\sum_{i:j\to i}\alpha_{ji}v_{ji}.
\]

\(p_i\) représente l’effet aval d’une variation de Yᵢ sur Y₈ ; \(v_{ji}\) celui d’une variation du transfert qⱼᵢ. Pour une bifurcation j→a,b de fractions sⱼ et 1−sⱼ :

\[
\frac{dY_8}{ds_j}=Y_j(v_{ja}-v_{jb}),\qquad
\frac{dY_8}{de_i}=p_i\phi_iX_i,\qquad
\frac{dY_8}{d\varepsilon_{ij}}=p_i\phi_iX_iq_{ji}.
\]

Ces expressions incluent la propagation vers tout le réseau aval. Les paramètres d’un groupe non étudié sont fixes dans la différentielle de l’étude. La différentiabilité dépend du groupe : un état peut être constant quand les parts varient mais se trouver au seuil quand un environnement varie. Une sélection d’adjoint à une rupture n’est pas annoncée comme un gradient classique.

Ainsi, pour l’étude des seules distributions,

\[
d\mathcal L_{\mathrm{comp}}=dY_8=
\sum_{j\in\{1,2,5,3,7\}}Y_j(v_{ja}-v_{jb})\,ds_j.
\]

Pour les environnements, la somme devient \(\sum_{i=2}^8p_i\phi_iX_i\,de_i\). Pour les concordances actives, elle devient \(\sum_{j\to i}p_i\phi_iX_iq_{ji}\,d\varepsilon_{ij}\). Dans ces deux cas, les distributions restent celles des réglages de départ. Les deux dérivées annoncées au centre d’une nappe sont les deux composantes correspondantes de ce même gradient ; changer les axes ne relance pas une optimisation des autres coordonnées.

Les multiplicateurs correspondant à cette convention de signe sont :

\[
\mu_i=-p_i,\qquad\lambda_i=-p_i\phi_iC_i,\qquad\eta_j=-p_j.
\]

Les dérivées **libres** du lagrangien, distinctes des dérivées précédentes sur les états compatibles, valent dans une portion régulière :

\[
\partial_{X_i}\mathcal L=\lambda_i-\mu_i\phi_iC_i,\quad
\partial_{q_{ji}}\mathcal L=\eta_j-\lambda_i-\mu_i\phi_iX_i\varepsilon_{ij},
\]
\[
\partial_{Y_i}\mathcal L=\mu_i-\eta_i\quad(i<8),\qquad
\partial_{Y_8}\mathcal L=1+\mu_8.
\]

À un maximum intérieur différentiable du groupe choisi, son gradient doit être nul. Pour une coordonnée à sa borne inférieure, la dérivée doit être ≤0 ; à la borne supérieure, elle doit être ≥0. Ce sont des **conditions nécessaires**, pas une preuve de maximum global ni même une condition suffisante de maximum local. Le résidu projeté \(\Pi_{[l,u]}(z+\nabla Y_8)-z\) sert de diagnostic de stationnarité sur la boîte, avec les mêmes limites.

## Lire le tableau, le graphe et les nappes

Pour chaque nœud, le tableau indique les contributions reçues, leur somme Xᵢ, l’environnement eᵢ, le coefficient Cᵢ, la sortie Yᵢ et les transferts distribués sous la forme \(\alpha_{ij}\times Y_i=q_{ij}\). La source n’a pas d’entrée calculée ni de TH₁ ; le nœud 8 donne le résultat final et aucune sortie de transfert. Le graphe affiche les fractions et les transferts, avec des valeurs supplémentaires au survol. Les arrondis d’affichage ne sont pas réinjectés dans les calculs.

Les axes de la nappe compatible sont deux variables du groupe étudié. Toutes les autres restent à la configuration retenue ; l’ensemble du réseau est recalculé à chaque point. Le centre correspond au meilleur état trouvé après une recherche, ou au départ si aucune recherche n’est disponible. Les deux coupes orthogonales passent exactement par ce centre. Le rayon est tronqué aux bornes admissibles : une référence située au bord ne devient pas artificiellement un maximum intérieur.

Les hauteurs sont les valeurs signées effectivement calculées, avec leur échelle numérique. Le cadrage local peut agrandir un faible écart sans changer ces valeurs. Plateau, bord, rupture ou selle sont conservés ; aucun sommet bombé ni gradient nul n’est fabriqué. Le CSV conserve les échantillons de la nappe ; l’export JSON distingue modèle initial, modèle retenu, recherches, état, différentielles et lagrangien.

## Organisation du code Python

- `ui_concordances.py` : commandes, résultats et figures de la page 04.
- `physique_graphes/types_concordances.py` : catalogues `MATRIX_TYPES` et `ENVIRONMENT_TYPES`, générations indépendantes et provenance par composante. `create_default_model(seed=34)` fournit un départ reproductible pour un script ; l’interface peut choisir une nouvelle graine initiale et l’afficher.
- `physique_graphes/optimisation_concordances.py` : `variables`, `apply_values`, `gradient`, `search` pour le groupe choisi. Les recherches utilisent les mêmes lois natives, sans donner aux solveurs les maxima de préréglages.
- `physique_graphes/concordances.py` : propagation, calculs différentiels et lagrangien 26/21 ; recherche par intervalles sur les parts.
- `physique_graphes/visualisation.py` : matrices, flux, profils et nappes Plotly.

Le [guide Python](../python/README.md) décrit l’installation locale, les exports et le carnet. Les anciens exemples complets restent des références identifiées ; leurs graines avec e=0,5 ne doivent pas être confondues avec le nouveau départ à e=0. Les vérifications effectivement réalisées sont consignées dans le journal des avancées, séparément de cette description du modèle.
