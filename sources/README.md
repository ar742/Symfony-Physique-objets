# Recueils sources locaux

Les copies `cpge.pdf` et `theorique.pdf` sont identiques aux documents fournis par l'utilisateur. Elles sont montées en lecture seule dans `/var/www/sources` et servies uniquement par les routes `/recueils/cpge/document` et `/recueils/theorique/document`.

L'index et les empreintes SHA-256 de référence se trouvent dans `app/config/content/recueils.json`. La vérification `php tools/verify-loop.php`, lancée dans le conteneur Web, compare les fichiers à ces empreintes et contrôle les réponses PDF, notamment les lectures partielles.

Les PDF sont exclus de Git. Les conserver avec les sauvegardes du projet. Toute nouvelle édition doit entraîner une nouvelle vérification des repères et de l'index avant remplacement de cette version de référence.
