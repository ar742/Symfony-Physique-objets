# Études de graphes : branches, chemins et dépendances

Cadre scientifique et analytique du volet ouvert le 10 septembre 2026. Il prolonge les [fondements](FONDEMENTS-DU-PROJET.md) et les [quatre formes d’analyse](FORMES-ANALYSE.md). Les exemples sont des constructions originales avec données fictives et résultats calculés. Ils n’ajoutent ni villes mesurées, ni circulation observée, ni nouvelle fiche au catalogue des 37 fiches du cas 4.

Ce document distingue le réseau de distances, le prototype de dépendance entre branches et les extensions réservées. Les vérifications effectivement exécutées et la livraison applicative sont consignées dans [le journal](AVANCEES.md).

## Une branche porte une question explicite

Une branche relie des extrémités identifiées et contient sa propre chaîne **Exp. IN → TH → Exp. OUT**. Son identifiant et ses coordonnées sont stables : **branche + 1.0**, **branche + 2.0**, **branche + 3.0**. Le nom d’une ville n’est pas une coordonnée analytique ; deux branches incidentes à B gardent deux analyses distinctes. Pour une liaison utilisable dans les deux sens, le sens examiné fait partie du contexte.

Dans le cas **1a**, les attributs principaux d’entrée et de sortie sont du même type. La chaîne « position A → calcul de distance → position B » suit deux positions dans la même représentation. **B est une extrémité fixée dans le dossier** : la théorie calcule la distance et qualifie la liaison A–B ; elle ne déduit jamais B à partir de A seul. L’existence de l’arête est également donnée. Une distance isolée depuis A ne sélectionnerait pas un point unique dans le plan.

Pour les coordonnées planaires choisies, le traitement peut utiliser :

`d(A,B) = √[(xB − xA)² + (yB − yA)²]`.

La sortie restitue B et les attributs calculés de la liaison. La distance est alors un attribut complémentaire, tandis que les positions restent les attributs principaux suivis. Ce choix doit être visible dans le texte de la branche.

Une autre question relève du cas **1b** : « configuration de positions → distance ou coût ». La sortie principale est alors une longueur, une durée ou un autre coût déclaré. Changer la question et les attributs suivis change l’analyse, sans changer nécessairement le graphe. Des unités communes ne suffisent pas à identifier deux types ; une distance entre deux positions ne se confond pas avec une position.

Chaque branche précise ses entrées, l’action théorique, sa sortie, les unités, les hypothèses et la nature de sa relation. Une flèche peut exprimer une transformation calculatoire ou une dépendance de données. Elle ne prouve ni déplacement effectué ni causalité physique. Les chaînes du cas 1 n’acquièrent pas automatiquement un retour 3 → 1.

## Réseau de distances fictif

Le premier réseau comporte **six villes et neuf arêtes bidirectionnelles**. Les positions sont fictives, exprimées dans un plan cartésien en kilomètres. Les longueurs obtenues par la formule euclidienne représentent les segments de ce modèle. Elles ne sont ni des distances routières relevées, ni des coordonnées géographiques à convertir comme des latitudes et longitudes.

Le dessin et le réseau sont deux objets distincts : une arête doit être déclarée pour qu’un passage soit autorisé. Le fait que deux villes soient visibles, proches ou alignées n’ajoute aucune liaison. Les neuf arêtes permettent dix-huit passages orientés ; parcourir A–B ou B–A utilise ici la même longueur.

Pour un chemin `p = (v0,…,vr)`, le coût est la somme des longueurs des arêtes empruntées :

`L(p) = Σ d(vi,vi+1)`.

Les poids sont fixes, additifs et positifs sur les liaisons entre villes distinctes. Le plus court chemin minimise cette somme pour des extrémités données. La distance directe dans le plan ne remplace pas la distance minimale sur le réseau lorsque l’arête directe manque. La définition additive et la distinction entre poids minimal et chemin sont présentées dans [MIT 6.006, lecture 11, p. 2](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/aa57a9785adf925bc85c1920f53755a0_MIT6_006S20_lec11.pdf).

### Énumérer sous une borne

La recherche sous une borne porte sur les **chemins simples**, sans ville répétée, dont la distance totale est **strictement inférieure** à la borne choisie. Un trajet exactement égal à cette borne n’est pas retenu. Il faut comparer les valeurs de calcul, puis arrondir leur affichage : un résultat affiché comme égal après arrondi peut se trouver légèrement en dessous ou au-dessus.

Avec six villes, un chemin simple comporte au plus cinq arêtes. La recherche est finie ; elle ne prétend pas énumérer tous les trajets autorisant des cycles. Même si les cycles de longueur positive n’améliorent pas un minimum, certains trajets avec détour cyclique pourraient respecter une borne : ils sont exclus par la question posée.

Dans le mode **toutes paires**, les extrémités sont ordonnées et distinctes. Le chemin A–B–C et son inverse C–B–A sont comptés séparément ; ils ont ici la même longueur. Il existe 6 × 5 = 30 couples ordonnés de villes distinctes, mais potentiellement plusieurs chemins simples par couple. Ce nombre de couples n’est donc pas le nombre de chemins. Le parcours vide d’une ville vers elle-même ne constitue pas un trajet entre deux villes dans cette recherche.

Le nombre de chemins simples peut croître très vite avec la taille d’un réseau. Une éventuelle limite d’affichage ou d’énumération devra être annoncée comme telle avant d’employer le mot « tous ». L’absence de résultat sous une borne n’est pas, à elle seule, une preuve que les villes sont déconnectées.

## Comparer trois algorithmes sur la même question

Dijkstra, Bellman–Ford et Floyd–Warshall travaillent ici sur **le même graphe et les mêmes coûts statiques additifs**. Ils calculent des coûts minimaux ; ils n’énumèrent pas tous les chemins simples sous une borne. Ils ne sont pas davantage trois modèles concurrents de trafic.

| Algorithme | Question usuelle | Condition à conserver | Principe |
| --- | --- | --- | --- |
| Dijkstra | Distances depuis une source vers les autres sommets | Poids non négatifs | Choisir le sommet non traité de distance provisoire minimale, puis relâcher ses arêtes |
| Bellman–Ford | Distances depuis une source ; détection des cycles négatifs accessibles | Un coût minimal fini exige l’absence de cycle négatif sur un trajet admissible vers la destination | Répéter les relaxations ; au plus N − 1 arêtes suffisent pour un plus court chemin simple |
| Floyd–Warshall | Distances entre toutes les paires | L’absence de cycle négatif garantit des distances finies pour les paires connectées | Autoriser progressivement chaque sommet comme intermédiaire |

Dijkstra utilise la non-négativité pour rendre définitif le minimum sélectionné. Sa complexité dépend de la structure de données, par exemple un tableau ou une file de priorité ; le nom de l’algorithme ne garantit donc pas un temps d’exécution mesuré. Voir [MIT 6.006, lecture 13, p. 1–4](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/d819e7f4568aced8d5b59e03db6c7b67_MIT6_006S20_lec13.pdf).

Bellman–Ford admet des arêtes négatives dans un graphe orienté. Si un cycle négatif accessible depuis la source permet ensuite d’atteindre la destination, la répétition de ce cycle empêche un minimum fini. Dans la représentation bidirectionnelle, une arête négative suffirait à produire un aller-retour négatif ; les longueurs positives du réseau évitent cette situation. Voir [MIT 6.006, lecture 12, p. 1–4](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/2430d7903a5529451d80c17f89a41fe8_MIT6_006S20_lec12.pdf).

Floyd–Warshall applique la récurrence `Dij ← min(Dij, Dik + Dkj)`, en gardant k comme boucle extérieure. L’initialisation distingue `Dii = 0`, les poids des arêtes existantes et `+∞` pour l’absence de liaison directe. Un coût diagonal négatif révèle un cycle négatif. Voir [MIT 6.006, lecture 17, p. 3](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/665523227a175e9e9ce26ea8d3e5b51c_MIT6_006S20_lec17.pdf) et [MIT 6.046, lecture 11, p. 4](https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/312f4a419009b58f8147b75975db4347_MIT6_046JS15_lec11.pdf).

Pour comparer une paire, on lit la distance correspondante dans chaque résultat. Pour comparer toutes les paires, les méthodes à source unique doivent être appliquées à chaque source ; on ne compare pas leur résultat depuis une seule ville à la matrice complète de Floyd–Warshall.

**Les distances minimales doivent coïncider, pas nécessairement les listes de sommets choisies.** Plusieurs routes peuvent avoir le même coût minimal. L’ordre d’examen et la règle de départage peuvent conduire les algorithmes à restituer des représentants différents. Chaque route restituée doit néanmoins relier les bonnes extrémités, employer des arêtes existantes et avoir le coût annoncé. L’accord des algorithmes est un contrôle informatique et mathématique ; il ne valide pas les kilomètres fictifs sur le terrain.

## Prototype : une branche dépend d’une autre

Le second exemple utilise des **durées en minutes**, distinctes des kilomètres du premier réseau. Deux routes candidates vont de A à D :

| Route | Coûts de ses branches | Coût total |
| --- | --- | --- |
| A–B–D | A–B : 2 min ; B–D : 2 min + αq | 4 min + αq |
| A–C–D | A–C : 4 min ; C–D : 4 min | 8 min |

Le paramètre externe est un débit `q ∈ [0,100] véhicules/min`, avec :

`α = 0,1 min²/véhicule`, donc `cBD(q) = 2 min + αq`.

L’écriture abrégée « 2 + q/10 » n’est numérique que si q est exprimé en véhicules par minute et le résultat en minutes. La formule avec α explicite les dimensions : `[αq] = min`.

Cette loi est **fictive**. Elle n’est ni ajustée à des observations ni attribuée aux références universitaires. q est fourni et maintenu constant pendant chaque calcul de trajet. Modifier le curseur de q compare d’autres scénarios figés ; cela ne simule pas une variation du débit pendant le déplacement.

### Alimentation P → B et conservation déclarée

Une branche d’alimentation P → B porte un débit d’entrée supposé q. Son traitement peut poser un régime stationnaire sans accumulation, source ni prélèvement dans cette branche. En notant N le nombre de véhicules stockés dans la branche :

`dN/dt = q_entrée − q_sortie = 0`, soit `q_sortie = q_entrée = q`.

Pour éviter une confusion dimensionnelle, la quantité stockée désigne ici un **nombre de véhicules** ; sa dérivée est un débit. Cette branche est de type **1a** : débit entrant et débit sortant ont la même nature et, sous la conservation supposée, la même valeur.

La sortie de P → B alimente **l’environnement de la branche B → D** en lui fournissant q. Elle ne devient pas la position d’entrée du trajet A–B–D. Il faut distinguer la liaison de circulation et la flèche de dépendance entre analyses. La loi de conservation dans P–B est une hypothèse locale ; elle ne ferme pas un bilan de tout le réseau.

Le trajet étudié ne calcule pas q et ne le modifie pas. Le modèle ne prétend pas identifier ce débit externe au débit total de B–D après mélange avec tous les autres usagers. Ni attribution de routes à une population, ni files d’attente, ni bilan endogène de congestion ne sont résolus.

### États horodatés du trajet

Pour les branches du trajet, le cas **1a** suit un état `(position, heure)` à l’entrée et à la sortie. La destination de chaque branche est fixée. La théorie calcule :

`heure_sortie = heure_entrée + coût_de_la_branche(q)`.

L’état initial est `(A,t0)` ; les états finaux candidats sont `(D,t0 + 4 min + αq)` et `(D,t0 + 8 min)`. Les heures changent, tandis que les attributs principaux restent de même type. Les paramètres, la destination et q sont le contexte déclaré. Le cas **1b** « état et environnement → coût de trajet » répondrait à une autre question, avec une durée comme sortie principale.

L’égalité des deux coûts donne `αq = 4 min`, donc **q = 40 véhicules/min** :

| q (véhicules/min) | Coût A–B–D (min) | Coût A–C–D (min) | Résultat parmi ces deux routes |
| --- | --- | --- | --- |
| 0 | 4 | 8 | A–B–D |
| 20 | 6 | 8 | A–B–D |
| 40 | 8 | 8 | Deux routes minimales |
| 60 | 10 | 8 | A–C–D |
| 100 | 14 | 8 | A–C–D |

Ces chiffres résultent directement des lois proposées. À q = 40, le minimum vaut 8 minutes et ne désigne pas une route unique. Une convention d’affichage peut choisir un représentant, mais doit conserver le constat d’égalité.

## Vues globale et parcours : deux analogies limitées

En mécanique des fluides, la description **eulérienne** associe les grandeurs à des positions fixes, tandis que la description **lagrangienne** suit une particule ou une parcelle identifiée au cours du temps. Les notes [MIT 2.20, lecture 2, p. 1–3](https://ocw.mit.edu/courses/2-20-marine-hydrodynamics-13-021-spring-2005/ec6b004ab50a456b9eadacb32ecfa184_lecture2.pdf) distinguent aussi lignes de courant instantanées et trajectoires.

Pour ces graphes, les intitulés « globale / eulérienne » et « parcours / lagrangienne » sont **des analogies de lecture** :

- La vue globale décrit les attributs et coûts attachés aux lieux et aux branches pour un environnement q fixé.
- La vue parcours suit la succession d’états horodatés d’un trajet et cumule les mêmes coûts de branches.

Il ne s’agit ni de résoudre les équations d’un fluide, ni d’appliquer les équations d’Euler–Lagrange du calcul variationnel. Les coûts ne définissent pas, à eux seuls, un champ de vitesse continu ou le mouvement entre les villes.

**Pour un même trajet et le même q constant, les deux vues doivent donner la même durée totale.** Une différence de présentation n’est pas un mécanisme de congestion. La branche d’alimentation reste visible comme dépendance externe dans les deux lectures.

Passer à q(t), à un coût évalué à l’heure d’entrée dans une branche ou à un débit produit par les choix des usagers demanderait de nouvelles données et règles : évolution temporelle, propagation des états, conservation et conditions de validité de l’optimisation. Ce serait un autre modèle, à développer et vérifier séparément ; les garanties des trois algorithmes statiques ne sont pas transférées automatiquement.

## Extension des données et limites de livraison

La conception conserve des objets distincts : sommets, arêtes autorisées et sens, analyses de branches, attributs principaux, paramètres, environnement, lois de coût, dépendances et résultats de requêtes. Chaque grandeur doit conserver son unité et son statut ; chaque relation, ses extrémités et sa signification.

Les identifiants de branche qualifient les coordonnées analytiques. Une évolution pourra ajouter une forme et des coordonnées locales sans réutiliser un identifiant pour une autre signification. La sélection du cas 2 demanderait trois systèmes de trois sous-systèmes ; le cas 3 une chaîne de retour avec ses évaluations ; le cas 4 cette même conception aux deux étages. **L’extensibilité des données ne signifie pas que ces extensions sont implémentées sur les branches actuelles.**

La vérification du volet doit distinguer :

- exactitude des distances, sommes, unités et comparaisons strictes ;
- arêtes et extrémités des chemins, absence de répétition dans l’énumération simple et règle de comptage des inverses ;
- accord des minima des trois algorithmes, y compris en présence d’ex æquo ;
- conservation déclarée de P–B, dépendance de B–D, seuil de 40 et égalité des deux vues à q fixé ;
- coordonnées, liens, affichage du contexte, nature des flèches et statut fictif des données.

Ces contrôles ne sont pas annoncés comme exécutés par la seule présence de cette liste. Les résultats de recette appartiennent au journal de livraison. Les prochains lots scientifiques restent [en attente](CHANTIER-DOMAINES.md), E1e étant terminé. Aucun PDF commercial, rendu privé, extraction, export SQL ou secret n’entre dans cette documentation. Les sources externes ci-dessus ont été consultées le 10 septembre 2026 ; elles étayent les notions et algorithmes, pas les valeurs fictives du prototype.

## Mise en œuvre et poursuite du chantier

`GraphStudyController` expose `/graphes/` et `/graphes/dependances`. Les templates `app/templates/graph/` présentent les deux études et le triplet commun. `graph-engine.mjs` contient les données fictives et les calculs purs ; `graph-studies.mjs` raccorde formulaires, SVG, résultats et analyses. Le thème et les info-bulles réutilisent les composants existants. Aucun accès à une base de données ni nouvelle dépendance n’est nécessaire pour ces deux ateliers.

Les coordonnées prennent la forme `#branche-A-B-1a-2.0` : branche orientée A vers B, variante 1a, position TH. Un lien direct restitue ces trois choix. Il ne sauvegarde pas les paramètres de recherche ni la valeur du curseur q ; les calculs sont refaits à partir des valeurs initiales de la page. Les graphes sont actuellement définis dans le code, sans éditeur ni espace de sauvegarde utilisateur.

| Étape | État | Résultat attendu |
| --- | --- | --- |
| G1 · Branches indépendantes | Livrée | Réseau fixe de six villes, neuf liaisons bidirectionnelles, analyses 1a/1b, trois algorithmes et chemins simples sous borne stricte |
| G2 · État enrichi et dépendance externe | Livrée | Couple position–heure, débit externe transmis, comparaison de deux parcours et deux lectures à q figé |
| G3 · Construire et reprendre ses graphes | À développer | Définir/importer sommets et branches, renseigner attributs et lois, sauvegarder une étude et ses paramètres avec provenance |
| G4 · Environnement évolutif | À développer | Définir q(t) ou d’autres variables, date d’entrée dans chaque branche, propagation des états et algorithme compatible avec ces dépendances |
| G5 · Couplage global | À développer | Débits endogènes, bilans et conditions aux limites, objectif commun, méthode de résolution et critères de convergence |
| G6 · Branches approfondies | À développer | Formes 2/3/4 à l’intérieur des branches, entrées/sorties et identifiants conservés à l’échelle du réseau |

Pour passer à un réseau réel ou à une autre physique, préciser les sommets, les sens autorisés, les attributs et unités, le statut des données, les lois de branche, les raccords, puis l’objectif : distance, durée, énergie, plusieurs critères ou contraintes. Ces choix conditionnent l’algorithme ; ils ne se résument pas au dessin du graphe. Le chantier G3 à G6 est indépendant des lots de nouvelles fiches de physique laissés en attente.

Vérification reproductible : depuis la racine du projet, `node --test app/tools/test-graph-engine.mjs` lance les tests du moteur avec Node.js. Dans le conteneur web, depuis `/var/www/html`, `php tools/verify-graphs.php` vérifie les pages et les ressources HTTP ; `php tools/verify-analysis-formats.php` contrôle les formes existantes ; `php vendor/bin/phpunit` exécute la suite PHP. Node.js n’est utile qu’au test du moteur : l’utilisation des ateliers demande simplement le navigateur et le serveur déjà installés.


## Troisième étude : machines de production

L’extension [Machines et production](PRODUCTION-MACHINES.md), accessible en `/graphes/production`, place les machines aux nœuds et les répartitions sur les arcs. Chaque machine transforme une alimentation normalisée en production par la loi à seuil et deux segments affines proposée par l’auteur. Le réseau comporte des retours entre machines ; la simulation les traite par mises à jour synchrones, en distinguant les anciens apports des nouvelles sorties.

Cette étude commence le travail G4/G5 sur un réseau abstrait évoluant par cycles. Elle permet de régler les lois, alimentations, productions initiales et six fractions entre trois machines. Elle ne termine pas G3 (éditeur général, import, sauvegarde), G4 (temporalité et apports variables plus généraux), G5 (bilans physiques et optimisation du réseau) ou G6 (analyses internes approfondies). Les deux premières études et les lots scientifiques restent dans leur périmètre précédent.

Le [quatrième exemple de production](OPTIMISATION-PRODUCTION.md) poursuit G5 par un cas borné : huit machines identiques sur un DAG, états compatibles et comparaison locale/globale de la sortie finale. Les programmes linéaires par régime et leurs bornes lagrangiennes sont mis en œuvre ; cela ne constitue pas encore un optimiseur universel, un éditeur de réseaux, un modèle temporel avec stocks ou des lois internes vectorielles.

Le [cinquième exemple de production](OPTIMISATION-BRANCHES.md) reprend la topologie explicitement fournie par l’auteur : huit nœuds, douze fonctions aux branches, cinq partages, source fixée à 1 et trois contributions à r. Il compare une grille finie et une recherche globale continue, puis optimise les paramètres des branches dans des plages indépendantes. Les analyses cas 1b appartiennent bien aux liaisons ; leurs coordonnées commencent par `reseau-5-3-1b`, par exemple. L’export enregistre les configurations et certificats ; l’import, l’édition générale du graphe et la sauvegarde persistante restent des travaux distincts.
