# E1e : propagation, polarisation et énergie des ondes

Ce cinquième volet de l’électromagnétisme ajoute trois fiches originales avec leurs analyses complètes à deux étages. Il prolonge [Maxwell et les circuits inductifs E1d](MAXWELL-INDUCTANCE-E1D.md). La rédaction reste ouverte aux précisions et à la relecture scientifique de l’auteur.

| Fiche | Système supposé | Traitement de retour |
| --- | --- | --- |
| `onde-electromagnetique-vide` | Onde plane progressive monochromatique dans une région vide sans sources | Vérifier les contraintes de Maxwell, reconstruire les paramètres accessibles et comparer deux sens de propagation |
| `polarisation-onde-electromagnetique` | Deux composantes transverses cohérentes, de même fréquence | Inverser des projections et distinguer ellipse géométrique, sens de parcours et phase |
| `energie-onde-poynting` | Une onde plane traversant une aire pendant une durée définie | Retrouver l’amplitude sous conditions, puis comparer les flux sur deux orientations de surface |

## Une onde particulière, avec ses contraintes

La première fiche choisit une onde vers +z, avec E = E0 cos(ωt−kz) e_x et B = (E0/c) cos(ωt−kz) e_y. Aucun champ statique n’est superposé. La région est vide de charges et de courants ; ni antenne, ni interface ne sont modélisées. Le modèle n’affirme pas que tout champ électromagnétique dans le vide est une onde plane monochromatique.

Les équations de Maxwell donnent la transversalité, l’équation d’onde et ω = ck. B = (n × E)/c relie les champs pour une unique onde progressive de direction unitaire n. Un champ longitudinal sinusoïdal peut satisfaire l’équation d’onde tout en violant Gauss dans le vide : résoudre d’Alembert seul ne remplace donc pas les contraintes de Maxwell. [OpenStax, §16.2](https://openstax.org/books/university-physics-volume-2/pages/16-2-plane-electromagnetic-waves), [MIT 6.013, §2.2](https://ocw.mit.edu/courses/6-013-electromagnetics-and-applications-spring-2009/d3be4ea78b036a6362230fb41780cf54_MIT6_013S09_notes.pdf).

Avec f = 100 MHz et E0 = 3,00 V/m, T = 10 ns, λ = 2,99792458 m et B0 ≈ 10,006922856 nT. À z = 0 et t = T/8, Ex ≈ 2,121320344 V/m et By ≈ 7,075963010 nT. La relation vectorielle reste valable aux zéros instantanés des champs, où le quotient Ex/By n’est pas défini. La variante séparée vers −z conserve fréquence et amplitude ; au plan z = 0, elle a le même Ex temporel mais le champ magnétique opposé. Les deux cas ne sont pas superposés pour former une onde stationnaire.

Les calculs utilisent c = 299 792 458 m/s, exact dans le SI. μ0 ≈ 4π × 10⁻⁷ H/m est approché ; ε0 est calculé par 1/(μ0c²), soit environ 8,85418781762 × 10⁻¹² F/m, pour conserver la cohérence numérique. Cela ne rend pas μ0 et ε0 exacts. Les décimales servent aux contrôles, sans indiquer une précision de mesure. [BIPM, définition du mètre](https://www.bipm.org/en/si-base-units/metre), [NIST CODATA 2022](https://physics.nist.gov/cuu/pdf/all.pdf).

## Polarisation : ce que les projections conservent

La deuxième fiche utilise Ex = a cosψ et Ey = b cos(ψ+δ), avec ψ = ωt−kz, a = 3,00 V/m et b = 2,00 V/m. Pour δ = −π/2, le champ décrit une ellipse à position fixée : il part de +x vers +y à z = 0, t = 0, vu depuis +z en regardant l’origine. L’ellipse décrit les extrémités d’un vecteur champ, pas la trajectoire d’une particule. Les conventions de phase et de vue sont explicites, sans dépendre des appellations « droite » et « gauche ».

Un analyseur linéaire idéal projette E sur son axe. La moyenne du carré de cette projection donne l’intensité transmise. Pour cette ellipse en quadrature, les axes à 0°, 90° et 45° transmettent respectivement 9/13, 4/13 et 1/2 de l’intensité incidente. La formule de Malus pour un champ incident rectiligne ne s’applique pas directement à une ellipse arbitraire. [MIT RES.6-002, chapitre 7, §7-4-6 et §7-4-7](https://ocw.mit.edu/courses/res-6-002-electromagnetic-field-theory-a-problem-solving-approach-spring-2008/85a1dfee83863a0bad0dee5c7305ec30_MITRES_6_002S08_chapter7.pdf).

La variante δ = +π/2 décrit la même ellipse dans l’autre sens. Toutes les intensités transmises par des analyseurs linéaires restent identiques : ces données seules ne retrouvent pas le signe du déphasage ni la phase absolue. Une information temporelle signée permettrait de distinguer les sens ; ici, les valeurs sont calculées. Les cas rectiligne (δ = 0) et circulaire (amplitudes égales en quadrature) sont des applications auxiliaires distinctes.

## Énergie : moyenne temporelle et surface orientée

La troisième fiche part de u = ε0E²/2 + B²/(2μ0) et S = E × B/μ0. Le bilan local est ∂u/∂t + div S = −j·E. Dans la région sans courant, et pour cette seule onde progressive, les contributions électrique et magnétique sont égales, avec S = cu e_z. Ces égalités particulières ne sont pas étendues à toute superposition de champs.

Pour l’onde linéaire sinusoïdale d’amplitude crête E0 = 3,00 V/m, l’intensité moyenne vaut I ≈ 0,01194488428 W/m². Le facteur 1/2 provient de la moyenne de cos² ; la valeur efficace E0/√2 est distincte du champ moyen signé, nul. [OpenStax, §16.3](https://openstax.org/books/university-physics-volume-2/pages/16-3-energy-carried-by-electromagnetic-waves).

Une aire géométrique A = 0,0100 m² normale à +z reçoit un flux moyen de puissance d’environ 0,119448843 mW. Pendant 1,00 µs, soit 100 périodes, l’énergie traversante vaut environ 0,119448843 nJ. La fenêtre entière de périodes rend la moyenne exacte dans le modèle, quelle que soit la phase initiale. Une fenêtre arbitraire demanderait l’intégrale temporelle complète.

Avec la même aire, dont la normale forme un angle de 60° avec +z, l’énergie traversante est divisée par deux. L’intensité de l’onde reste inchangée. La surface est un support de calcul de flux ; aucune absorption par un détecteur n’est supposée. Retrouver E0 depuis cette énergie exige aire, durée, angle et modèle de polarisation connus. Un flux nul sur une surface parallèle à la propagation n’implique pas un champ nul. On calcule une énergie traversant une aire et une durée finies, pas l’énergie totale d’une onde idéale infinie.

## Deux étages analytiques et suivi

Chaque fiche possède six systèmes et 36 sous-niveaux spécifiques. Les traitements théoriques 2 et 5 exploitent leurs entrées 1 et 4, et produisent les résultats 3 et 6. Les comparaisons 4/3, 5/2 et 6/1 précisent objet, conditions, critère et constat aux deux étages. Les raccords entre systèmes, les retours locaux et le statut des données sont explicites. Une inversion sur des résultats du même modèle reste un contrôle interne.

Le lot ajoute **108 sous-niveaux, 126 relations, 63 évaluations et neuf MathML**. La cinquième boucle du domaine, `#boucle-ondes-electromagnetiques`, oriente vers ces situations distinctes ; elle ne simule pas une expérience qui les enchaînerait. Les schémas 6 × 6, coordonnées, info-bulles, accès au clavier et thèmes clair/sombre sont réutilisés. La polarisation prépare le domaine optique O1, qui reste planifié. Les repères du domaine incluent désormais P10 pour la polarisation et P15 pour le circuit RL déjà disponible.

Les passages des recueils ont été inspectés visuellement : CPGE P10 p. 339 et P11 p. 352, 354–355 ; théorie PC2 p. 263–265 et 280. La clarification **C23** précise le statut de l’OPPM dans CPGE p. 352 et théorie p. 263 ; elle corrige aussi la transversalité notée E0 ⟂ r dans CPGE p. 352, au lieu de la direction de propagation k. Le recueil théorique indique déjà E0 ⟂ k. Cela ne constitue pas une validation de tous les énoncés voisins, notamment sur les conducteurs.

Le catalogue atteint **37 fiches, 222 systèmes, 1 332 sous-niveaux, 1 554 relations, 777 évaluations, 88 MathML et 23 corrections ou clarifications**. Les 34 fiches précédentes et leurs analyses sont conservées. Quatre domaines sont disponibles et huit restent planifiés.

Voir [les vérifications effectives dans le journal](AVANCEES.md). Les milieux, interfaces et couplages pourront prolonger E1. Les textes sont des synthèses originales ; PDF commerciaux, rendus, extractions, SQL et secrets restent privés.
