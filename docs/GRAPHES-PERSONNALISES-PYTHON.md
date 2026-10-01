# Point 05 — Construire et analyser un graphe de 2 à 24 nœuds

Le point **05** devient un atelier de graphes personnalisés, avec l’exemple à huit nœuds comme départ. Il ne crée pas un sixième point. La présentation privilégie quatre onglets : **Construire le graphe**, **Lagrangien et dérivées**, **Optimum et flux**, **Nappes**. La construction s’ouvre en premier et la validation conduit directement aux expressions mathématiques.

Les conventions restent : support non orienté, matrice A symétrique doublement stochastique, diagonale nulle, poids nuls hors liaisons, IN₁=1,0 et OUTₙ=INₙ au dernier nœud. Les résultats sont calculés. Le [développement de l’exemple initial](LIAISONS-SYMETRIQUES-PYTHON.md) conserve sa portée propre.

## Dessiner à la souris

1. Dans **Construire le graphe**, choisir le **Nombre de nœuds** (2 à 24), puis **Créer un dessin vide**. Ce bouton remplace les liaisons du brouillon ; l’étude validée est conservée. On peut aussi modifier directement l’exemple initial.
2. Avec **Relier les nœuds**, cliquer sur le premier puis le second nœud, ou tirer une liaison de l’un vers l’autre. Une liaison existante peut être retirée en cliquant dessus ou en sélectionnant à nouveau ses deux extrémités. Les doublons et les boucles sur un seul nœud sont exclus.
3. Avec **Déplacer les nœuds**, tirer les nœuds pour organiser le dessin. Leur position n’affecte ni les coefficients ni l’ordre de propagation. **Annuler la dernière modification du dessin** permet de revenir jusqu’à trente gestes en arrière (liaisons ou déplacements).
4. Choisir **Valider le graphe et passer à l’analyse**. Le contrôle de connexité et de faisabilité s’effectue avant remplacement de l’étude. L’onglet du lagrangien s’ouvre automatiquement en cas de succès.
5. Choisir **Rechercher le maximum**, puis **Nappes**. Chaque nappe choisit exactement deux coordonnées indépendantes, toutes les autres restant fixées à la configuration retenue. Il faut que le graphe validé ait au moins deux degrés libres ; l’éditeur ne crée pas de variables fictives si les contraintes en laissent moins.

Les nœuds et les liaisons sont accessibles au clavier : Tab pour les atteindre, Entrée ou Espace pour sélectionner ; Échap annule une sélection. La position des nœuds est conservée dans les exports JSON et reprise par le graphe de résultat après validation. Les fichiers plus anciens, sans positions, restent importables.

L’éditeur SVG utilise les [composants intégrés de Streamlit](https://docs.streamlit.io/develop/api-reference/custom-components/st.components.v2.component), sans service externe ni nouvelle installation. Les gestes ne transmettent que des liaisons et des positions numériques au serveur local ; une révision périmée ou des données invalides sont refusées. Les recherches ne sont pas relancées à chaque trait.

## Saisie au clavier, en complément

1. Ouvrir **Saisie au clavier et ordre de calcul**, conserver le dessin initial ou choisir **Nouveau graphe depuis 1**.
2. Choisir le **Nœud à renseigner**, saisir ses voisins, par exemple `2, 5, 9`, puis **Enregistrer les liaisons**.
3. Les références futures créent automatiquement les nœuds jusqu’au plus grand numéro saisi, au maximum 24. Le plus grand numéro est le terminal N. Les nœuds intermédiaires créés doivent ensuite être reliés.
4. Renseigner les autres nœuds. La saisie remplace toutes les liaisons du nœud choisi, dans les deux sens ; un champ vide les retire. Une liaison déjà indiquée par son autre extrémité n’est comptée qu’une fois. Les boucles d’un nœud vers lui-même sont refusées.
5. Vérifier l’**ordre de calcul**, commençant par 1 et finissant par N, puis choisir **Valider le graphe et passer à l’analyse**.
6. Les formules sont disponibles dès validation. **Rechercher le maximum** lance les recherches et l’encadrement avec les budgets choisis.

Le brouillon et l’étude validée sont distincts. Une construction incomplète ou impossible reste modifiable ; elle ne remplace pas la dernière analyse valide. Le bandeau indique explicitement lorsque les calculs concernent encore cette dernière. L’ajout ou le retrait du dernier nœud modifie le terminal du brouillon.

Le panneau JSON enregistre une construction ou en reprend une, sans exécuter de code. L’export de l’étude complète contient également la construction validée. Le départ numérique peut être saisi avec des fractions, par exemple `1/2, 1/4` dans l’ordre des variables affichées.

Quatre constructions supplémentaires sont proposées : le graphe complet à quatre nœuds avec **exactement deux variables indépendantes**, un triangle à coefficients tous imposés, un cycle à quatre nœuds avec une seule variable, et une échelle à vingt-quatre nœuds avec onze variables. Le premier possède six liaisons et quatre égalités indépendantes ; sa recherche atteint R=1, borne de conservation globale. Ce résultat n’est pas une preuve particulière applicable à tous les dessins.

## Un support non orienté, un ordre de propagation explicite

Les coefficients vérifient aᵢⱼ=aⱼᵢ. Pour calculer les entrées, chaque liaison transmet du nœud le plus tôt au nœud le plus tard dans l’ordre choisi. Cet ordre peut différer de la numérotation : celui de l’exemple initial est `1, 2, 5, 3, 7, 4, 6, 8`.

Il n’y a donc pas de boucle temporelle ni d’équilibre bidirectionnel X=AX. Changer l’ordre change le problème de production, même si la matrice symétrique conserve ses contraintes. La borne particulière de l’exemple initial n’est réutilisée que si **son support et son ordre** sont identiques.

Pour i avant j :

\[
q_{ij}=a_{ij}X_i,\quad X_1=1,\quad X_j=\sum_{i\to j}q_{ij},\quad
Y_i=\sum_{i\to j}q_{ij}\ (i\ne N),\quad R=Y_N=X_N.
\]

La somme de tous les voisins vaut 1, tandis que la somme aval peut être inférieure à 1. Les différences Xᵢ−Yᵢ sont comptées comme parts non transmises, sans redistribution. Le bilan reste `1=R+Σᵢ≠N(Xᵢ−Yᵢ)`, d’où 0≤R≤1. Les branches qui ne conduisent pas au terminal peuvent ainsi absorber une partie du flux ; elles ne sont pas supprimées en secret.

## Déterminer réellement le minimum de variables

Notons m le nombre de liaisons uniques, a le vecteur de leurs poids et H la matrice d’incidence non signée : chaque colonne possède deux 1, à ses extrémités. Les contraintes sont `Ha=1` et `a≥0`. Elles impliquent a≤1.

Le moteur suit trois étapes :

1. Vérifier la faisabilité du système. Un graphe connecté ne garantit pas l’existence d’une matrice compatible. Par exemple, sur la chaîne 1–2–3, les feuilles imposeraient a₁₂=a₂₃=1, ce qui contredit la somme 1 au nœud 2. Les contraintes ne sont pas relâchées pour accepter ce graphe.
2. Maximiser séparément chaque poids pour trouver les liaisons imposées à zéro. Une classification « zéro forcé » est vérifiée par un certificat dual rationnel : `Hᵀy≥eₖ` et `Σyᵢ=0` impliquent `aₖ≤0`, donc aₖ=0. Les configurations non nulles sont elles aussi relues en rationnels.
3. Éliminer ces zéros puis effectuer une réduction de Gauss en arithmétique rationnelle sur les égalités restantes. Les coordonnées libres θ sont de vrais coefficients aᵢⱼ, et tous les autres s’écrivent **a=b+Bθ**.

La dimension effective est :

\[
d=m-\#\{\text{poids forcés à zéro}\}-\operatorname{rang}(H_{\mathrm{restant}}).
\]

La moyenne des témoins vérifiés fournit un point strictement positif sur toutes les liaisons non forcées. Le polytope possède donc un intérieur relatif dans l’espace affine calculé : d est bien le nombre minimal de coordonnées indépendantes, et non une estimation du nombre de paramètres.

Cette distinction compte : un graphe peut posséder un degré libre dans les seules égalités, mais aucun après prise en compte des poids non négatifs. Les tests comprennent un tel cas. Le graphe complet à 24 nœuds possède 276 liaisons et 252 coordonnées libres ; sa construction et sa réduction sont acceptées, mais son optimisation peut être coûteuse.

## Lagrangien avec les seules coordonnées indépendantes

Les entrées Xᵢ sont des fonctions calculées de θ, sans devenir de nouvelles variables d’optimisation. Les égalités étant éliminées :

\[
\boxed{\mathcal L(\theta;\mu)=X_N(\theta)+\sum_{e\in E}\mu_e\left(b_e+\sum_{k=1}^{d}B_{ek}\theta_k\right)},\qquad\mu_e\geq0.
\]

Le signe + correspond à une maximisation sous a≥0. Les poids fixes utilisent μ=0. Les multiplicateurs sont des outils de diagnostic des contraintes ; ils ne sont pas maximisés comme des paramètres de production.

La présentation conserve les substitutions successives Xⱼ=ΣaᵢⱼXᵢ et la table exacte de reconstruction des a. Cette forme factorisée évite une expansion exponentielle en centaines de variables, tout en explicitant intégralement le calcul de R.

Introduisons les sensibilités adjointes :

\[
p_N=1,\qquad p_i=\sum_{i\to j}a_{ij}p_j,\qquad p_i=\frac{\partial R}{\partial X_i}.
\]

Elles se calculent dans l’ordre inverse de la propagation. Pour chaque coordonnée indépendante :

\[
\frac{\partial R}{\partial\theta_k}=\sum_{e=(i\to j)}B_{ek}X_i p_j,
\qquad
\boxed{\frac{\partial\mathcal L}{\partial\theta_k}=\sum_{e=(i\to j)}B_{ek}(X_i p_j+\mu_e)}.
\]

Le menu de dérivation développe cette expression pour chaque coefficient a choisi comme coordonnée. Le tableau fournit toutes les valeurs de ∂R et ∂ℒ. Les KKT contrôlées sont `a≥0`, `μ≥0`, `μₑaₑ=0` et `∇ℒ=0`, avec résidus affichés. Un petit résidu KKT ne prouve pas un maximum global.

## Recherches, bornes et nappes

SLSQP utilise les gradients analytiques ci-dessus. Une recherche peut partir d’un seul état ou de plusieurs états reproductibles, tirés à partir de sommets admissibles. Les candidats conservés sont vérifiés en rationnels. Une simplification rationnelle ou une légère contraction vers le départ intérieur peut produire un témoin admissible distinct du résultat flottant brut ; ce traitement figure dans l’export.

Pour le support et l’ordre initiaux, le certificat Bernstein existant reste disponible. Pour les autres graphes, une subdivision en intervalles majore les coefficients affines, puis propage des majorations des entrées, avec arrondis dirigés. La conservation fournit aussi la borne R≤1. Les budgets épuisés conservent une **borne ouverte** : ni une recherche locale ni un nombre de départs fixé ne garantissent l’optimum global de tous les graphes à 24 nœuds. Pour d=0, le domaine est un point et sa valeur est le maximum exact.

Les nappes choisissent deux coefficients parmi les coordonnées indépendantes, en fixant les autres au meilleur résultat trouvé, ou au départ avant recherche. Les poids dépendants et tous les flux sont recalculés. Le développement en **deux variables seulement** permet d’afficher h(x,y), hₓ et hᵧ sans développer le polynôme complet en d variables.

- **R admissible** : les points hors contraintes sont masqués. Une frontière, une ligne ou un point ne sont pas transformés artificiellement en dôme.
- **ℒ libre à μ fixés** : la formule peut être évaluée hors contraintes. ℒ n’est alors pas une production et son point stationnaire peut être une selle. Même dans le domaine admissible, ℒ=R exige la complémentarité.
- **Une variable indépendante** : une courbe remplace la nappe.
- **Aucune variable indépendante** : la configuration unique est expliquée ; aucune surface fictive n’est tracée.

## Réutiliser le moteur en Python

```python
from physique_graphes import graphes_symetriques as g

modele = g.initial_graph()
modele = g.set_neighbors(modele, 1, [2, 5])  # remplace les voisins de 1
graphe = g.compile_graph(modele)
print(graphe.names, graphe.d)

resultat = g.search(graphe, method="multi", seed=42, starts=12)
etat = graphe.state(resultat["best"])
kkt = graphe.kkt(resultat["best"])
borne = g.global_bound(graphe, resultat, max_boxes=30000)
x, y, r = g.surface(graphe, resultat["best"], axes=(0, 2))
```

Le modèle JSON contient `n`, `edges` et `order`. Les liaisons sont des paires de numéros, de 1 à n. Le moteur générique est `physique_graphes/graphes_symetriques.py`, l’interface `ui_graphes_symetriques.py`. Le module historique `stochastique.py` reste disponible pour reproduire et vérifier l’exemple initial. L’export conserve modèle validé, départ, variables, réduction rationnelle, certificats des zéros forcés, recherches, bornes, flux, KKT et échantillons des figures.
