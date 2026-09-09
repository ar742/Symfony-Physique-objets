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

## 9 septembre 2026 — M2 : solides, référentiels et formalismes

- Quatre fiches supplémentaires : `rotation-axe-fixe`, `roulement-sans-glissement`, `referentiel-tournant`, `lagrange-hamilton` (numéros 13–16). Chaque fiche relie des passages précis des deux recueils à un exemple original recalculé et à une question corrigée.
- La mécanique dispose de deux boucles à six entrées. L'ancre historique `boucle-domaine` reste disponible ; `boucle-solides-formalismes` ouvre le nouveau groupe. Chaque fiche revient à sa boucle et les identifiants des info-bulles sont distincts entre les groupes.
- Les exemples traitent un disque soumis à un couple, un cylindre sur une pente avec vérification du frottement statique, les forces d'inertie à un instant dans un repère tournant, et une masse-ressort décrite par Lagrange puis Hamilton.
- Neuf nouvelles équations MathML. Correction C10 : inertie axiale non nulle du disque homogène (CPGE P3 p. 283). Correction C11 : stationnarité de l'action, sans minimum garanti (théorie PC1 p. 244).
- Sources examinées : CPGE P1 p. 265 et 268, P2 p. 277, P3 p. 283–284 et 286–287 ; théorie PC1 p. 238–239, 243–244 et TQC1 p. 345, 350–351. Formules contrôlées sur rendus des pages. Compléments MIT : 8.01SC chapitres 17, 21, 31 ; 8.223 cours 15 ; 8.09 §1.2.
- Les nouveaux exemples et équations ont reçu une seconde lecture scientifique. Elle a conduit à préciser l'intervalle ouvert de l'angle de pente, le groupement du produit vectoriel imbriqué et les sections des références externes.
- Validation : 10 tests, 1 346 assertions ; 58 fichiers Twig valides ; injection Symfony valide ; 1 302 contrôles fonctionnels sur 29 pages, sans erreur. Les contrôles couvrent notamment les deux boucles, leurs identifiants et descriptions accessibles, les ancres, les retours vers les boucles, la pagination par domaine et les réponses HTTP.
- Le lot est synchronisé avec le site local, avec sauvegarde des fichiers antérieurs. Le site compte désormais 16 fiches, 29 équations MathML et 11 corrections documentées.

Portée : rotation autour d'un axe fixe, cylindre idéal sans glissement, rotation uniforme autour d'une origine fixe, formalismes analytiques pour un oscillateur à un degré de liberté. Les situations générales restent à approfondir. La relecture de l'auteur et la recette visuelle au navigateur restent à faire. Aucun PDF complet ou extrait de page n'est publié ; aucune nouvelle dépendance ni modification de la base de données.

Prochain lot : **F1**, hydrostatique et écoulements, puis ondes mécaniques et acoustique.
