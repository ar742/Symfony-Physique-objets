# Journal des avancées

## 9 septembre 2026 — Plan des domaines

- Découpage des domaines hors thermodynamique et physique statistique en douze lots avec repères CPGE et théoriques.
- Méthode de rédaction, contrôle scientifique, schémas interactifs et publication GitHub à chaque livraison.
- Protection explicite des ouvrages commercialisés : sources complètes conservées localement.
- Prochaine livraison : M1, quatre fiches de mécanique et une entrée par domaine.

Les détails du chantier sont dans [CHANTIER-DOMAINES.md](CHANTIER-DOMAINES.md).

## 9 septembre 2026 — M1 : mécanique du point et oscillateurs

- Quatre fiches disponibles : `newton-referentiel`, `travail-energie-mecanique`, `oscillateur-harmonique`, `force-centrale-orbite`. Chaque fiche comporte hypothèses, formules, exemple calculé, question corrigée et passages sources précis.
- `/domaines/` présente deux parcours disponibles et dix domaines à venir. `/domaines/mecanique` propose une boucle à six entrées, avec clic direct vers une section, information au survol et au clavier, bouton tactile et fermeture par Échap.
- `/fiches/` regroupe les douze fiches par domaine. La pagination de lecture reste à l'intérieur du domaine choisi. Les huit fiches thermiques/statistiques et les 36 sous-étapes restent accessibles.
- Sept nouvelles équations MathML. Corrections C08 (coefficient d'amortissement) et C09 (moment d'une force), identifiées dans les deux recueils et documentées sans modifier les originaux.
- Sources examinées : CPGE P1 p. 265, 268–269 et P2 p. 277 ; recueil théorique PC1 p. 239–240 et 244. Formules et contexte vérifiés visuellement. Compléments : MIT 8.01SC, chapitres 7, 13, 23 et 25, références datées du 9 septembre 2026.
- Validation : 10 tests, 1 125 assertions ; 49 fichiers Twig valides ; 1 141 contrôles fonctionnels sur 25 pages, sans erreur (liens, ancres, six nœuds, descriptions, routes invalides et réponses HTTP).
- Les fichiers concernés sont synchronisés avec le site local après contrôle des différences, avec sauvegarde préalable des versions locales. Aucun PDF complet, rendu de page, extraction de texte, secret ou export SQL n'est ajouté au dépôt.

Ce lot couvre les quatre sujets ci-dessus, pas l'intégralité de P1, P2 ou PC1. La relecture scientifique par l'auteur et la recette visuelle au navigateur restent à faire. Aucune nouvelle dépendance ni modification de la base de données.

Prochain lot : **M2**, mécanique du solide, rotations et référentiels ; préparer ensuite le prolongement lagrangien et hamiltonien avant F1 (fluides et ondes). Les autres lots restent planifiés.
