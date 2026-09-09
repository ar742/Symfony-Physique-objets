# Physique objets — Symfony modernisé

Un site pour étudier la physique en reliant observations, modèles et applications. Cette version remplace l'ancien projet Symfony par une application Symfony 7.4, PHP 8.5, MySQL 8.4 et Twig, démarrée avec Docker Compose.

## Contenu disponible

- Une boucle générale interactive et six sous-boucles : **36 sous-étapes** avec explications au survol, accès clavier et boutons d'information tactiles.
- **Huit fiches web** de thermodynamique et physique statistique : hypothèses, 13 équations MathML, exemples calculés, questions corrigées et références de pages.
- **Quatre fiches de mécanique** : Newton et référentiel, travail-énergie, oscillateur amorti, force centrale et orbite. Une boucle de mécanique à six entrées ouvre directement les sections des fiches.
- **Quatre fiches de mécanique supplémentaires** : rotation autour d'un axe fixe, roulement sans glissement, référentiel tournant, Lagrange et Hamilton. Une seconde boucle de six entrées conserve l'accès à la première et relie les nouveaux sujets.
- Une page **Domaines** : deux domaines disponibles, dix autres planifiés avec repères dans les recueils ; seize fiches et vingt-neuf équations MathML au total.
- Un journal de **onze corrections ou clarifications** des passages utilisés des recueils.
- Les sommaires de deux recueils d'Aurélien Roudier : **91 points d'entrée** pour 1 433 pages sources.
- Le code de consultation et d'import des archives scientifiques de 2018.

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

La boucle, les deux domaines et les seize fiches sont présents dès le démarrage. Les tables d'archives sont initialement vides ; leur import est facultatif. Sur un PC où le projet modernisé fonctionne déjà, publier ce dépôt ne nécessite pas de réinstaller le site.

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
