# Import facultatif des archives scientifiques de 2018

Le nouveau parcours et ses huit fiches n'ont pas besoin de cet import. Cette procédure concerne uniquement la sauvegarde `physdb.sql` exportée le 22 août 2018, déjà identifiée lors de la reprise du site.

## Source attendue

- Taille : 296 517 octets.
- SHA-256 : `f66fb75d87bc8a03050912cdd68e098a56cc79814e6bf21612efe2529ea861ce`.
- Copie locale à placer dans `sauvegardes/physdb-2018-08-22.sql`, dossier exclu de Git.

La sauvegarde complète comporte aussi d'anciennes données privées : la conserver localement. L'application reçoit un droit de lecture sur les six tables scientifiques seulement. Les comptes et les propositions ne sont pas importés dans le nouveau catalogue.

## Restaurer dans une base d'archive séparée

Lancer ces commandes depuis la racine du dépôt après le démarrage de MySQL et l'application des migrations :

```powershell
docker compose cp sauvegardes/physdb-2018-08-22.sql database:/tmp/physdb-2018-08-22.sql
docker compose cp docker/restore-legacy.sh database:/tmp/restore-legacy.sh
docker compose exec -T database sh /tmp/restore-legacy.sh
```

Le script vérifie l'empreinte et s'arrête si la base `physdb_archive_20180822` existe déjà. Il ne remplace pas une archive existante. Les scripts Shell du dépôt utilisent des fins de ligne LF grâce à `.gitattributes`.

## Importer les tables scientifiques

```powershell
docker compose exec -T web php bin/console app:import-legacy --dry-run
docker compose exec -T web php bin/console app:import-legacy
```

Le catalogue contient alors 13 domaines, 29 thèmes, 154 fiches, 42 niveaux, 22 références et 301 symbolisations, soit 561 enregistrements. Les identifiants sont conservés ; les anciens niveaux sérialisés sont décodés strictement sans `unserialize`.

L'import est transactionnel pour les données. Une seconde exécution vérifie l'identité des valeurs et n'écrit rien. Si les données de destination diffèrent, il s'arrête pour les préserver.

Les tables et les données métier sont conservées dans le volume MySQL. Une mise à jour du code ne constitue pas une sauvegarde de cette base.
