# Premier parcours : thermodynamique et physique statistique

Livraison du 9 septembre 2026. Version éditoriale 1.0, relecture scientifique par l'auteur à faire.

## Voir le résultat

- [Accueil et boucle générale](http://localhost:8080/)
- [Les six sous-boucles, en commençant par Observer](http://localhost:8080/boucle/1)
- [Les huit fiches](http://localhost:8080/fiches/)
- [Les sept corrections ou clarifications](http://localhost:8080/fiches/corrections)

Actualiser la page suffit sur l'environnement déjà démarré. Aucune installation, migration SQL ou importation supplémentaire n'est nécessaire.

## Navigation réalisée

Chaque niveau général a sa propre page, avec six sous-étapes. Le schéma conserve la circulation 1 → 2 → 3 puis 4 → 5 → 6 de droite à gauche sur la ligne de retour. Chaque clic rejoint une section ; son bouton de lecture rejoint une ancre de fiche. Survol, focus clavier et bouton « i » donnent l'explication. Les coordonnées 1.1 à 6.6 correspondent à la méthode, et les mentions CPGE / Licence au niveau pédagogique.

Une vue d'ensemble des 36 destinations est dépliable en bas de chaque sous-boucle. Les fiches indiquent leurs points d'entrée dans les sous-boucles. Les URL existantes, dont `/#etape-4`, sont conservées.

## Contenu du lot

| Fiche web | Pages principales utilisées |
|---|---|
| Définir le système et ses grandeurs | CPGE 450 ; Théorique 287, 297 |
| Relier pression, volume et température | CPGE 436, 454 ; Théorique 299 |
| Faire le bilan d'énergie | CPGE 450, 452 ; Théorique 297 |
| Chauffer à volume ou pression constants | CPGE 450, 454 ; Théorique 299 |
| Comparer deux détentes du gaz parfait | CPGE 450, 454 ; Théorique 299 |
| Distinguer entropie échangée et produite | CPGE 452, 454 ; Théorique 299 |
| Compter les micro-états accessibles | CPGE 438 ; Théorique 290 |
| Passer aux probabilités de Boltzmann | CPGE 435, 438 ; Théorique 288, 290 |

Chaque fiche comprend objectif, prérequis, système, hypothèses, développement, exemple calculé, question de vérification, sources et corrections éventuelles. Les 13 équations sont en MathML natif, accompagnées d'une lecture textuelle. Les exemples sont pédagogiques ; aucune mesure expérimentale n'a été inventée.

Le travail préparatoire a extrait les pages CPGE 434–442 et 450–459 ainsi que les pages Théorique 287–303. Cette extraction ne constitue pas une validation intégrale de ces 36 pages. Les formules réutilisées et les corrections signalées ont été examinées sur les passages pertinents, avec rendu de pages PDF lorsque nécessaire. Des sujets non repris, notamment statistiques quantiques, gaz réel, diffusion et rayonnement, nécessitent leur propre relecture avant migration.

## Journal éditorial

| Repère | Correction / précision |
|---|---|
| C01 | Pression intensive ; capacités thermiques totales extensives |
| C02 | n pour les moles, N pour les particules ; constantes du SI |
| C03 | Ne pas multiplier une capacité déjà totale par la masse |
| C04 | Signe moins du travail de détente isotherme réversible |
| C05 | Température du thermostat et signe de l'entropie échangée |
| C06 | Distinguer micro-état, niveau d'énergie, dégénérescence et population |
| C07 | Dérivée canonique à N,V fixés, et non à μ,V fixés |

Le journal en ligne comporte les liens précis. Les compléments externes consultés sont les [constantes du SI du BIPM](https://www.bipm.org/fr/measurement-units/si-defining-constants), la [définition IUPAC des capacités thermiques](https://goldbook.iupac.org/terms/view/H02753) et les [notes officielles du MIT en physique statistique](https://ocw.mit.edu/courses/8-044-statistical-physics-i-spring-2013/pages/readings-notes-slides/). Ils servent à vérifier les conventions et à proposer des approfondissements ; les fiches sont des reformulations des recueils avec des exemples recalculés.

## Édition et vérification

- `app/config/content/fiches.json` : contenu, pages sources, versions et corrections.
- `app/config/content/sous-boucles.json` : les 36 actions et leurs destinations.
- `app/config/content/references-pilote.json` : références externes communes.
- `app/templates/science/equations` : équations MathML.
- `app/config/content/recueils.json` : identité des PDF, nombre de pages et empreintes SHA-256.

La bibliothèque contrôle que chaque page citée appartient bien à la fiche source annoncée. Les tests contrôlent aussi l'existence des sections liées, les coordonnées, le MathML et les valeurs numériques affichées. Le script `app/tools/verify-learning.php` contrôle les réponses des pages, les ancres, les identifiants d'info-bulle et quelques réponses HTTP réelles. Il produit `app/var/learning-verification.json`.

Commandes à lancer depuis le dossier du projet :

```powershell
docker compose exec -T web php vendor/bin/phpunit
docker compose exec -T web php bin/console lint:twig templates
docker compose exec -T web php bin/console lint:container
docker compose exec -T web php tools/verify-learning.php
docker compose exec -T web php tools/verify-loop.php
```

La vérification technique ne remplace pas la relecture scientifique de l'auteur ni une recette visuelle au clavier, à la souris et sur téléphone. Ces deux étapes restent indiquées comme telles dans le statut du lot.

Résultats du lot : 9 tests automatisés, 771 assertions ; 40 templates Twig et conteneur de services valides ; 942 contrôles sur 18 pages du parcours sans erreur. Les 36 sous-étapes disposent chacune d'une destination existante. Les vérifications de syntaxe JavaScript et de structure MathML passent également.

## Prochaine étape éditoriale

Relire d'abord le parcours « détente → entropie » et les sept corrections, en comparant les formulations web aux pages sources. Après cette relecture, poursuivre avec les oscillateurs ou les transferts thermiques et leur premier schéma physique propre. Les thèmes supplémentaires réutiliseront la structure de fiches, de sources et de coordonnées mise en place ici.
