# Environnement et concordances aux huit nœuds

Étude fournie par l’auteur le 14 septembre 2026 : **l’objectif est la sortie du nœud 8 après TH₈**. La première réalisation ramène les productions négatives à zéro. Une extension demandée le même jour permet de la comparer à la formule signée, ainsi que de tirer une matrice complète à graine reproductible. Le document source privé n’est pas publié. Cette étude possède son propre atelier `/graphes/production/concordances` ; les deux exemples de fonctions sur les branches restent dans leur atelier précédent.

## Réseau et convention des indices

Les douze arcs sont 1→2, 1→5, 2→3, 2→8, 5→3, 5→7, 7→6, 7→4, 3→4, 3→6, 4→8 et 6→8. Il s’agit d’un graphe orienté sans circuit, avec des réunions de chemins ; ce n’est pas un arbre au sens strict. Un ordre de calcul est 1, 2, 5, 3, 7, 4, 6, 8.

Une branche transporte qᵢⱼ de i vers j. La transformation est maintenant **dans chaque nœud** : Exp. IN Xᵢ → THᵢ → Exp. OUT Yᵢ. Les valeurs sont des attributs supposés ou calculés ; aucun flux industriel mesuré ni délai physique n’est inventé. La classification 1a/1b dépendra des attributs physiques choisis ; la lecture de production utilise ici 1b, alimentation puis produit.

Dans l’équation du document, εᵢⱼ multiplie qⱼᵢ, tandis qu’une parenthèse indique i→j. L’atelier adopte explicitement la convention de **l’équation** : ligne i destinataire, colonne j fournisseur. Ainsi l’arc 1→2 utilise ε₂₁. La diagonale est nulle. Les 44 coefficients hors diagonale sans arc correspondant peuvent être conservés dans la matrice, mais multiplient un transfert absent, donc nul : ils n’agissent pas sur ce graphe. Modifier une concordance ne crée aucune nouvelle liaison.

## Modèle retenu après les précisions

La source impose Y₁=1. Pour i=2,…,8 :

\[
X_i=\sum_{j:j\to i}q_{ji},\qquad
C_i=e_i+\sum_{j:j\to i}\varepsilon_{ij}q_{ji},\qquad
Y_i=\rho(X_iC_i).
\]

Le mode **rectifié** prend ρ(t)=max(0,t) ; le mode **signé** prend ρ(t)=t. Les deux calculs gardent le même objectif Y₈ et le même graphe. Comparer les modes exige de conserver les mêmes environnements, la même matrice et le même départ.

Les paramètres sont eᵢ∈[0,1] et εᵢⱼ∈[−1,1]. Sept environnements et douze concordances sont effectifs sur les arcs, soit 19 paramètres agissants. La matrice complète contient 56 coefficients hors diagonale, dont 44 inactifs. Les paramètres restent fixes pendant chacune des trois recherches.

Les cinq partages s₁,s₂,s₅,s₃,s₇ appartiennent à [0,1] :

| Nœud | Première branche | Seconde branche |
| --- | --- | --- |
| 1 | q₁₂=s₁ | q₁₅=1−s₁ |
| 2 | q₂₃=s₂Y₂ | q₂₈=(1−s₂)Y₂ |
| 5 | q₅₃=s₅Y₅ | q₅₇=(1−s₅)Y₅ |
| 3 | q₃₄=s₃Y₃ | q₃₆=(1−s₃)Y₃ |
| 7 | q₇₆=s₇Y₇ | q₇₄=(1−s₇)Y₇ |

Enfin q₄₈=Y₄ et q₆₈=Y₆. Les sorties se partagent intégralement ; les transformations ne conservent pas nécessairement Xᵢ. Il n’y a ni stock, ni flux ajouté implicitement, ni itération de point fixe : un passage dans l’ordre du graphe suffit.

En mode rectifié, la source positive, la mise à zéro et les parts positives donnent Xᵢ,Yᵢ,qᵢⱼ≥0. En mode signé, les parts restent entre 0 et 1 mais partagent une sortie éventuellement négative : qᵢⱼ/Yᵢ∈[0,1] lorsque Yᵢ≠0 ; si Yᵢ=0, toutes ses branches sortantes portent zéro. Les apports se somment algébriquement aux réunions de chemins et peuvent se compenser. Un transfert négatif ne crée pas d’arc de retour.

Aucun plafond positif n’a été demandé. Une amplification est possible et r≤1 n’est **pas** une propriété générale de ces lois. Le résultat rectifié est nécessairement non négatif ; un maximum signé peut être strictement négatif. Les nombres n’ont pas automatiquement l’interprétation d’un rendement énergétique.

L’objectif adopté est :

\[
\boxed{r=Y_8=\rho(X_8C_8)},\qquad X_8=q_{28}+q_{48}+q_{68}.
\]

La somme du document initial, |q₂₈|+|q₄₈|+|q₆₈|, égale X₈ en mode rectifié. En mode signé, elle peut différer de la somme algébrique X₈. Ces arrivées sont des indicateurs avant TH₈, distincts de l’objectif Y₈ ; le moteur expose les deux sommes. e₈ et ε₈₂, ε₈₄, ε₈₆ influencent effectivement le résultat final.

## Exemple de départ et preuve globale

Le préréglage utilise e₂=…=e₈=1, ε₂₁=ε₅₁=−1 et dix autres concordances nulles. Les cinq parts de départ valent 0,5.

| Nœud | X | C | Y |
| --- | ---: | ---: | ---: |
| 2 | 0,5 | 0,5 | 0,25 |
| 5 | 0,5 | 0,5 | 0,25 |
| 3 | 0,25 | 1 | 0,25 |
| 7 | 0,125 | 1 | 0,125 |
| 4 | 0,1875 | 1 | 0,1875 |
| 6 | 0,1875 | 1 | 0,1875 |
| 8 | 0,5 | 1 | 0,5 |

Pour tout s₁∈[0,1], Y₂=s₁(1−s₁) et Y₅=(1−s₁)s₁. Les autres nœuds transmettent sans perte, tous les chemins aboutissent à 8 et les parts ne dupliquent rien. Ainsi, pour **tous les cinq partages** :

\[
r=Y_2+Y_5=2s_1(1-s_1)=\tfrac12-2(s_1-\tfrac12)^2\le\tfrac12.
\]

La configuration initiale atteint ce maximum global. s₁=0,5 est imposé pour l’atteindre, mais les quatre partages aval restent libres. Le maximum n’est donc pas isolé dans les cinq variables. La condition de proximité de 50 % des productions du précédent exemple n’est pas imposée à ce nouveau modèle.

À ces paramètres, ∂r/∂s₁=2−4s₁ et les quatre autres dérivées valent zéro. La Hessienne réduite est diag(−4,0,0,0,0). Une coupe (s₁,s₂) montre une crête ; une coupe ne contenant pas s₁ est plane. Aucun relief fictif n’est ajouté.

## Lagrangien et variables indépendantes

On utilise 26 coordonnées : les douze q, puis X₂,…,X₈, puis Y₂,…,Y₈. Y₁=1 est une constante. Il y a **21 égalités**, organisées en trois familles de sept :

\[
h_i^X=X_i-\sum_jq_{ji},\quad
h_i^Y=Y_i-\rho(X_iC_i)\quad(i=2,…,8),
\]
\[
h_i^S=\sum_jq_{ij}-Y_i\quad(i=1,…,7).
\]

Le bilan de source vaut q₁₂+q₁₅−1. Aucun bilan sortant n’est imposé au nœud 8 : sans arc sortant, il annulerait artificiellement l’objectif.

\[
L=Y_8+\sum_{i=2}^8\lambda_i h_i^X+
\sum_{i=2}^8\mu_i h_i^Y+
\sum_{i=1}^7\eta_i h_i^S.
\]

Les multiplicateurs des égalités sont libres en signe. Les conditions de partage décrites pour chaque mode restent nécessaires pour conclure à l’admissibilité ou à l’optimalité ; la non-négativité n’est imposée qu’en mode rectifié. Les 26 coordonnées, égalités, multiplicateurs et résidus figurent dans l’export. Sur les contraintes, L=Y₈ ; hors contraintes, L n’est pas une production réalisable.

En mode rectifié, dans une portion régulière, poser φᵢ=1 si XᵢCᵢ>0 et φᵢ=0 si XᵢCᵢ<0. En mode signé, φᵢ=1 partout, y compris lorsque XᵢCᵢ=0 : la loi est polynomiale, sans seuil de mise à zéro. Alors :

\[
\partial_{X_i}L=\lambda_i-\mu_i\phi_i C_i,
\quad \partial_{Y_i}L=\mu_i-\eta_i\ (i<8),
\quad \partial_{Y_8}L=1+\mu_8,
\]
\[
\partial_{q_{ij}}L=\eta_i-\lambda_j-\mu_j\phi_jX_j\varepsilon_{ji}.
\]

Le calcul adjoint présenté dans la page part de p₈=1, puis remonte :

\[
v_{ij}=p_j\phi_j(C_j+X_j\varepsilon_{ji}),\qquad
p_i=\sum_j s_{ij}v_{ij}.
\]

Il donne μᵢ=−pᵢ, ηᵢ=−pᵢ et λᵢ=μᵢφᵢCᵢ. Ces valeurs annulent les composantes X/Y dans les portions régulières ; les composantes q reflètent encore les choix de partage. Ce calcul est un diagnostic de la configuration, **pas un certificat global**. Aux seuils rectifiés, une sélection déclarée ne remplace pas une dérivée classique.

Le lagrangien libre comporte des termes bilinéaires Xᵢqⱼᵢ : il est bilinéaire par morceaux en rectifié, bilinéaire sans rectification en signé. Une coupe libre peut être une selle. Par exemple au départ, en ne faisant varier que (q₁₂,X₂) et en gardant les autres coordonnées et multiplicateurs fixes, L=0,5−(q₁₂−0,5)(X₂−0,5), localement dans la portion active. Sa Hessienne a une valeur propre positive et une négative. La maximisation de la sortie sous contraintes ne réclame donc pas un maximum de L dans toutes ses variables libres.

## Comparaison et voisinages

La grille teste des combinaisons de parts au pas choisi, indépendamment du départ, avec un budget de 200 000 états. Le pas 0,1 couvre ses 161 051 configurations ; le pas 0,05 demande 4 084 101 configurations et reste incomplet sous ce budget, ce que le statut doit indiquer.

Les petites variations modifient une part à la fois, puis diminuent leur amplitude. Elles rendent un résultat local et leur historique ; un arrêt ne prouve pas un optimum global. Les autres paramètres restent fixes.

La recherche globale subdivise des boîtes sur les cinq parts et propage des intervalles arrondis vers l’extérieur. En rectifié, des bornes de gain en aval et des coupures du réseau resserrent la borne globale. Ces coupures fondées sur la positivité sont désactivées en signé, où les intervalles conservent les signes et les compensations possibles. Le meilleur état réalisable et la borne supérieure sont affichés séparément, même s’ils sont négatifs. Un budget atteint avec écart ouvert reste un résultat non certifié. Les paramètres d’un préréglage et sa preuve explicative ne sont pas lus comme une réponse imposée au solveur.

Les nappes représentent Y₈ suivant deux fractions, en recalculant toutes les contraintes dans le mode choisi. Les trois autres fractions gardent leurs valeurs de référence. Le zoom vertical affiche les coordonnées numériques réelles, y compris négatives ; « valeurs absolues de l’échelle » ne signifie pas appliquer |Y₈|. Le point central est nommé « référence » sans l’assimiler automatiquement à un optimum. Les deux profils et tous les points calculés sont conservés dans l’export. Les gradients et Hessiennes viennent de la dérivation des sommes, produits et parts ; aux seuils rectifiés détectés, une dérivée indisponible est signalée.

## Matrice pseudo-aléatoire reproductible

`randomizeConcordance(model, seed)` conserve les environnements et les cinq parts. La graine est un entier de 0 à 2³²−1. L’algorithme versionné `lcg32-numerical-recipes-v1` définit :

\[
z_{n+1}=(1664525z_n+1013904223)\bmod 2^{32},\qquad
\varepsilon=2z_{n+1}/2^{32}-1.
\]

Le module parcourt les lignes destinataires 1 à 8, puis les colonnes fournisseurs 1 à 8. Une case diagonale reste zéro sans consommer de tirage. Les 56 autres valeurs appartiennent à une grille uniforme discrète de [−1,1), incluse dans le domaine autorisé [−1,1]. Il s’agit d’une suite pseudo-aléatoire déterministe, pas de tirages indépendants garantis ni d’un générateur de sécurité. La graine et le nom d’algorithme sont conservés dans `provenance` ; les valeurs de la matrice restent les données effectives si elles sont ensuite modifiées.

La matrice complète contient huit zéros diagonaux, douze coefficients actifs et 44 coefficients hors arcs inactifs. Conserver ces derniers permet de relire le tirage complet ; cela ne transforme pas le DAG en graphe complet. Pour reproduire une étude, il faut aussi conserver les environnements, les parts initiales, le mode, l’objectif et les budgets.

## Exemple dont le maximum signé est négatif

`createNegativeConcordanceScenario()` pose e₂=…=e₇=1, e₈=0, ε₈₂=ε₈₄=ε₈₆=−1, et toutes les autres concordances à zéro. Tous les nœuds avant 8 transmettent leurs apports sans les modifier. Les partages intégraux et la source égale à 1 impliquent X₈=1 pour tout choix des cinq parts. Ainsi C₈=−X₈=−1 :

\[
r_{\mathrm{signé}}=X_8C_8=-1,\qquad
r_{\mathrm{rectifié}}=\max(0,X_8C_8)=0.
\]

Le maximum signé vaut donc exactement −1, comme son minimum ; il n’est pas remplacé par zéro dans les recherches. Cette preuve repose sur les équations, indépendamment du statut numérique retourné sous un budget fini. La borne par intervalles peut rester ouverte malgré ce résultat analytique simple.

## Trois graines étudiées, sans représentativité statistique

Les graines **7, 8 et 34** ont été choisies après exploration pour illustrer trois comparaisons. Elles utilisent toutes e₂=…=e₈=0,5 et cinq parts initiales à 0,5, donc des environnements différents du préréglage à e=1. Pour chaque graine, les deux modes emploient exactement la même matrice. Les trois départs retenus n’ont pas de production négative ; leur égalité initiale entre modes ne signifie pas que les autres partages donnent les mêmes résultats.

Chaque grille a un pas 0,1 et un budget de 200 000 évaluations, suffisant pour ses 161 051 configurations. Chaque recherche locale part du même état, avec pas initial 0,1, pas minimal 10⁻⁵ et au plus 5 000 évaluations. Chaque recherche globale reçoit au plus 4 000 subdivisions et une tolérance absolue de 10⁻⁵ ; elle conserve son propre meilleur état, sans recevoir le résultat de la grille ou de la recherche locale comme départ.

| Graine | Mode | Départ Y₈ | Meilleur Y₈ obtenu¹ | Borne supérieure | Écart à ce meilleur état | Statut global |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 7 | Rectifié | 0,016087262 | 0,034812582 | 0,037074763 | 0,002262181 | Budget atteint |
| 7 | Signé | 0,016087262 | 0,033347376 | 0,038800916 | 0,005453540 | Budget atteint |
| 8 | Rectifié | 0,205949893 | 1,451310313 | 1,451310313 | 3,553×10⁻¹⁵ | Certifié à la tolérance |
| 8 | Signé | 0,205949893 | 1,451310313 | 1,487224534 | 0,035914221 | Budget atteint |
| 34 | Rectifié | 0,249181793 | 3,265239764 | 3,413805398 | 0,148565634 | Budget atteint |
| 34 | Signé | 0,249181793 | 4,853652185 | 5,125923693 | 0,272271508 | Budget atteint |

¹ Meilleur état parmi le départ, la grille, la recherche locale et la recherche globale. L’écart de cette colonne utilise cet état et peut différer de l’écart interne du seul solveur global. Les valeurs complètes et les parts correspondantes sont conservées dans le module de résultats.

- Graine 7 : les meilleurs états diffèrent, mais les deux bornes restent ouvertes. Aucun ordre des deux maxima exacts n’est établi.
- Graine 8 : les deux modes retrouvent le même témoin amplifié. Seul le maximum rectifié est certifié au budget choisi ; le témoin commun ne démontre pas l’égalité des maxima.
- Graine 34 : un témoin signé avec production négative au nœud 6 atteint environ 4,85365, au-dessus de la borne supérieure rectifiée 3,41381. Cela établit que le maximum signé dépasse le maximum rectifié, sans déterminer exactement l’un ou l’autre.

Recalcul reproductible depuis `app` : `node tools/etudier-concordances.mjs --write` ; depuis la racine du dépôt : `node app/tools/etudier-concordances.mjs --write`. Le script exécute les trois méthodes pour chacun des six cas et génère `concordance-sample-results.mjs`, export `CONCORDANCE_SAMPLE_RESULTS`. Aucun maximum ni multiplicateur issu de ces tableaux n’est donné comme résultat imposé au solveur.

## Mise en œuvre

`concordance-engine.mjs` rassemble les calculs purs, les recherches et le lagrangien. `concordance-worker.mjs` exécute les recherches dans un worker interruptible. `concordance-surfaces.mjs` recalcule les voisinages ; `concordance-study.mjs` relie le formulaire, le graphe, les tableaux, les analyses et les exports. `concordance-scenarios.mjs` construit les matrices reproductibles et l’exemple négatif. Le gabarit et le style reprennent les thèmes et composants du site. Les coordonnées d’analyse sont `#concordance-noeud-i-n.0` avec n=1,2,3.

Les vérifications réellement exécutées sont consignées dans le journal des avancées. Les documents privés et les recueils de l’auteur restent hors du dépôt. Le README renvoie désormais vers son site pour retrouver les ouvrages et leurs ressources.
