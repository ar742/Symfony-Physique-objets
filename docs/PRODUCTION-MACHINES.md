# Production en réseau : machines, répartitions et itérations

Cadre du prototype demandé le 10 septembre 2026, dans la continuité des [fondements](FONDEMENTS-DU-PROJET.md) et des [quatre formes d’analyse](FORMES-ANALYSE.md). Les données sont fictives ; les résultats sont calculés. Le modèle décrit une alimentation normalisée transformée en une production normalisée, avec des échanges entre machines. Il ne reproduit ni une installation industrielle, ni un bilan énergétique mesuré. Cet atelier reste distinct des huit exemples méthodologiques et des 37 fiches du cas 4.

## La transformation appartient au nœud

Chaque nœud représente une machine et porte une chaîne **Exp. IN → TH → Exp. OUT**, de coordonnées **machine + 1.0**, **machine + 2.0**, **machine + 3.0** :

| Position | Attributs et traitement |
| --- | --- |
| 1.0 · Exp. IN | Alimentation disponible x, provenance des contributions, paramètres de la machine et contexte de l’étape |
| 2.0 · TH | Application de la fonction de production y = f(x), avec seuil, croissance et éventuelle décroissance |
| 3.0 · Exp. OUT | Production y calculée, destinée à une répartition déclarée |

La machine relève du **cas 1b** : l’alimentation et la production sont de nature différente. Leur représentation commune dans l’intervalle [0,1] ne les rend pas identiques. Leurs échelles de normalisation et leur interprétation doivent rester distinctes. Les paramètres a, b, c, d, les allocations et les apports extérieurs constituent le contexte ; ils ne remplacent pas les attributs principaux suivis.

Dans le premier [atelier de graphes](ETUDES-GRAPHES.md), l’analyse portait sur les branches entre villes. Ici, **les nœuds portent la transformation**, tandis que les arcs orientés représentent une allocation ou un transport de production vers un destinataire. Plusieurs fournisseurs peuvent alimenter une machine ; les répartitions réciproques sont possibles. Un arc i → j et un arc j → i ont des fractions indépendantes. Leur présence ne signifie ni égalité des échanges ni trajet à optimiser.

Le réseau peut transmettre la sortie d’une machine à l’entrée d’une autre après conversion explicite. Cette dépendance entre machines ne constitue pas une chaîne analytique de retour 4–6 : chaque machine conserve ici son triplet ouvert du cas 1.

## Fonction de production et cas limites

Pour une machine, les paramètres vérifient :

`0 ≤ a < b < 1` et `0 ≤ d ≤ c ≤ 1`.

L’entrée x appartient à [0,1]. La fonction est définie par :

```text
          0                                  si 0 ≤ x ≤ a
f(x) =    c (x − a) / (b − a)                 si a < x ≤ b
          c + (d − c) (x − b) / (1 − b)       si b < x ≤ 1
```

Les dénominateurs sont strictement positifs. Les expressions se raccordent en a et b : `f(a) = 0`, `f(b) = c`, `f(1) = d`. La fonction est continue et vérifie `0 ≤ f(x) ≤ c`. La pente croissante vaut `c/(b−a)` ; la pente du dernier segment vaut `(d−c)/(1−b)`.

a représente un seuil d’alimentation. Une interprétation énergétique pourrait poser `x = E/E_référence` pour une opération et une échelle d’énergie déclarées ; le seuil serait alors `a E_référence`. Le prototype ne fixe pas cette échelle et ne transforme pas automatiquement y en énergie. **À x = a, la production est encore nulle** ; elle devient positive au-delà de a lorsque c > 0.

Les cas limites font partie du modèle :

- Si `c > 0` et `d < c`, la fonction croît strictement entre a et b, puis décroît strictement jusqu’à 1 ; son maximum c est atteint uniquement en b.
- Si `d = c > 0`, le dernier segment est un plateau : tous les x de [b,1] donnent c.
- Si `c = 0`, la contrainte impose `d = 0` et la fonction est identiquement nulle.
- Lorsque `c > 0`, les zéros sont les x de [0,a], auxquels s’ajoute x = 1 si d = 0. Si a = 0, la zone initiale nulle se réduit à ce point.

Avec une décroissance effective, une alimentation supplémentaire peut donc réduire la production. f est une **fonction de production**, pas un rendement défini par le rapport y/x. La valeur c est un maximum local à cette loi de machine sur son domaine ; elle n’annonce pas un optimum de fonctionnement du réseau. Aucune conservation de l’énergie n’est déduite des bornes [0,1].

## Répartir et convertir les échanges

On note `r_ij` la fraction de la production de la machine i allouée à la machine j. Pour chaque **source i** :

`r_ij ≥ 0` et `Σ_j r_ij ≤ 1`.

La somme est sortante : elle porte sur tous les destinataires d’une même source. Elle ne limite pas à 1 la somme des apports reçus par une machine depuis plusieurs fournisseurs. Les paramètres sont fixes pendant une exécution du scénario.

À l’étape k, la quantité de production allouée sur i → j est :

`p_ij[k] = r_ij y_i[k]`.

Le coefficient `κ_ij > 0` convertit cette production en contribution à l’alimentation de j :

`h_ij[k] = κ_ij p_ij[k]`.

Les scénarios du prototype posent explicitement **κ_ij = 1**. Cette convention identifie des valeurs numériques après conversion dans le modèle abstrait ; elle n’identifie pas la nature des grandeurs avant conversion. Une application réelle devrait préciser les produits compatibles, les unités, les références de normalisation et les coefficients de conversion. Des productions de natures différentes ne deviennent pas additionnables par leur seul nom.

La fraction non allouée au réseau reste une sortie externe de la machine source :

`p_i,ext[k] = (1 − Σ_j r_ij) y_i[k]`.

L’identité `Σ_j p_ij[k] + p_i,ext[k] = y_i[k]` décrit la répartition de **la même production**. Ce n’est pas un bilan énergétique entre alimentation et production. Une sortie externe n’est pas nécessairement vendue, utile ou perdue : ces qualifications demanderaient un objectif et un modèle supplémentaires.

## Une mise à jour synchrone explicite

Chaque machine i reçoit un apport externe constant `e_i ∈ [0,1]`. À partir du vecteur des productions y[k], on calcule simultanément :

```text
s_i[k]     = e_i + Σ_j κ_ji r_ji y_j[k]       alimentation proposée
x_i[k]     = min(1, s_i[k])                   alimentation retenue
u_i[k]     = s_i[k] − x_i[k]                  surplus non absorbé
y_i[k+1]   = f_i(x_i[k])                      production suivante
```

Les indices j → i désignent ici les fournisseurs de i. Les apports étant non négatifs, le plafonnement assure `x_i[k] ∈ [0,1]`. Toutes les productions suivantes sont calculées avec **le même ancien vecteur y[k]**. Une machine déjà calculée ne fournit pas y[k+1] aux machines restantes pendant cette étape. L’ordre de la liste des machines ne doit donc pas changer le résultat.

Cette règle est une itération synchrone, avec un décalage d’une étape entre x[k] et y[k+1]. Le compteur k dénombre des cycles abstraits ; aucune durée en secondes ou durée industrielle n’est inférée. L’état initial est le vecteur nul dans les scénarios proposés, ou une configuration initiale explicitement déclarée dans [0,1]. Dès la première mise à jour, chaque sortie est comprise entre 0 et son c_i.

Le surplus `u_i[k] = max(0,s_i[k]−1)` est affiché et **n’est pas stocké ni reporté**. Il est de nature alimentation, alors que `p_i,ext[k]` reste de nature production. Le modèle ne choisit pas quel fournisseur a fourni la part non absorbée ; il ne réaffecte pas automatiquement cette part. Les valeurs des arcs sont donc des contributions **proposées**, pas une consommation attribuée à chaque fournisseur après plafonnement.

Les fractions répartissent y[k] pendant que x[k] détermine y[k+1]. Pour examiner la répartition de y[k+1], on recalcule séparément `r_ij y_i[k+1]` et sa conversion. Confondre ces deux indices créerait une dépendance instantanée absente du contrat.

Le calcul porte sur le vecteur de toutes les machines, y[k+1] = F(y[k]). Il ne s’agit ni d’une recherche de chemin de Dijkstra ni d’une résolution où les nouvelles valeurs remplacent immédiatement les anciennes, comme dans un schéma de Gauss–Seidel.

## Équilibre approché, convergence et oscillations

Un équilibre du modèle est un vecteur y* tel que `F(y*) = y*`. Pour un état donné, le résidu est :

`ρ(y) = ‖F(y) − y‖∞ = max_i |F_i(y) − y_i|`.

Un résidu inférieur ou égal à la tolérance autorise le libellé **équilibre approché à cette tolérance**. Sans hypothèse supplémentaire, il ne fournit pas une borne sur la distance à un équilibre exact, ne prouve pas sa stabilité et n’établit pas son unicité. Une faible variation des dernières valeurs affichées après arrondi ne remplace pas ce calcul.

L’exécution couvre l’horizon demandé, par défaut 40 cycles, avec une tolérance par défaut de 10⁻⁷. Le résidu final doit être recalculé au **dernier état** : `ρ(y[K])`. La différence `‖y[K]−y[K−1]‖∞` est le résidu de l’état précédent, et peut donner une autre information. Atteindre K cycles ne démontre pas une convergence asymptotique.

Une alternance approximative sur les cinq derniers états peut être signalée comme observation numérique compatible avec une période 2. Une telle détection sur une fenêtre finie ne constitue pas une preuve de périodicité future. Inversement, un scénario dont les deux images sont calculées exactement permet une démonstration particulière, comme ci-dessous.

### Une condition suffisante, distincte de l’observation

Pour une application d’un espace métrique complet dans lui-même, une contraction de facteur strictement inférieur à 1 possède un unique point fixe, atteint par itération depuis tout état initial. Ce résultat est établi dans [Jiří Lebl, *Basic Analysis I*, §7.6.1, théorème 7.6.2, p. 267–268, fourni par MIT 18.100A](https://ocw.mit.edu/courses/18-100a-real-analysis-fall-2020/mit18_100af20_basic_analysis.pdf).

On peut en tirer le critère suivant pour le modèle proposé. Posons :

`L_i = max(c_i/(b_i−a_i), (c_i−d_i)/(1−b_i))`,

puis `L = max_i [L_i Σ_j κ_ji r_ji]`.

Chaque f_i est Lipschitz de constante L_i ; le plafonnement `min(1,s)` n’augmente pas les écarts. La somme des contributions et l’inégalité triangulaire donnent donc `‖F(y)−F(z)‖∞ ≤ L‖y−z‖∞`. Le cube [0,1]^m est complet et F le conserve. **Si L < 1**, le théorème s’applique : l’équilibre est unique et l’itération converge depuis tout vecteur admissible.

Si L ≥ 1, ce majorant ne permet aucune conclusion sur la convergence : ce n’est pas une preuve d’instabilité. Les fractions sortantes limitées à 1 ne suffisent pas à assurer L < 1, puisque le critère combine les pentes de production et les sommes **entrantes**. Ce calcul est un argument mathématique sur les paramètres ; il ne valide pas leur réalisme industriel.

## Trois scénarios fictifs pour comparer les comportements

Les scénarios utilisent les machines M1, M2 et M3, des coefficients κ = 1 et un état initial nul, sauf reprise expressément indiquée. Toutes les fractions non mentionnées sont nulles.

| Scénario | Paramètres communs (a,b,c,d) | Apports externes (e1,e2,e3) | Fractions non nulles |
| --- | --- | --- | --- |
| `balanced` | (0,1 ; 0,5 ; 0,8 ; 0,4) | (0,2 ; 0,15 ; 0,1) | r12 = 0,3 ; r13 = 0,1 ; r23 = 0,25 ; r31 = 0,2 |
| `threshold` | (0,2 ; 0,4 ; 0,8 ; 0,6) | (0,1 ; 0,1 ; 0,1) | r12 = r23 = r31 = 0,5 |
| `oscillating` | (0 ; 0,5 ; 1 ; 0) | (0,5 ; 0,5 ; 0) | r12 = r21 = 0,5 |

Dans `balanced`, le point fixe est :

`y* = (0,275 ; 0,265 ; 0,1875)`.

Les alimentations correspondantes sont `(0,2375 ; 0,2325 ; 0,19375)`. Elles se situent toutes sur le segment croissant ; leur substitution dans f restitue y*. Les productions externes valent `(0,165 ; 0,19875 ; 0,15)`, et les surplus sont nuls. Les constantes L_i valent 2, les sommes entrantes 0,2, 0,3 et 0,35, d’où **L = 0,7 < 1**. Il s’agit donc d’un cas où la convergence et l’unicité se justifient pour tous les états initiaux admissibles.

Dans `threshold`, l’état nul reste nul : chaque apport 0,1 est inférieur au seuil 0,2. Ce blocage depuis zéro ne signifie pas que tout fonctionnement positif soit impossible. Si la configuration initiale vaut 0,8 sur les trois machines, la symétrie conduit à la récurrence scalaire `y_suivant = 0,9 − y/6` sur le segment décroissant utilisé ; elle tend vers `27/35 ≈ 0,7714285714`. Les alimentations limites valent `17/35 ≈ 0,4857142857`. Le vecteur constant 0,4 est également un point fixe, sur le segment croissant. Le scénario admet donc plusieurs équilibres, et l’état initial importe. Ces constats n’inventent pas un mécanisme physique de démarrage.

Dans `oscillating`, les deux premières machines vérifient exactement :

`(0,0,0) → (1,1,0) → (0,0,0)`.

Depuis zéro, leurs apports externes 0,5 les placent au maximum f(0,5) = 1 ; à l’étape suivante, l’échange réciproque porte leur alimentation à 1, où f(1) = 0. M3 reste isolée et nulle. Cette alternance démontre une période 2 pour cet état initial et ces paramètres précis. Le vecteur `(0,5 ; 0,5 ; 0)` est pourtant un point fixe : son existence n’impose pas que l’itération partie de zéro y converge.

## Données, calculs et contrôles de mise en œuvre

L’atelier est accessible sous `/graphes/production`. L’interface distingue les paramètres en préparation des paramètres appliqués, la courbe d’une machine, l’historique du réseau et l’exploration indépendante d’une entrée x. Déplacer ce dernier curseur ne modifie pas le scénario calculé. Les coordonnées d’analyse restent qualifiées par la machine, le cas 1b et la position du triplet.

Au cycle examiné k ≥ 1, l’écran présente la production y[k] et l’alimentation **x[k−1] qui l’a produite**. La table des fournisseurs correspond aux apports issus de y[k−1]. Le graphe et la répartition courante présentent les envois issus de **y[k]**, disponibles pour le calcul suivant. Cette distinction permet de suivre une transition sans confondre ses causes déclarées et ses nouvelles sorties.

Le moteur `app/public/scripts/production-engine.mjs` sépare la loi de machine, la mise à jour du réseau et les scénarios. Son contrat distingue les productions précédentes, les alimentations brutes/retenues, le surplus, les nouvelles productions et les sorties externes. Les objets d’arc séparent la production envoyée (`sent`) et sa contribution convertie (`offered`), ainsi que leurs valeurs pour le nouvel état (`nextSent`, `nextOffered`). L’interface doit conserver ces significations lorsqu’elle présente une transition.

Le calcul d’un scénario conserve l’historique depuis l’état initial, un horizon explicite, le dernier état et son résidu recalculé. Ses statuts distinguent un équilibre approché d’une évolution encore variable à la tolérance choisie ; aucun statut ne déclare un optimum global. Les tests dédiés sont dans `app/tools/test-production-engine.mjs`.

Les contrôles à maintenir portent sur les paramètres admissibles, les raccords et valeurs limites de f, les sommes sortantes, les conversions, le calcul synchrone, le plafonnement, les sorties externes, les indices temporels, le résidu final et les trois scénarios. Leurs résultats effectifs, ainsi que la recette des pages et des interactions, appartiennent au [journal de livraison](AVANCEES.md). Cette liste ne vaut pas compte rendu d’exécution.

## Extensions à définir avant une utilisation réelle

| Étape | Données et décisions supplémentaires |
| --- | --- |
| Ressources et produits vectoriels | Séparer énergie, matières, composants et produits ; déclarer unités, compatibilités et besoins par ressource |
| Capacités différentes | Relier chaque normalisation à une capacité réelle ; convertir les productions et alimentations entre machines avec des coefficients justifiés |
| Stocks et transport | Ajouter inventaires, bilans d’accumulation, délais, capacités de transport et règle d’attribution des surplus |
| Commande et environnement | Définir les apports variables, décisions d’allocation, contraintes et dates ; distinguer paramètres imposés et variables calculées |
| Objectifs et coûts | Définir production utile, demande satisfaite, coût, énergie ou plusieurs critères, avec horizon et conditions initiales |
| Optimisation effective | Choisir les variables de décision, contraintes et méthode compatible avec le modèle ; comparer les solutions et justifier la portée des garanties |
| Analyses approfondies | Rédiger les cas 2, 3 ou 4 aux nœuds pertinents, avec attributs, relations, coordonnées et évaluations explicites |

Faire varier des paramètres et observer un résidu ne résout pas ces problèmes d’optimisation. Le meilleur réglage d’une machine isolée peut modifier les alimentations de ses partenaires ; il ne définit pas automatiquement le meilleur réseau. Une extension vers des bilans physiques exige des données et lois adaptées, avant d’attribuer une signification énergétique aux valeurs normalisées.

La référence externe a été consultée le 10 septembre 2026. Elle étaye la condition mathématique de contraction ; la fonction de production, les scénarios et leurs calculs sont propres à cet atelier. Les PDF commerciaux, rendus, extractions privées, exports SQL et secrets restent hors du dépôt. Les prochains lots de fiches de physique restent [en attente](CHANTIER-DOMAINES.md), E1e étant terminé.
