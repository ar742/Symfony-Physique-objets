# Environnement et concordances aux huit nœuds

Étude fournie par l’auteur le 14 septembre 2026, précisée pendant sa mise en œuvre : **une sortie négative devient zéro**, puis **l’objectif est la sortie du nœud 8 après TH₈**. Le document source privé n’est pas publié. Cette étude possède son propre atelier `/graphes/production/concordances` ; les deux exemples de fonctions sur les branches restent dans leur atelier précédent.

## Réseau et convention des indices

Les douze arcs sont 1→2, 1→5, 2→3, 2→8, 5→3, 5→7, 7→6, 7→4, 3→4, 3→6, 4→8 et 6→8. Il s’agit d’un graphe orienté sans circuit, avec des réunions de chemins ; ce n’est pas un arbre au sens strict. Un ordre de calcul est 1, 2, 5, 3, 7, 4, 6, 8.

Une branche transporte qᵢⱼ de i vers j. La transformation est maintenant **dans chaque nœud** : Exp. IN Xᵢ → THᵢ → Exp. OUT Yᵢ. Les valeurs sont des attributs supposés ou calculés ; aucun flux industriel mesuré ni délai physique n’est inventé. La classification 1a/1b dépendra des attributs physiques choisis ; la lecture de production utilise ici 1b, alimentation puis produit.

Dans l’équation du document, εᵢⱼ multiplie qⱼᵢ, tandis qu’une parenthèse indique i→j. L’atelier adopte explicitement la convention de **l’équation** : ligne i destinataire, colonne j fournisseur. Ainsi l’arc 1→2 utilise ε₂₁. La diagonale et les contributions des branches absentes valent zéro. Modifier une concordance ne crée aucune nouvelle liaison.

## Modèle retenu après les précisions

La source impose Y₁=1. Pour i=2,…,8 :

\[
X_i=\sum_{j:j\to i}q_{ji},\qquad
C_i=e_i+\sum_{j:j\to i}\varepsilon_{ij}q_{ji},\qquad
Y_i=\max(0,X_iC_i).
\]

Les paramètres sont eᵢ∈[0,1] et εᵢⱼ∈[−1,1]. Sept environnements et douze concordances effectives sont éditables. Ils restent fixes pendant chacune des trois recherches.

Les cinq partages s₁,s₂,s₅,s₃,s₇ appartiennent à [0,1] :

| Nœud | Première branche | Seconde branche |
| --- | --- | --- |
| 1 | q₁₂=s₁ | q₁₅=1−s₁ |
| 2 | q₂₃=s₂Y₂ | q₂₈=(1−s₂)Y₂ |
| 5 | q₅₃=s₅Y₅ | q₅₇=(1−s₅)Y₅ |
| 3 | q₃₄=s₃Y₃ | q₃₆=(1−s₃)Y₃ |
| 7 | q₇₆=s₇Y₇ | q₇₄=(1−s₇)Y₇ |

Enfin q₄₈=Y₄ et q₆₈=Y₆. Les sorties se partagent intégralement ; les transformations ne conservent pas nécessairement Xᵢ. Il n’y a ni stock, ni flux ajouté implicitement, ni itération de point fixe : un passage dans l’ordre du graphe suffit.

La source positive, la mise à zéro et les parts positives donnent Xᵢ,Yᵢ,qᵢⱼ≥0. Aucun plafond positif n’a été demandé. Si Cᵢ>1, une amplification est possible et r≤1 n’est **pas** une propriété générale de cette nouvelle loi. Les nombres n’ont pas automatiquement l’interprétation d’un rendement énergétique.

L’objectif adopté est :

\[
\boxed{r=Y_8=\max(0,X_8C_8)},\qquad X_8=q_{28}+q_{48}+q_{68}.
\]

L’objectif du document initial, |q₂₈|+|q₄₈|+|q₆₈|, égale X₈ puisque les transferts sont non négatifs. Il est conservé comme indicateur comparatif avant TH₈, et non comme critère à optimiser. e₈ et ε₈₂, ε₈₄, ε₈₆ influencent effectivement le résultat final.

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
h_i^Y=Y_i-\max(0,X_iC_i)\quad(i=2,…,8),
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

Les multiplicateurs des égalités sont libres en signe. La non-négativité et les parts entre 0 et 1 restent nécessaires pour conclure à l’admissibilité ou à l’optimalité. Les 26 coordonnées, égalités, multiplicateurs et résidus figurent dans l’export. Sur les contraintes, L=Y₈ ; hors contraintes, L n’est pas une production réalisable.

Dans une portion régulière, poser φᵢ=1 si XᵢCᵢ>0, φᵢ=0 si XᵢCᵢ<0. Alors :

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

Il donne μᵢ=−pᵢ, ηᵢ=−pᵢ et λᵢ=μᵢφᵢCᵢ. Ces valeurs annulent les composantes X/Y dans les portions régulières ; les composantes q reflètent encore les choix de partage. Ce calcul est un diagnostic de la configuration, **pas un certificat global**. Aux seuils, une sélection déclarée ne remplace pas une dérivée classique.

Le lagrangien libre est bilinéaire par morceaux, avec termes Xᵢqⱼᵢ. Une coupe libre peut être une selle. Par exemple au départ, en ne faisant varier que (q₁₂,X₂) et en gardant les autres coordonnées et multiplicateurs fixes, L=0,5−(q₁₂−0,5)(X₂−0,5), localement dans la portion active. Sa Hessienne a une valeur propre positive et une négative. La maximisation du rendement sous contraintes ne réclame donc pas un maximum de L dans toutes ses variables libres.

## Comparaison et voisinages

La grille teste des combinaisons de parts au pas choisi, indépendamment du départ, avec un budget de 200 000 états. Le pas 0,1 couvre ses 161 051 configurations ; le pas 0,05 demande 4 084 101 configurations et reste incomplet sous ce budget, ce que le statut doit indiquer.

Les petites variations modifient une part à la fois, puis diminuent leur amplitude. Elles rendent un résultat local et leur historique ; un arrêt ne prouve pas un optimum global. Les autres paramètres restent fixes.

La recherche globale subdivise des boîtes sur les cinq parts et propage des intervalles arrondis vers l’extérieur. Des bornes de gain en aval et des coupures du réseau resserrent la borne globale. Le meilleur état réalisable et la borne supérieure sont affichés séparément. Un budget atteint avec écart ouvert reste un résultat non certifié. Les paramètres du préréglage et sa preuve explicative ne sont pas lus comme une réponse imposée au solveur.

Les nappes représentent Y₈ suivant deux fractions, en recalculant toutes les contraintes. Les trois autres fractions gardent leurs valeurs de référence. Le zoom vertical affiche les valeurs absolues ; le point central est nommé « référence » sans l’assimiler automatiquement à un optimum. Les deux profils et tous les points calculés sont conservés dans l’export. Les gradients et Hessiennes viennent de la dérivation des sommes, produits et parts ; aux seuils détectés, une dérivée indisponible est signalée.

## Mise en œuvre

`concordance-engine.mjs` rassemble les calculs purs, les recherches et le lagrangien. `concordance-worker.mjs` exécute les recherches dans un worker interruptible. `concordance-surfaces.mjs` recalcule les voisinages ; `concordance-study.mjs` relie le formulaire, le graphe, les tableaux, les analyses et les exports. Le gabarit et le style reprennent les thèmes et composants du site. Les coordonnées d’analyse sont `#concordance-noeud-i-n.0` avec n=1,2,3.

Les vérifications réellement exécutées sont consignées dans le journal des avancées. Les documents privés et les recueils de l’auteur restent hors du dépôt. Le README renvoie désormais vers son site pour retrouver les ouvrages et leurs ressources.
