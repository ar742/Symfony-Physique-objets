# Physique objets — Symfony modernisé

Un site pour étudier la physique en reliant observations, modèles et applications. Cette version remplace l'ancien projet Symfony par une application Symfony 7.4, PHP 8.5, MySQL 8.4 et Twig, démarrée avec Docker Compose.

**Le fondement du projet est une analyse continuellement précisée d’un sujet physique ou théorique.** Depuis le 10 septembre 2026, l’accueil propose quatre formes : **3**, **3 × 3**, **6**, **6 × 6**. Les chaînes à trois positions distinguent des sorties de même type que les attributs d’entrée (1a) ou de types différents (1b). Les chaînes à six positions conservent leurs évaluations 4/3, 5/2 et 6/1. Voir [les fondements](docs/FONDEMENTS-DU-PROJET.md) et [les formes et exemples](docs/FORMES-ANALYSE.md).

Les prochains lots de physique sont en attente. E1e est terminé ; les réalisations existantes restent accessibles.

Le volet [Études de graphes](docs/ETUDES-GRAPHES.md) applique le cas 1 aux branches : réseau interurbain fictif en `/graphes/`, chemins simples sous une borne stricte, comparaison Dijkstra / Bellman–Ford / Floyd–Warshall ; puis `/graphes/dependances`, un débit externe qui modifie une durée. Les analyses 1a/1b et leurs coordonnées sont accessibles depuis les liaisons. Les cas 2/3/4 internes aux branches et les réseaux dynamiques couplés sont des extensions futures.

Un troisième atelier, [Machines et production](docs/PRODUCTION-MACHINES.md), est accessible en `/graphes/production` : seuil d’alimentation puis deux segments affines, paramètres et répartitions modifiables, transferts réciproques et calcul synchrone par cycles. Trois scénarios montrent stabilisation, blocage sous seuil et oscillation. Il ne s’agit pas d’une optimisation industrielle ni d’une sauvegarde de graphes utilisateur.

## Contenu disponible

- **Quatre formes accessibles dès l’accueil**, avec schémas cliquables, explications au survol, navigation clavier et thème clair/sombre. Les trois positions forment une chaîne ouverte ; les six positions comportent le retour.
- **Huit exemples méthodologiques autonomes** : quatre pour le cas 1 (deux par variante), deux pour le cas 2 (un par variante), deux pour le cas 3. Deux fiches existantes présentent le cas 4, dont les 37 analyses restent disponibles. Ces exemples ne s’ajoutent pas au décompte des fiches du catalogue 6 × 6.

- **Chaque fiche du catalogue du cas 4 possède six systèmes globaux et six sous-niveaux par système** : 222 systèmes et **1 332 sous-niveaux rédigés pour les 37 fiches**. Un clic ouvre la sous-boucle, puis la description du point choisi ; survol, clavier et boutons d'information tactiles donnent accès aux explications.
- La même chaîne analytique se répète aux deux échelles : expression du système, formalisation, résultats, relecture, confrontation théorique, résultats de retour. Les liens comparent les résultats, les théories et les données initiales. Voir [la méthode à deux niveaux](docs/ANALYSES-DEUX-NIVEAUX.md).
- **Des entrées et évaluations explicites pour les 37 fiches** : 1 332 sous-niveaux précisent les entrées, 1 554 relations qualifient les liens et 777 évaluations détaillent objets, conditions, critères et constats. La nature physique ou théorique du sujet est explicite. Voir [les approfondissements AP1 à AP8](docs/PRECISIONS-ANALYTIQUES.md) et les volets [E1a](docs/ELECTROSTATIQUE-E1A.md), [E1b](docs/MAGNETOSTATIQUE-E1B.md), [E1c](docs/INDUCTION-E1C.md), [E1d](docs/MAXWELL-INDUCTANCE-E1D.md) et [E1e](docs/ONDES-ELECTROMAGNETIQUES-E1E.md).
- La boucle générale et ses six sous-boucles transversales initiales restent accessibles dans le panneau historique de l’accueil ; leurs ancres sont conservées.
- **Huit fiches web** de thermodynamique et physique statistique : hypothèses, 13 équations MathML, exemples calculés, questions corrigées et références de pages.
- **Quatre fiches de mécanique** : Newton et référentiel, travail-énergie, oscillateur amorti, force centrale et orbite. Une boucle de mécanique à six entrées ouvre directement les sections des fiches.
- **Quatre fiches de mécanique supplémentaires** : rotation autour d'un axe fixe, roulement sans glissement, référentiel tournant, Lagrange et Hamilton. Une seconde boucle de six entrées conserve l'accès à la première et relie les nouveaux sujets.
- **Six fiches de fluides et ondes** : hydrostatique et Archimède, continuité et Bernoulli, viscosité et Poiseuille, élasticité linéaire, corde tendue et acoustique. Deux boucles relient les hypothèses, les calculs et leurs limites.
- **Trois fiches d’électrostatique** : champ de Coulomb, potentiel et énergie, puis théorème de Gauss appliqué à une sphère chargée. Une boucle de domaine les relie ; chacune possède dès sa création son analyse détaillée 6 × 6.
- **Trois fiches de champ magnétique** : force de Lorentz et trajectoires, champ d’un fil par Ampère, puis champ axial d’une spire. Une seconde boucle d’électromagnétisme les relie, avec une analyse 6 × 6 détaillée pour chaque fiche.
- **Trois fiches sur le solénoïde et l’induction** : champ axial d’un solénoïde fini, loi de Faraday dans une bobine fixe et tige mobile sur des rails. Une troisième boucle d’électromagnétisme les relie ; chaque fiche possède ses 36 sous-niveaux et leurs évaluations.
- **Trois fiches sur Maxwell et les circuits inductifs** : courant de déplacement dans un condensateur, auto-induction et énergie, puis établissement et décharge d’un circuit RL. Une quatrième boucle les relie, avec 36 sous-niveaux et leurs comparaisons pour chacune.
- **Trois fiches sur les ondes électromagnétiques** : onde plane dans le vide, polarisation et analyseur, puis énergie et flux de Poynting. Une cinquième boucle les relie, avec 36 sous-niveaux et leurs évaluations pour chacune.
- Une page **Domaines** : quatre domaines disponibles, huit autres planifiés avec repères dans les recueils ; 37 fiches et 88 équations MathML au total.
- Un journal de **vingt-trois corrections ou clarifications** des passages utilisés des recueils.
- Les sommaires de deux recueils d'Aurélien Roudier : **91 points d'entrée** pour 1 433 pages sources.
- Le code de consultation et d'import des archives scientifiques de 2018.
- Un bouton **Mode sombre** en haut de chaque page : choix clair/sombre mémorisé sur le navigateur, préférence système au premier accès et impression sur fond clair.

Les fiches sont une version pilote : la relecture scientifique de l'auteur et la recette visuelle complète restent à effectuer. Voir [le détail du parcours](PREMIER-PARCOURS.md).

L'extension est décrite dans [le chantier des domaines](docs/CHANTIER-DOMAINES.md) et [le journal des avancées](docs/AVANCEES.md). Chaque livraison vérifiée donne lieu à un commit envoyé sur GitHub.

## Démarrer sous Windows

Prérequis : **Git**, **Docker Desktop démarré** et **PowerShell**. PHP, Composer et MySQL sont installés dans les conteneurs. Ouvrir PowerShell normalement, sans droits administrateur, puis exécuter les commandes une par une.

### 1. Cloner le dépôt et générer la configuration locale

```powershell
git clone https://github.com/ar742/Symfony-Physique-objets.git
Set-Location Symfony-Physique-objets
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\initialiser-env.ps1
```

Le script crée un `.env` avec trois secrets aléatoires et le port 8080. Il n'affiche pas les secrets et ne remplace pas une configuration existante. Le paramètre d'exécution PowerShell ne vaut que pour ce processus. Pour utiliser un autre port lors de la création : ajouter `-Port 8081`.

### 2. Construire l'image et installer les versions verrouillées

```powershell
docker compose build
docker compose run --rm --no-deps web installer
```

La première installation nécessite Internet. `composer.lock` fixe les versions des dépendances. Le script installe ces versions et ne relance pas une mise à jour du pack Symfony.

### 3. Créer les tables et démarrer le site

```powershell
docker compose up -d --wait database
docker compose run --rm --no-deps web php bin/console doctrine:migrations:migrate --no-interaction
docker compose up -d --wait
```

Ouvrir [le site local](http://localhost:8080/), [les domaines](http://localhost:8080/domaines/), [la mécanique](http://localhost:8080/domaines/mecanique) ou [le diagnostic](http://localhost:8080/installation). Adapter le port dans les liens s'il a été changé.

La boucle, les quatre domaines et les trente-sept fiches sont présents dès le démarrage. Les tables d'archives sont initialement vides ; leur import est facultatif. Sur un PC où le projet modernisé fonctionne déjà, publier ce dépôt ne nécessite pas de réinstaller le site.

## Ajouter les documents et les archives

**Les PDF complets et les sauvegardes SQL ne sont pas publiés dans Git.** Le dépôt inclut les textes web, les équations, les schémas, les index et les références, pas les documents privés complets.

Les recueils sont des ouvrages commercialisés de l'auteur. Leur emploi comme sources n'autorise pas la diffusion des PDF complets. Pour la consultation privée locale, le propriétaire des éditions correspondantes peut utiliser les noms suivants :

| Fichier original | Destination dans le projet |
|---|---|
| `MemoCPGEScientifAR2027.pdf` | `sources/cpge.pdf` |
| `PhysiqueTheorique14.pdf` | `sources/theorique.pdf` |

Les fichiers sont servis en lecture seule. [Les empreintes et repères de pages](app/config/content/recueils.json) doivent correspondre à l'édition copiée. Sans ces fichiers, les fiches web et les sommaires restent consultables, mais les liens vers les PDF retournent « document indisponible ». Ces routes n'ont pas d'authentification : avant tout hébergement public, retirer les fichiers ou protéger leur accès. Le cache privé et l'exclusion Git ne sont pas des contrôles d'accès.

Pour reprendre la sauvegarde historique, voir [la procédure d'import des archives](docs/ARCHIVES.md). Aucun compte utilisateur ni aucune proposition de l'ancienne base n'est importé dans le catalogue moderne.

## Organisation

| Emplacement | Rôle |
|---|---|
| `app/src/` | Contrôleurs, catalogue, bibliothèques de contenus et import |
| `app/templates/` | Pages Twig et équations MathML |
| `app/public/styles/`, `app/public/scripts/` | Présentation et interactions |
| `app/config/content/` | Fiches, sous-boucles, index et références |
| `app/migrations/` | Schéma de la base moderne |
| `app/tests/` | Tests de sources, liens, équations, calculs et import |
| `docker/`, `compose.yaml` | Environnement local |
| `sources/` | PDF à fournir localement |

Les contenus du lot pilote sont décrits dans des fichiers JSON et indépendants des tables d'archives. Les identifiants et les ancres permettent de partager directement une fiche ou une sous-étape.

## Vérifier et relancer

```powershell
docker compose exec -T web php vendor/bin/phpunit
docker compose exec -T web php bin/console lint:twig templates
docker compose exec -T web php bin/console lint:container
docker compose exec -T web php bin/console doctrine:schema:validate
docker compose exec -T web php tools/verify-learning.php
```

Le dernier script contrôle les pages et les ancres du nouveau parcours sans exiger les PDF ni les anciennes données. Après ajout des PDF et import des archives, `php tools/verify-loop.php` et `php tools/verify-catalog.php` vérifient aussi ces éléments.

```powershell
docker compose stop
docker compose up -d --wait
```

Les données MySQL persistent dans le volume Docker. Ne pas utiliser `docker compose down -v` sur une installation à conserver. Sauvegarder les données, les PDF et le `.env` séparément du dépôt Git.

## Historique et hébergement

L'ancienne version reste accessible dans [l'historique avant modernisation](https://github.com/ar742/Symfony-Physique-objets/tree/0d307f0aae3564ea5c2a5a2b93d8371f04e13cdb). Le remplacement est un nouveau commit, sans réécriture de cet historique.

GitHub héberge ici **le code du projet**. Le domaine historique `physicstopics.fr` n'a plus d'hébergement. La configuration fournie est destinée au développement local : écoute sur `127.0.0.1`, mode debug actif, courriels neutralisés. Un hébergement public PHP/MySQL et sa configuration de production feront l'objet d'une étape distincte.

Le [quatrième exemple de production](docs/OPTIMISATION-PRODUCTION.md), accessible sous `/graphes/production/optimisation`, compare des petites variations et une optimisation globale par régimes et bornes lagrangiennes sur huit machines identiques. Les départs nul et actif conservent le même problème ; un budget différent forme une troisième configuration. La borne, l’écart restant et les états compatibles sont consultables. Les flèches des paramètres a, b, c et d avancent de 0,1.
