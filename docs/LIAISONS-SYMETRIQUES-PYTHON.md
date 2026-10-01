# Point 05 — Liaisons symétriques et maximum de la sortie 8

Cette page détaille **l’exemple initial à huit nœuds**. Le point 05 permet désormais de [construire et analyser un graphe de 2 à 24 nœuds](GRAPHES-PERSONNALISES-PYTHON.md), avec réduction automatique des variables, lagrangien, dérivées et nappes adaptés au graphe saisi.

Cette étude Python applique la formulation de l’auteur, avec les précisions confirmées le 1er octobre 2026 : **support non orienté**, matrice symétrique doublement stochastique, **Exp. OUT₈ = Exp. IN₈**. Le document source reste privé. Le point 04 conserve son propre modèle, ses concordances ε et ses environnements.

## Sens des liaisons et du calcul

Le support comporte huit nœuds et douze liaisons : 1–2, 1–5, 2–3, 2–8, 5–3, 5–7, 7–6, 7–4, 3–4, 3–6, 4–8, 6–8. Il comporte des cycles non orientés ; « arbre » désigne ici le dessin historique, et non un arbre au sens de la théorie des graphes.

Chaque liaison porte un poids unique `aᵢⱼ = aⱼᵢ`. La matrice A est symétrique, de diagonale nulle, nulle hors support, à coefficients dans [0,1]. Chaque ligne et chaque colonne somme à 1.

Pour calculer les entrées, les transferts suivent **l’orientation historique vers 8** : 1→2, 1→5, 2→3, 2→8, 5→3, 5→7, 7→6, 7→4, 3→4, 3→6, 4→8, 6→8. Le support est non orienté ; le calcul n’est pas un équilibre bidirectionnel `X = AX` et ne simule aucune circulation récurrente.

Avec Xᵢ = Exp. INᵢ et Yᵢ = Exp. OUTᵢ :

\[
X_1=1,\quad q_{ij}=a_{ij}X_i,\quad X_i=\sum_{j\to i}q_{ji},\quad
Y_i=\sum_{i\to j}q_{ij}\ (i<8),\quad R=Y_8=X_8.
\]

**a multiplie l’entrée X**, pas la sortie Y. Les sommes à 1 de A concernent tous les voisins ; les sommes vers l’aval peuvent être inférieures à 1. La part Xᵢ−Yᵢ n’est pas transmise dans cette convention, sans réinjection ni renormalisation. Le bilan calculé est `1 = R + Σᵢ<8(Xᵢ−Yᵢ)`. Tous les flux sont non négatifs, donc `|OUT8| = OUT8` ; il n’est pas nécessaire de dériver une valeur absolue.

## Pourquoi cinq variables suffisent

Le graphe est biparti : `{1,3,7,8}` et `{2,4,5,6}`. Les huit équations de sommes nodales sur douze poids ont exactement le rang 7. La somme des équations d’un groupe égale celle de l’autre. Le rang exact est contrôlé par élimination rationnelle dans les tests. Les colonnes n’ajoutent aucune équation à cause de la symétrie.

On choisit :

\[
(t,u,v,w,z)=(a_{12},a_{23},a_{35},a_{34},a_{67}).
\]

| Liaison | Poids reconstruit |
|---|---|
| 1–2 | t |
| 1–5 | 1−t |
| 2–3 | u |
| 2–8 | 1−t−u |
| 3–5 | v |
| 5–7 | t−v |
| 6–7 | z |
| 4–7 | 1−t+v−z |
| 3–4 | w |
| 3–6 | 1−u−v−w |
| 4–8 | t−v+z−w |
| 6–8 | u+v+w−z |

Les douze expressions doivent rester **≥ 0** ; les bornes ≤ 1 découlent des sommes à 1. Le domaine est un polytope couplé, pas tout le cube [0,1]⁵. Le départ `(1/2,1/4,1/4,1/4,1/4)` rend les douze poids strictement positifs : la dimension admissible est bien 5, et ce nombre de coordonnées est minimal pour une paramétrisation locale régulière.

## Objectif et lagrangien réduit

Posons :

\[
A=X_3=tu+(1-t)v,\quad B=X_7=(1-t)(t-v),
\]
\[
H=1-t+v-z,\quad J=1-u-v-w,\quad K=t-v+z-w,\quad M=u+v+w-z,\quad D=1-t-u,
\]
\[
P=X_4=wA+HB,\quad Q=X_6=JA+zB,\qquad R=tD+KP+MQ.
\]

Les égalités sont éliminées. En notant `a = bₐ + Bₐ θ`, θ=(t,u,v,w,z), le lagrangien de maximisation avec inégalités est :

\[
\mathcal L(\theta;\mu)=R(\theta)+\sum_e\mu_e a_e(\theta),\qquad \mu_e\geq0.
\]

Le signe **+** correspond aux contraintes a≥0 pour une maximisation. Les KKT requièrent `∇R+Bₐᵀμ=0`, `a≥0`, `μ≥0`, `μₑaₑ=0`. Elles ne constituent pas une preuve globale. **ℒ=R à une référence complémentaire ; ce n’est pas une identité sur tout le domaine admissible**, car les inégalités ne sont pas des égalités.

Pour k∈{t,u,v,w,z}, les dérivées utilisées par le moteur sont :

\[
A_t=u-v,\ A_u=t,\ A_v=1-t,\ A_w=A_z=0,
\quad B_t=1-2t+v,\ B_v=t-1,\ B_u=B_w=B_z=0;
\]
\[
P_k=wA_k+A\delta_{kw}+HB_k+BH_k,\quad
Q_k=JA_k+AJ_k+zB_k+B\delta_{kz};
\]
\[
R_k=\delta_{kt}D+tD_k+K_kP+KP_k+M_kQ+MQ_k.
\]

Les dérivées Dₖ, Hₖ, Jₖ, Kₖ, Mₖ se lisent directement dans leurs expressions affines. Les cinq dérivées de ℒ sont affichées développées dans l’interface, avec le tableau de ces constantes.

## Résultats et portée du maximum

Le départ intérieur donne exactement **13/64 = 0,203125**. Une recherche SLSQP à partir de ce seul départ donne environ **0,297652481895**, valeur inférieure à celle trouvée avec plusieurs départs. La recherche à 16 départs, graine 42, retient :

\[
(t,u,v,w,z)=(1/2,0,0,0,0),\qquad R=5/16=0,3125.
\]

Les chemins actifs contribuent pour `1→2→8 : 1/4` et `1→5→7→4→8 : 1/16`. Le poids a₃₆ vaut 1, mais X₃ est nul. Les nœuds 3 et 6 ne sont pas alimentés dans cette configuration. Aucune contrainte d’activation de tous les nœuds n’est ajoutée. Le témoin `(1/2,0,1/2,1/2,1)` donne également 5/16 ; ne pas présenter la configuration comme unique.

La vérification globale, indépendante de SLSQP, encadre le polynôme R sur le polytope :

\[
0,3125\ \leq\ \max R\ \leq\ 0,312500998530
\]

La dernière décimale affichée ici est arrondie vers le haut. Le calcul par défaut ferme un écart inférieur à 10⁻⁶ en environ 16 900 subdivisions (budget 30 000). **Il certifie cette précision globale, pas l’égalité exacte max R = 5/16.** Le témoin vaut exactement 5/16, ce qui est vérifié en rationnels ; la borne supérieure reste légèrement supérieure.

Le certificat transforme le polynôme quartique en base tensorielle de Bernstein sur [0,1]⁵. Les coefficients initiaux sont construits en rationnels puis majorés en flottants. Les subdivisions dyadiques utilisent des arrondis dirigés vers +∞ ; un test affine également majorant écarte seulement les boîtes certainement incompatibles. Le maximum des coefficients de chaque boîte majore R. Les boîtes restantes couvrent toutes les configurations non éliminées. Une fin de budget conserve la borne supérieure et indique **borne ouverte**, sans inventer une convergence. Un arrêt dû à la précision machine est aussi distingué.

À la référence canonique, un jeu de multiplicateurs est :

\[
\mu_{23}=3/8,\quad\mu_{67}=1/8,\quad\mu_{68}=1/8,
\]

les autres étant nuls. On obtient `∇R=(0,−1/2,−1/8,−1/8,0)` et **∇ℒ=0**. Les dérivées non nulles de R sont compatibles avec un maximum sur des frontières actives.

## Nappes et dérivées explicites

L’interface permet toutes les paires parmi les cinq a indépendants. Les trois autres coordonnées restent fixes. Chaque coupe affiche son polynôme et ses deux dérivées, calculés à partir du même moteur. Le voisinage inclut exactement `(x₀,y₀)` ; les points incompatibles sont masqués pour R, et les profils passent par la référence. Certaines paires peuvent n’admettre qu’une ligne ou un point : ce n’est pas corrigé en inventant un domaine.

Par défaut, `x=a12=t`, `y=a35=v`, avec u=w=z=0 et `(x₀,y₀)=(1/2,0)` :

\[
R=x^4-3x^3y+3x^2y^2-2x^3+5x^2y-5xy^2-2xy+2y^2+x,\qquad \mathcal L=R+y/8.
\]
\[
\mathcal L_x=4x^3-9x^2y+6xy^2-6x^2+10xy-5y^2-2y+1,
\]
\[
\mathcal L_y=-3x^3+6x^2y+5x^2-10xy-2x+4y+1/8.
\]

À `(1/2,0)`, les deux dérivées de ℒ valent zéro, tandis que Rᵧ=−1/8. La Hessienne de cette coupe vaut `[[−3,3/4],[3/4,1/2]]` : elle est indéfinie. **La coupe libre de ℒ a donc une selle, pas un dôme maximal.** R atteint sa meilleure valeur admissible sur une frontière ; masquer les poids interdits est essentiel.

Pour `x=a12=t`, `y=a23=u`, avec v=w=z=0 :

\[
R=x^4-xy^3-2x^3+xy^2-xy+x,\qquad \mathcal L=R+y/2,
\]
\[
\mathcal L_x=4x^3-y^3-6x^2+y^2-y+1,\qquad
\mathcal L_y=-3xy^2+2xy-x+1/2.
\]

Les deux dérivées s’annulent aussi à `(1/2,0)`. La Hessienne `[[−3,−1],[−1,1]]` est également indéfinie. Ces deux exemples rendent explicite la distinction entre stationnarité de ℒ et maximum contraint de R.

## Utilisation depuis Python

Depuis le dossier `python/`, ou le carnet configuré avec ce dossier dans son chemin :

```python
from physique_graphes import stochastique as s

resultat = s.search(s.START, method="multi", seed=42, starts=16)
theta = resultat["best"]
etat = s.evaluate(theta)
derivees = s.kkt(theta)
borne = s.global_bound(theta, tolerance=1e-6, max_boxes=30000)
x, y, r = s.surface(theta, axes=(0, 2), radius=.15, points=31)
print(theta, etat["objective"], borne)
```

Le moteur est dans `physique_graphes/stochastique.py`, la présentation dans `ui_stochastique.py`. Les exports de l’interface rassemblent départ, conventions, recherches, borne, matrice, flux, dérivées et échantillons de la nappe. Le fichier JSON n’exécute aucun code. Toute modification de la topologie ou des lois dans le module impose de redériver la paramétrisation, le polynôme et le certificat ; les résultats de ce point 05 ne s’étendent pas automatiquement à d’autres modèles.
