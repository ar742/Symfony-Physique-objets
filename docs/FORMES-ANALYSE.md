# Quatre formes d’analyse dès l’accueil

Extension demandée par l’auteur le 10 septembre 2026. Le site propose une entrée par forme avant le choix d’un sujet. Les prochains lots de physique sont mis en attente ; E1e est terminé. Ce chantier prolonge les [fondements](FONDEMENTS-DU-PROJET.md) et conserve les 37 fiches historiques du cas 4.

## Choisir une forme

| Cas | Organisation | Coordonnées | Exemples proposés |
| --- | --- | --- | --- |
| 1 | Exp. IN → TH → Exp. OUT | 1.0 à 3.0 | Deux exemples 1a et deux exemples 1b |
| 2 | Trois systèmes, chacun en Exp.–TH–Exp | 1.0 à 3.0 ; n.1 à n.3 | Deux exemples, un de chaque variante globale |
| 3 | Six systèmes avec chaîne de retour | 1.0 à 6.0, sans sous-niveaux | Oscillateur et flux de Poynting |
| 4 | Six systèmes, chacun en six sous-systèmes | 1.0 à 6.0 ; n.1 à n.6 | Les fiches complètes de l’oscillateur et de Poynting, puis toutes les 37 fiches |

Ces coordonnées reprennent la notation existante n.0 (niveau global, aussi exprimé n-0 dans la demande). Le nombre de positions décrit la structure du travail, pas sa difficulté scolaire. Le schéma générique expose les rôles ; les exemples donnent leur contenu scientifique. Un sujet théorique conserve ses attributs aux positions Exp., sans mesure inventée.

### Variantes 1a et 1b

**1a : mêmes types d’attributs principaux.** Par exemple, l’entrée et la sortie peuvent être des températures ou des courants à deux instants. Cela ne signifie ni mêmes valeurs, ni même état, ni bijection. Les paramètres auxiliaires, contraintes, hypothèses et environnement restent explicites ; ils ne sont pas effacés pour obtenir artificiellement une entrée et une sortie identiques.

**1b : attributs de types différents.** Par exemple, une charge et une position fournissent un champ, une profondeur fournit une surpression. Le contrôle porte sur la relation, les dimensions et les conditions ; on ne demande pas l’égalité d’une charge et d’un champ. Des unités communes ne garantissent pas non plus une même nature physique.

Dans le cas 2, chaque système est analysé pour lui-même. Son triplet local annonce ses types d’entrée et de sortie, ainsi que sa variante. La variante globale ne se propage pas automatiquement à tous les triplets locaux. La fonction TH du système global 2.0 n’empêche pas ses attributs de constituer l’entrée Exp. 2.1 ; le traitement local se situe en 2.2 et ses résultats en 2.3.

Les cas 1 et 2 sont des chaînes ouvertes. Ils comportent un contrôle et une discussion des résultats, sans inventer une chaîne de retour 4–6. Dans le cas 2, n.3 transmet au système suivant ; le dernier triplet se termine en 3.3. Une reprise ultérieure peut être décrite, mais elle ne figure pas comme une fermeture automatique.

### Retour aux cas 3 et 4

Les positions 2 et 5 réalisent chacune un traitement théorique, à partir des entrées 1 et 4 et vers les résultats 3 et 6. Les trois évaluations 4/3 (Exp.), 5/2 (TH) et 6/1 (Exp.) explicitent objet, conditions, critère et constat. Elles sont globales dans le cas 3, globales et locales dans le cas 4.

Les deux exemples du cas 3 sont rédigés de façon autonome, sans sous-niveau masqué ni dépendance à une coordonnée locale. Leurs liens vers le cas 4 sont des approfondissements dont le périmètre est annoncé. Les deux mises en avant du cas 4 réutilisent des fiches complètes déjà livrées ; elles ne sont pas présentées comme deux nouvelles rédactions de 36 points.

## Parcours et interaction

L’accueil `/` présente les quatre choix et l’accès aux domaines/lots. `/analyses/cas-1` à `/analyses/cas-4` donnent la description, les variantes pertinentes, les exemples et les schémas de rôles. Les schémas sont accessibles par clic, survol, clavier et bouton tactile « i », avec Échap pour fermer l’explication.

Les exemples des cas 1 à 3 sont sous `/analyses/{cas}/{exemple}`. Leurs coordonnées pointent vers la description du système ; dans le cas 2, le clic ouvre `/analyses/cas-2/{exemple}/niveau/{n}` avec ses trois sous-systèmes. Les neuf coordonnées restent disponibles dans une vue d’ensemble.

Les liens du cas 4 ouvrent les fiches et leurs analyses existantes `/fiches/{slug}` et `/fiches/{slug}/analyse/{n}`. L’accès à toutes les fiches, aux domaines et aux lots est conservé. Le parcours transversal initial reste dans un panneau de l’accueil : les anciennes ancres `#etape-n` ouvrent automatiquement ce panneau.

Les couleurs s’appuient sur les thèmes clair/sombre du site. Sur petit écran, les chaînes se disposent verticalement, avec les flèches dans le sens de lecture. La présentation utilise HTML, CSS et le script d’info-bulles existant ; aucune dépendance nouvelle.

## Données et maintenance

Les huit exemples méthodologiques sont explicitement rédigés dans `app/config/content/exemples-analyse.json`. Ils ajoutent 30 systèmes globaux et 18 sous-systèmes au corpus d’exemples, séparé du catalogue des 37 fiches 6×6. Aucun texte analytique n’est généré par simple remplacement de verbes.

`AnalysisFormatLibrary` expose les quatre formes, enrichit les coordonnées et les rôles, et sélectionne deux fiches existantes pour le cas 4. `AnalysisFormatController` vérifie le couple forme/exemple et les bornes des niveaux ; les mauvais couples ou coordonnées répondent 404. Les modèles et les textes restent perfectibles.

Les tests dédiés couvrent la structure, les variantes, les coordonnées, les relations et les évaluations. Le vérificateur `php tools/verify-analysis-formats.php` examine les pages, schémas, destinations, info-bulles et contrôles. Les vérifications effectives et la recette visuelle sont consignées dans [le journal](AVANCEES.md), après exécution.

Les résultats numériques sont supposés ou calculés, sans observation inventée. Les références et les liens aux fiches donnent le cadre des lois. Les PDF commerciaux, rendus et extractions privées, SQL et secrets restent hors du dépôt ; ce chantier ne crée aucun hébergement.
