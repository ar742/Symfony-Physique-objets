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

## 9 septembre 2026 — Affichage clair/sombre

- Interrupteur « Mode sombre » en haut à droite de toutes les pages HTML du site, y compris les archives, les recueils et l'installation. L'état est annoncé aux lecteurs d'écran ; le bouton s'utilise aussi au clavier.
- Au premier accès, l'affichage suit la préférence système. Un choix manuel est conservé dans le navigateur entre les pages et les visites, et partagé entre ses onglets. Si le stockage est indisponible, le bouton reste utilisable sur la page courante. Sans JavaScript, le contenu reste disponible en clair.
- Palette adaptée pour les textes, navigation, fiches, MathML, boucles, info-bulles, résultats et corrections. Les schémas historiques gardent leur fond clair ; l'impression conserve la palette claire. Le lecteur PDF du navigateur conserve ses propres réglages.
- La page d'installation utilise désormais le gabarit commun. Aucun changement de contenu scientifique, de dépendance, de base de données ou de documents privés.
- Validation : syntaxe JavaScript et 58 fichiers Twig valides ; 1 302 contrôles fonctionnels sur 29 pages, sans erreur. Présence unique du bouton vérifiée par HTTP sur 11 pages représentatives et disponibilité de ses quatre ressources. Revue ciblée du code de mémorisation et d'accessibilité. La vérification visuelle au navigateur reste à faire.

Le prochain lot scientifique reste **F1**.

## 9 septembre 2026 — F1 : fluides, élasticité et ondes

- Six fiches (17–22) : `hydrostatique-archimede`, `continuite-bernoulli`, `viscosite-poiseuille`, `elasticite-lineaire`, `onde-corde`, `onde-acoustique`. Chacune comporte système, hypothèses, lois, limites, exemple recalculé, question corrigée et références précises.
- Troisième domaine disponible, `/domaines/fluides-ondes`, avec deux boucles à six entrées : pression et écoulements (`boucle-domaine`), déformation et propagation (`boucle-ondes`). Les clics ouvrent les sections ; les info-bulles, l'accès clavier, le bouton tactile et les retours vers la boucle réutilisent les composants existants, en clair et en sombre.
- Quatorze équations MathML supplémentaires. Le site compte 22 fiches, 43 équations, trois domaines disponibles et neuf domaines planifiés.
- Corrections ou précisions C12–C17 : phase entre fuseaux stationnaires ; décomposition fréquentielle d'un bruit ; viscosité dynamique dans la contrainte ; signe de la chute de pression dans Poiseuille ; fréquence propre de chaque mode ; définition SI de l'intensité acoustique. Le journal compte 17 entrées.
- Sources examinées visuellement : CPGE P4 p. 291–292 et 295 ; P6 p. 306 et 308 ; P7 p. 312, 314–316 et 321 ; P8 p. 322 et 324. Recueil théorique PC1 p. 249–250, 252, 254–257 et 259–261. P4 concerne les ondes et l'élasticité ; P6 et P7 concernent les fluides.
- Compléments vérifiés : MIT 8.01SC, chapitre 27 ; OpenStax, *University Physics Volume 1*, §12.3, 14.5–14.7, 16.3, 16.6, 17.2–17.3. Les références sont datées du 9 septembre 2026 ; aucun texte long ni illustration externe n'est reproduit.
- Une seconde lecture scientifique a recalculé les exemples et vérifié les équations. Elle a précisé la pression atmosphérique dans le bilan du flotteur, le poids propre négligé de la corde et le renvoi à l'impédance acoustique, puis corrigé un arrondi à six décimales.
- Validation : 10 tests et 1 692 assertions ; 72 fichiers Twig valides ; 1 542 contrôles fonctionnels sur 36 pages, sans erreur. Les vérifications couvrent les sources, calculs, ancres, identifiants, info-bulles, pagination, retours vers les boucles et réponses HTTP, dont le nouveau domaine et la fiche acoustique. Les fichiers du lot sont synchronisés avec le site local, avec sauvegarde préalable.

Portée : fluide au repos de masse volumique constante, Bernoulli idéal, Poiseuille établi, traction uniaxiale linéaire, corde idéale et acoustique plane progressive. Les écoulements turbulents, les géométries générales, la plasticité, les milieux dispersifs et l'acoustique des salles ne sont pas couverts par ce premier ensemble. La relecture scientifique de l'auteur et la recette visuelle au navigateur restent à faire. Les ouvrages complets, rendus et extractions restent locaux ; aucune nouvelle dépendance ni modification de la base.

Prochain lot : **E1**, champs et électromagnétisme.

## 9 septembre 2026 — Analyses individuelles à deux niveaux

À la demande de l'auteur, la priorité passe de l'extension E1 à la conception analytique de chaque fiche, selon le schéma général de 2018. Les 22 fiches existantes disposent désormais de **six systèmes globaux et de six sous-niveaux pour chacun**, soit **132 systèmes et 792 sous-niveaux rédigés**.

- La chaîne conserve la même fonction aux deux étages : expression du système, formalisation d'entrée, résultats, relecture, confrontation théorique et résultats de retour. Chaque sous-boucle traite le système de son niveau : dossier initial, modèle, calcul, audit, diagnostic ou application de retour.
- La tête de chaque fiche présente le schéma global. Un clic ouvre `/fiches/{slug}/analyse/{n}` avec le même schéma local ; un second clic rejoint `#point-n.p`. Les points comportent action, sortie à conserver et confrontation spécifique aux retours. Une vue d'ensemble donne accès aux 36 coordonnées.
- Les liens distinguent les comparaisons de valeurs/résultats (4/3, 5/2, 6/1) et les méthodes de même fonction (4/1, 5/2, 6/3). Les transmissions historiques sont explicites : sortie n.3 vers l'entrée du système suivant, retour n.6 vers n.1, et reprise globale après le système 6.
- L'accueil reprend ces fonctions et oriente vers les analyses individuelles. Les sous-boucles transversales initiales restent identifiées comme parcours d'introduction. Les contenus scientifiques et les boucles thématiques demeurent accessibles depuis les nouvelles pages.
- Les schémas réutilisent les info-bulles, le clavier, les boutons tactiles et les couleurs des thèmes clair/sombre. La disposition devient verticale sous 960 px pour les nouvelles analyses afin de laisser davantage de place aux intitulés. L'image de conception fournie correspond au schéma déjà conservé dans les archives du dépôt.
- Les textes sont stockés explicitement dans `analyses-fiches.json`, et non produits à l'affichage par une liste de verbes génériques. La méthode et les règles pour les futures fiches sont documentées dans [ANALYSES-DEUX-NIVEAUX.md](ANALYSES-DEUX-NIVEAUX.md).
- Une seconde lecture a notamment précisé les raccords hydrostatiques et acoustiques, le statut de la pression imposée dans Poiseuille, la composition cinématique des référentiels, les partenaires du bilan d'entropie et la distinction entre renommage des sites et changement de configurations microcanoniques. Les calculs, expériences de pensée et protocoles proposés gardent leur statut explicite ; aucune mesure n'est inventée.
- Validation : **11 tests, 9 903 assertions ; 75 gabarits Twig valides ; injection Symfony et syntaxe JavaScript valides ; 14 271 contrôles fonctionnels sur 168 pages, sans erreur**. Les contrôles couvrent les 132 pages locales, les 792 descriptions et leurs coordonnées, les destinations des graphes, les comparaisons, les transmissions entre systèmes, les ancres, l'accessibilité des descriptions et des réponses HTTP représentatives. La recette visuelle au navigateur reste à faire.

Cette livraison constitue une **première proposition analytique à relire avec l'auteur**. Elle ne prétend pas achever l'analyse scientifique de chaque phénomène. Les ouvrages complets, rendus privés, extractions, exports SQL et secrets restent locaux. Aucune nouvelle dépendance ou modification de la base de données ; les fichiers modifiés sont synchronisés avec le site local, avec sauvegarde préalable.

La prochaine étape est d'affiner cette structure avec l'auteur avant d'appliquer la même règle aux nouvelles fiches. E1 reste planifié.

## 9 septembre 2026 — Consignation du fondement du projet

- Les précisions de l'auteur sont consignées dans [FONDEMENTS-DU-PROJET.md](FONDEMENTS-DU-PROJET.md), référence de sens pour les prochaines évolutions, reliée au README, à la méthode technique et au chantier. Le fichier `AGENTS.md` invite les futurs intervenants à lire cette référence avant de modifier l'analyse.
- Le sujet est généralement un phénomène physique à ancrage expérimental, mais peut être théorique dès le départ : les éléments Exp. sont alors les attributs de ce sujet. Les positions 2 et 5 restent toujours théoriques aux deux étages, utilisant respectivement Exp. 1 et Exp. 4 pour produire Exp. 3 et Exp. 6.
- Les trois évaluations 6/1 (Exp.), 5/2 (TH) et 4/3 (Exp.) sont à définir systématiquement, avec objets, conditions, critère et constat ou question ouverte. Les relations peuvent être causales, chronologiques, logiques ou autres ; l'ordre graphique ne suffit pas à les qualifier.
- La finalité est de répertorier les éléments et de les retravailler par leurs coordonnées, avec une précision toujours perfectible. Le périmètre peut s'élargir à un champ de sujets. La complétude technique des 792 points ne vaut pas qualification scientifique achevée de chacun.
- L'explication « Lire les deux étages de la boucle », commune aux fiches et à leurs pages d'analyse, expose ces distinctions. Cette livraison consigne la référence de conception ; la relecture progressive de chaque analyse se poursuit selon celle-ci.
- Validation : relecture de fidélité au propos de l'auteur, liens locaux des six documents vérifiés, gabarit Twig modifié valide et réponses HTTP 200 avec les six distinctions principales sur une fiche et sur sa page d'analyse. Les fiches individuelles et les relations techniques ne sont pas modifiées par cette consignation.

## 9 septembre 2026 — AP1 : premier perfectionnement des analyses

- Trois analyses sont reprises selon le fondement précisé : `oscillateur-harmonique`, `continuite-bernoulli` et `lagrange-hamilton`. Elles conservent leurs 18 systèmes globaux, leurs 108 sous-niveaux et leurs coordonnées. Le site reste à 22 fiches ; ce lot approfondit des fiches existantes.
- La nature et le périmètre du sujet sont explicites : phénomène physique pour l'oscillateur et Bernoulli, objet théorique pour la correspondance Lagrange–Hamilton. Les éléments Exp. du sujet théorique sont ses attributs mathématiques et conséquences, sans observation physique fictive.
- Chaque sous-niveau possède ses entrées rédigées ; chaque système et sous-niveau qualifie sa relation avec ses entrées, soit 126 relations. Les traitements théoriques de 2 et 5 sont précisés à chacun des deux étages.
- Les 63 évaluations fondamentales du lot possèdent quatre champs : éléments comparés, conditions, critère, constat ou question ouverte. Les cadres de comparaison restent 4/3, 5/2 et 6/1. Les autres analyses conservent leurs textes initiaux pendant le perfectionnement progressif.
- Les schémas ouvrent les descriptions enrichies et gardent leurs anciens liens. Les catalogues signalent les trois analyses précisées. Les champs de comparaison utilisent les palettes clair/sombre existantes. Le nom de la fonction 5 devient « Formalisation et confrontation » pour expliciter son traitement théorique.
- Les exemples existants ont été recalculés. Les références MIT et OpenStax indiquées dans [le suivi AP1](PRECISIONS-ANALYTIQUES.md) ont été revérifiées ; les repères des recueils sont conservés. Aucun document complet, extrait privé ou nouvelle donnée expérimentale n'est publié.
- La relecture a précisé la reconstruction des attributs initiaux dans l'évaluation globale 6 de Bernoulli, les deux sens de passage et leur répétition périodique chez Lagrange–Hamilton, et la convention du biais additif des hauteurs de maxima pour l'oscillateur.
- Validation : **12 tests et 10 627 assertions ; 77 gabarits Twig valides ; injection Symfony valide ; 14 914 contrôles fonctionnels sur 168 pages sans erreur**. Couverture des entrées, relations, champs d'évaluation, mentions dans les catalogues, parcours non enrichis, liens et réponses HTTP. La dernière précision du biais des hauteurs a aussi été vérifiée par HTTP. Les 19 autres analyses et toutes les coordonnées sont conservées ; aucune recette visuelle au navigateur effectuée.

Le lot prépare les prochains groupes de perfectionnement. Les textes restent à affiner avec l'auteur ; ni la présence de quatre champs ni un contrôle numérique interne ne constitue une validation expérimentale.

## 9 septembre 2026 — AP2 : travail-énergie, Poiseuille et corde

- Trois analyses supplémentaires sont approfondies : `travail-energie-mecanique`, `viscosite-poiseuille` et `onde-corde`. Leurs 18 systèmes et 108 sous-niveaux conservent leurs coordonnées et leurs renvois scientifiques. Les 19 autres analyses, dont le lot AP1, sont conservées.
- Le lot ajoute 108 entrées locales explicites, 126 relations qualifiées et 63 évaluations détaillées. Au total, six analyses disposent de ces précisions : **216 sous-niveaux, 252 relations et 126 évaluations**. Les seize autres fiches gardent leur première rédaction analytique.
- Les traitements théoriques de retour explicitent des bilans ou inversions conditionnelles et leur confrontation à la théorie d'entrée. Les comparaisons 6/1 portent sur les attributs initiaux ; les variantes de freinage, rayon ou tension restent des applications complémentaires, avec leurs paramètres modifiés déclarés.
- Les trois sujets sont physiques et les exemples calculés. La rédaction sépare paramètres supposés, conséquences numériques et mesures encore à recueillir. La cohérence interne du calcul ne valide pas indépendamment la loi de force, l'adhérence du fluide ou les propriétés réelles d'une corde.
- Les références MIT et OpenStax sont revérifiées et les exemples recalculés ; [le suivi analytique](PRECISIONS-ANALYTIQUES.md) précise la portée du lot et les sources. Les repères des recueils sont conservés. Aucun ouvrage complet, rendu, extraction privée, export SQL ou secret n'est publié.
- La relecture croisée précise l'égalité des deux écritures du résidu énergétique, l'effet de l'arrondi du débit reconverti et l'absence d'excitation d'un mode lorsque ses deux quadratures sont nulles. Les descriptions signalent les données indépendantes absentes sans suggérer une interface de saisie déjà disponible.
- Validation : **12 tests et 11 350 assertions ; 14 983 contrôles fonctionnels sur 168 pages, sans erreur**. Les contrôles couvrent les six analyses approfondies et les seize analyses initiales, leurs entrées, relations, évaluations, coordonnées, ancres, mentions dans les catalogues et réponses HTTP. Les huit fichiers du lot sont synchronisés avec le site local après sauvegarde. Aucune recette visuelle au navigateur effectuée.

La navigation et les thèmes utilisent les composants du lot AP1. Aucune nouvelle dépendance ni modification de la base ; le site conserve 22 fiches et 792 sous-niveaux. Le perfectionnement progressif se poursuit avant l'extension E1, toujours planifiée.

## 9 septembre 2026 — AP3 : rotation, roulement et référentiel tournant

- Trois analyses existantes sont approfondies : `rotation-axe-fixe`, `roulement-sans-glissement` et `referentiel-tournant`. Leurs 18 systèmes globaux et 108 sous-niveaux gardent leurs coordonnées et leurs passages scientifiques. Les 19 autres analyses, dont les lots AP1 et AP2, sont conservées.
- Le lot précise 108 entrées locales, 126 relations qualifiées et 63 évaluations détaillées. Les neuf analyses approfondies réunissent désormais **324 sous-niveaux, 378 relations et 189 évaluations** ; treize fiches conservent leur première rédaction analytique.
- Les retours théoriques exploitent les résultats disponibles : bilan axial et inertie conditionnelle ; translation, rotation et admissibilité du contact ; recomposition du mouvement dans les deux référentiels. Les comparaisons 4/3, 5/2 et 6/1 précisent leurs objets, conditions, critères et constats.
- Les variantes disque/cerceau, coefficient statique réduit et vitesse relative instantanément nulle restent distinctes des scénarios d'entrée. Le changement de répartition de masse, de condition de contact ou d'état instantané est déclaré avant toute comparaison.
- Les exemples sont recalculés et les références MIT des chapitres 17, 21 et 31 revérifiées ; [le suivi analytique](PRECISIONS-ANALYTIQUES.md) indique leur portée. Les références des deux recueils sont conservées et les données expérimentales absentes restent signalées comme telles.
- La relecture croisée précise le moment axial nul du poids dans le montage du disque, la puissance du frottement distincte de celle du poids, le point matériel de contact et la dérivée de la vitesse de glissement, ainsi que les dérivées en axes rigides et dans la base cylindrique mobile. Les extensions symboliques conservent leurs hypothèses explicites.
- Validation : **12 tests et 12 073 assertions ; 15 052 contrôles fonctionnels sur 168 pages, sans erreur**. Les contrôles couvrent les neuf analyses approfondies et les treize analyses initiales, leurs entrées, relations, évaluations, coordonnées, ancres, mentions dans les catalogues et réponses HTTP. Les huit fichiers du lot sont synchronisés avec le site local après sauvegarde. Aucune recette visuelle au navigateur effectuée.

Le site conserve 22 fiches et 792 sous-niveaux. Les schémas et les thèmes utilisent les composants existants ; aucune nouvelle dépendance ni modification de la base. Les ouvrages complets, rendus privés, extractions, exports SQL et secrets restent hors du dépôt. E1 demeure planifié pendant ce perfectionnement progressif.

## 9 septembre 2026 — AP4 : Newton, orbite centrale et hydrostatique

- Trois analyses existantes sont approfondies : `newton-referentiel`, `force-centrale-orbite` et `hydrostatique-archimede`. Leurs 18 systèmes globaux et 108 sous-niveaux conservent leurs coordonnées et leurs renvois aux passages scientifiques. Les 19 autres analyses, dont AP1 à AP3, sont conservées.
- Le lot précise 108 entrées locales, 126 relations qualifiées et 63 évaluations détaillées. Les douze analyses approfondies réunissent **432 sous-niveaux, 504 relations et 252 évaluations** ; dix fiches gardent leur première rédaction analytique.
- Les traitements théoriques de retour exploitent les résultats d'entrée et en précisent la portée : trajectoire et résultante sur la pente ; centralité, cercle et paramètre gravitationnel ; pression et volume déplacé. Les comparaisons fondamentales 4/3, 5/2 et 6/1 sont définies aux deux étages.
- Les variantes de masse, de rayon orbital ou de masse volumique du corps restent distinctes des cas initiaux. Elles conservent leurs changements d'attributs explicites et ne sont pas présentées comme une succession de mesures réalisées.
- Les exemples sont recalculés et les références MIT des chapitres 7, 25 et 27 revérifiées. Le repère des lois de Kepler est corrigé vers le §25.6 ; [le suivi analytique](PRECISIONS-ANALYTIQUES.md) précise le périmètre et les sources. Les références des deux recueils sont conservées.
- La relecture croisée précise le contact normal sur la pente, la composante tangentielle nulle de la force centrale, les parenthèses du calcul orbital et la différence entre fraction volumique et hauteur immergée. Les calculs inverses gardent leurs paramètres connus explicites ; une force reconstruite sur une trajectoire ne détermine pas une loi arbitraire hors de celle-ci.
- Validation : **12 tests et 12 796 assertions ; 15 121 contrôles fonctionnels sur 168 pages, sans erreur**. Les contrôles couvrent les douze analyses approfondies et les dix analyses initiales, leurs entrées, relations, évaluations, coordonnées, ancres, mentions dans les catalogues et réponses HTTP. Les neuf fichiers du lot sont synchronisés avec le site local après sauvegarde. Aucune recette visuelle au navigateur effectuée.

Le site conserve 22 fiches et 792 sous-niveaux. L'approfondissement réutilise les schémas, les thèmes et les champs du lot AP1 ; aucune nouvelle dépendance ni modification de la base. Les ouvrages complets, rendus et extractions privées, exports SQL et secrets restent hors du dépôt. E1 demeure planifié.

## 9 septembre 2026 — AP5 : élasticité et acoustique

- Deux analyses existantes sont approfondies : `elasticite-lineaire` et `onde-acoustique`. Leurs 12 systèmes globaux et 72 sous-niveaux conservent leurs coordonnées et leurs passages associés. Les 20 autres analyses, dont AP1 à AP4, sont conservées.
- Le lot précise 72 entrées locales, 84 relations qualifiées et 42 évaluations détaillées. Les quatorze analyses approfondies réunissent **504 sous-niveaux, 588 relations et 294 évaluations**. Les huit fiches de mécanique et les six fiches du domaine « Fluides et ondes » ont désormais reçu ce premier approfondissement ; les huit fiches thermodynamiques et statistiques gardent leur première rédaction analytique.
- Les retours théoriques traitent les résultats reçus : travail et allongement de la barre, distinction matériau/objet, flux acoustique et sens de propagation. Les comparaisons fondamentales 4/3, 5/2 et 6/1 gardent leurs objets, conditions, critères et constats aux deux étages.
- Les variantes de longueur et d'amplitude restent distinctes des cas initiaux. Les prédictions conservent leur statut calculé et leurs paramètres connus ; une cohérence interne ne devient pas une caractérisation expérimentale.
- Les exemples sont recalculés et les références OpenStax revérifiées. Une référence au cours 1 du MIT 6.551J est ajoutée à la fiche acoustique pour le flux moyen, le déphasage et les ondes de sens opposés ; [le suivi analytique](PRECISIONS-ANALYTIQUES.md) précise sa portée. Les références des deux recueils sont conservées.
- La relecture croisée précise le signe du travail à la décharge et son raccord au pic atteint : pente, résidu et état de départ doivent être compatibles. En acoustique, la séparation instantanée des contributions locales est distinguée de la reconstruction de signaux complets ; les phases ne sont pas attribuées aux champs nuls.
- Validation : **12 tests et 13 279 assertions ; 15 167 contrôles fonctionnels sur 168 pages, sans erreur**. Les contrôles couvrent les quatorze analyses approfondies et les huit analyses initiales, leurs entrées, relations, évaluations, coordonnées, ancres, mentions dans les catalogues et réponses HTTP. Les dix fichiers du lot sont synchronisés avec le site local après sauvegarde. Aucune recette visuelle au navigateur effectuée.

Le site conserve 22 fiches et 792 sous-niveaux. Le lot réutilise les schémas et les thèmes existants ; aucune nouvelle dépendance ni modification de la base. Les ouvrages complets, rendus et extractions privées, exports SQL et secrets restent hors du dépôt. E1 demeure planifié.


## 9 septembre 2026 — AP6 : système, gaz parfait et premier principe

- Trois analyses existantes sont approfondies : `systeme-et-grandeurs`, `gaz-parfait` et `premier-principe`. Leurs 18 systèmes globaux et 108 sous-niveaux conservent leurs coordonnées et leurs passages associés. Les 19 autres analyses, dont AP1 à AP5, sont conservées.
- Le lot précise 108 entrées locales, 126 relations qualifiées et 63 évaluations détaillées. Les dix-sept analyses approfondies réunissent **612 sous-niveaux, 714 relations et 357 évaluations**. Cinq fiches thermodynamiques et statistiques gardent leur première rédaction analytique.
- Les retours théoriques traitent les résultats reçus : catégories de parois et duplication conditionnelle, normalisation et reconstruction des grandeurs ; équation d’état, effet d’arrondi et interprétation non unique d’un écart ; conventions d’échange, fermeture énergétique et distinction des termes omis. Les comparaisons 4/3, 5/2 et 6/1 sont explicites aux deux étages.
- Les copies identiques, le volume doublé et la détente libre gardent leurs hypothèses propres. Les variantes ne sont pas des étapes chronologiques d’un même essai. Un résultat reconstruit à partir du calcul initial ne devient pas une mesure indépendante.
- Les exemples et les inversions sont recalculés. Les références MIT, BIPM et IUPAC existantes sont revérifiées ; [le suivi analytique](PRECISIONS-ANALYTIQUES.md) en précise la portée. Les fiches scientifiques, leurs références et les repères des deux recueils sont conservés.
- La relecture croisée conserve les conditions d’additivité et de subdivision macroscopique, distingue l’arrondi d’une incertitude de mesure et borne les interprétations d’un résidu. Un système fermé est défini par l’absence de passage de matière ; l’adiabaticité seule ne suffit pas à conclure que le travail est nul.
- Validation : **12 tests et 14 002 assertions ; 15 236 contrôles fonctionnels sur 168 pages, sans erreur**. Les contrôles couvrent les dix-sept analyses approfondies et les cinq analyses initiales, leurs entrées, relations, évaluations, coordonnées, ancres, mentions dans les catalogues et réponses HTTP. Les huit fichiers du lot sont synchronisés avec le site local après sauvegarde. Aucune recette visuelle au navigateur effectuée.

Le site conserve 22 fiches et 792 sous-niveaux. Le lot réutilise les schémas et les thèmes existants ; aucune nouvelle dépendance ni modification de la base. Les ouvrages complets, rendus et extractions privées, exports SQL et secrets restent hors du dépôt. E1 demeure planifié.


## 9 septembre 2026 — AP7 : capacités thermiques, détentes et entropie

- Trois analyses existantes sont approfondies : `capacites-thermiques`, `detente-isotherme` et `entropie`. Leurs 18 systèmes globaux et 108 sous-niveaux conservent leurs coordonnées et leurs passages associés. Les 19 autres analyses, dont AP1 à AP6, sont conservées.
- Le lot précise 108 entrées locales, 126 relations qualifiées et 63 évaluations détaillées. Les vingt analyses approfondies réunissent **720 sous-niveaux, 840 relations et 420 évaluations**. Les deux fiches `microcanonique` et `boltzmann` gardent leur première rédaction analytique.
- Les traitements théoriques relient capacités et contraintes, travail et chemin, variation d’entropie et environnement. Les retours exploitent réellement leurs entrées et explicitent les comparaisons 4/3, 5/2 et 6/1 aux deux étages.
- Les deux chauffages sont comparés à températures initiale et finale communes, avec des états mécaniques généralement différents. Les détentes relient les mêmes états d’équilibre sous des conditions d’échange distinctes. Le retour par compression après la détente libre restitue le gaz mais conserve les changements de l’environnement.
- Les exemples et les bilans de retour sont recalculés. Les références MIT et IUPAC existantes sont revérifiées ; [le suivi analytique](PRECISIONS-ANALYTIQUES.md) précise leur portée. Les fiches scientifiques, leurs bibliographies et les repères des deux recueils sont conservés.
- La relecture croisée précise la dépendance entre pression et volume initiaux, le non-double comptage des travaux et les unités de la pente d’une capacité variable. Le contact thermique est supposé passif avec température uniforme sur l’interface considérée ; les productions et les changements des partenaires restent distincts. L’égalité d’une moyenne calorique ou d’un bilan global ne suffit pas à identifier tout un modèle ou tout un chemin.
- Validation : **12 tests et 14 725 assertions ; 15 305 contrôles fonctionnels sur 168 pages, sans erreur**. Les contrôles couvrent les vingt analyses approfondies et les deux analyses initiales, leurs entrées, relations, évaluations, coordonnées, ancres, mentions dans les catalogues et réponses HTTP. Les huit fichiers du lot sont synchronisés avec le site local après sauvegarde. Aucune recette visuelle au navigateur effectuée.

Le site conserve 22 fiches et 792 sous-niveaux. Le lot réutilise les schémas et les thèmes existants ; aucune nouvelle dépendance ni modification de la base. Les ouvrages complets, rendus et extractions privées, exports SQL et secrets restent hors du dépôt. E1 demeure planifié après la relecture des deux analyses statistiques restantes.

## 9 septembre 2026 — AP8 : microcanonique et Boltzmann

- Deux analyses existantes sont approfondies : `microcanonique` et `boltzmann`. Leurs 12 systèmes globaux et 72 sous-niveaux conservent leurs coordonnées et leurs passages associés. Les 20 analyses des lots AP1 à AP7 sont conservées.
- Le lot précise 72 entrées locales, 84 relations qualifiées et 42 évaluations détaillées. Les **22 fiches existantes** ont désormais reçu un premier approfondissement analytique : **792 sous-niveaux, 924 relations et 462 évaluations**. Cette couverture ne clôt pas la relecture scientifique avec l'auteur.
- Microcanonique : distinguer support énergétique, postulat d'équiprobabilité, probabilité d'un événement et multiplicité. Les retours reconstruisent les contraintes, explicitent les conditions d'une inversion des regroupements et retrouvent une coquille uniforme par conditionnement canonique. La bijection de complément relie les supports à ε et 2ε, sans les transformer en évolution spontanée d'un système isolé.
- Boltzmann : distinguer poids, normalisation, probabilités individuelles et de niveau, moyenne et valeurs possibles de l'énergie. Les retours traitent la dispersion, la dérivée à spectre fixé, le changement d'origine et l'inversion du rapport de probabilités avec sa multiplicité. Le modèle à deux micro-états excités reste une variante séparée.
- Les comparaisons 4/3, 5/2 et 6/1 sont explicites aux deux étages. Les paramètres non fournis restent symboliques ; les états sont supposés et les probabilités calculées. Une cohérence interne ne devient pas une thermométrie, une mesure d'énergie ou une validation expérimentale du choix d'ensemble.
- Dénombrements, probabilités, moyennes, conditionnements et inversions sont recalculés. Les références MIT existantes sont revérifiées ; [le suivi analytique](PRECISIONS-ANALYTIQUES.md) en précise la portée. Les fiches scientifiques, les bibliographies et les repères des deux recueils sont conservés.
- La relecture croisée clarifie la réception séparée de la variante microcanonique lors de la reprise du niveau 1 et la notation des trois micro-états du modèle dégénéré. Le cardinal d'un support et la valeur d'une moyenne ne suffisent pas à retrouver tous les attributs du système.
- Validation : **12 tests et 15 207 assertions ; 15 351 contrôles fonctionnels sur 168 pages, sans erreur**. Les contrôles couvrent les 22 analyses approfondies, leurs entrées, relations, évaluations, coordonnées, ancres, mentions dans les catalogues et réponses HTTP. Les huit fichiers du lot sont synchronisés avec le site local après sauvegarde. Aucune recette visuelle au navigateur effectuée.

Le site conserve 22 fiches et 792 sous-niveaux. Le lot réutilise les schémas et les thèmes existants ; aucune nouvelle dépendance ni modification de la base. Les ouvrages complets, rendus et extractions privées, exports SQL et secrets restent hors du dépôt. Le prochain lot de nouveaux contenus planifié est E1, consacré aux champs et à l'électromagnétisme ; les textes existants restent perfectibles.

## 9 septembre 2026 — E1a : premier parcours d’électrostatique

- Trois nouvelles fiches ouvrent le domaine Électromagnétisme : `champ-coulomb`, `potentiel-energie-electrique` et `gauss-sphere-chargee`. Chacune est rédigée directement avec six systèmes et 36 sous-niveaux précisés. Les 22 fiches et analyses précédentes sont conservées à l’identique.
- Ce volet ajoute **108 sous-niveaux, 126 relations qualifiées et 63 évaluations**. Le catalogue atteint **25 fiches, 150 systèmes, 900 sous-niveaux, 1 050 relations et 525 évaluations**. Les traitements 2 et 5 exploitent leurs entrées ; les comparaisons 4/3, 5/2 et 6/1 sont explicites aux deux étages.
- Coulomb distingue la source, le champ et la force sur une charge test négative. Les retours reconstruisent conditionnellement les paramètres et comparent deux distances. Potentiel relie différence de potentiel, énergie et travail, avec inversion du trajet et changement de référence. Gauss distingue le flux du champ local et reconstruit la charge sous symétrie sphérique ; la répartition volumique uniforme reste distincte du cas conducteur.
- Une boucle d’orientation relie les trois fiches. Leurs schémas individuels donnent accès aux six sous-boucles, aux coordonnées et aux comparaisons. Neuf équations MathML portent le total à **52**. Quatre domaines sont disponibles et huit restent planifiés.
- Les repères CPGE P13 p. 372, P11 p. 355 et théorie PC2 p. 268 sont examinés visuellement. Les références OpenStax sont vérifiées. La clarification **C18** distingue l’énergie qV d’une charge dans un potentiel extérieur de la demi-somme d’assemblage d’un ensemble de charges, hors auto-énergies. Le journal comprend désormais **18 corrections ou clarifications** ; les PDF sources ne sont pas modifiés.
- Les trois analyses sont relues intégralement puis croisées indépendamment. Les exemples, signes, rapports, inversions et évaluations sont recalculés ; les neuf expressions MathML sont relues. Les valeurs supposées et calculées ne sont pas présentées comme des observations, et un retour inverse ne vaut pas validation indépendante du modèle.
- Validation : **12 tests et 17 226 assertions ; 17 344 contrôles fonctionnels sur 190 pages, sans erreur**. Les contrôles couvrent le catalogue, les MathML, les calculs, les 25 analyses, leurs entrées, relations, évaluations, coordonnées, ancres et réponses HTTP. Les fichiers du lot sont synchronisés avec le site local après sauvegarde. Aucune recette visuelle au navigateur effectuée.

Voir [le détail scientifique et documentaire d’E1a](ELECTROSTATIQUE-E1A.md). Ce premier volet ne termine pas E1 : champ magnétique et force de Lorentz, magnétostatique, induction, autres équations de Maxwell et milieux restent à développer. Les textes restent perfectibles avec l’auteur. Les ouvrages complets, rendus et extractions privées, exports SQL et secrets restent hors du dépôt.
