# E1c : solénoïde et premiers modèles d’induction

Ce troisième volet de l’électromagnétisme ajoute trois fiches originales, chacune avec six systèmes et 36 sous-niveaux détaillés. Il prolonge [l’électrostatique E1a](ELECTROSTATIQUE-E1A.md) et [la magnétostatique E1b](MAGNETOSTATIQUE-E1B.md). Leur rédaction reste ouverte à la relecture scientifique de l’auteur.

| Fiche | Système supposé | Retour étudié |
| --- | --- | --- |
| `solenoide-fini` | Nappe cylindrique de courant permanent, champ sur l’axe dans le vide | Comparer centre, extrémité et limite longue ; reconstruire conditionnellement les paramètres accessibles |
| `faraday-circuit-fixe` | Bobine fixe soumise à une rampe régulière de champ extérieur, modèle résistif | Relier flux, courant et énergie ; reconstruire une variation de champ et distinguer son offset initial |
| `induction-tige-mobile` | Tige sur rails dans un champ permanent, vitesse maintenue par un agent extérieur | Relier force électromotrice, freinage et puissance ; distinguer information signée et information quadratique |

## Des hypothèses et des orientations explicites

Le solénoïde est un modèle continu de bobinage serré de rayon a = 0,020 m, longueur ℓ = 0,200 m, N = 1 000 spires et I = +0,500 A. Le courant est orienté pour produire un champ selon +z. L’intégration des champs de spires donne une expression axiale valable pour la nappe continue finie : elle n’affirme pas que tout l’intérieur d’un bobinage réel est uniforme. Au centre, Bz ≈ 3,080585047 mT ; à une extrémité, Bz ≈ 1,563000763 mT. L’approximation longue B∞ ≈ 3,141592654 mT surestime le champ central de 1,980390 % relativement à celui-ci. La limite géométrique à densité n fixée est distinguée d’un changement de longueur à N fixé.

Ces calculs emploient μ0 ≈ 4π × 10⁻⁷ T·m/A, valeur approchée et non exacte dans le SI actuel. Les décimales servent au contrôle des calculs ; elles ne décrivent pas une précision de mesure. La référence [NIST CODATA 2022, p. 1](https://physics.nist.gov/cuu/pdf/all.pdf), déjà utilisée dans E1b, est conservée.

La bobine fixe comporte 100 tours de même aire A = 0,010 m², de normale +z, avec une résistance totale R = 20 Ω. Le champ extérieur prescrit suit Bext = B0 + αt, avec B0 = 0,200 T et α = +0,500 T/s, sur un segment de rampe de 0,200 s. La force électromotrice vaut −0,500 V, le courant −0,0250 A, la puissance Joule 0,0125 W et l’énergie dissipée 0,00250 J. Le flux d’une spire Φ et le flux lié λ = NΦ sont séparés. Une variante indépendante avec α négatif inverse le courant alors que le champ reste positif : Lenz porte sur la variation du flux.

Le modèle résistif néglige auto-induction, réaction du secondaire et capacités parasites. L/R doit être compatible avec les échelles de variation et les transitoires exclus du segment étudié. L n’étant pas fourni, cette validité est une hypothèse à examiner, pas une vérification numérique acquise. L’énergie transférée au secondaire provient de la source qui impose le champ variable ; la fiche ne calcule pas le bilan complet de cette source. Une force électromotrice de contour n’est pas une différence de potentiel électrostatique indépendante du chemin.

La tige de longueur ℓ = 0,200 m glisse selon x à v = +3,00 m/s dans un champ B = +0,500 e_z T. Le contour rectangulaire a une normale +z ; son parcours positif suit +y sur la tige. Avec R = 0,600 Ω, la force électromotrice vaut −0,300 V, le courant −0,500 A et la force magnétique sur la tige −0,0500 e_x N. L’agent extérieur fournit une force opposée et une puissance de 0,150 W, égale à la dissipation Joule dans ce modèle. La source du champ magnétique statique n’est pas présentée comme une alimentation énergétique du circuit.

La variante v = −3,00 m/s conserve une aire positive sur le segment examiné et inverse les signes de la force électromotrice, du courant et des forces, tout en gardant une puissance dissipée positive. Elle compare deux régimes à vitesse imposée ; elle ne décrit pas un renversement instantané sans accélération. L’inductance, les capacités et les frottements sont négligés, et l’accélération est nulle dans chacun de ces régimes.

## La même méthode aux deux étages

Le lot ajoute **108 sous-niveaux, 126 relations et 63 évaluations**. Les fonctions 2 et 5 effectuent les traitements théoriques des entrées 1 et 4 ; les résultats 3 et 6 sont réexaminés selon les comparaisons 4/3, 5/2 et 6/1. Chaque évaluation précise son objet, ses conditions, son critère et son constat. Les variantes conservent leurs données propres et les inversions sont conditionnelles. Retrouver une donnée au moyen du même modèle ne constitue pas une validation expérimentale indépendante.

La troisième boucle du domaine, `#boucle-induction`, oriente vers ces fiches en conservant les deux parcours précédents. Elle ne suppose pas que le solénoïde fini produise exactement le champ prescrit dans les deux exemples d’induction : ce sont des situations distinctes. Chaque fiche garde son analyse complète 6 × 6 et les schémas existants, avec coordonnées, info-bulles, accès au clavier et thèmes clair/sombre.

Le catalogue atteint **31 fiches, 186 systèmes, 1 116 sous-niveaux, 1 302 relations et 651 évaluations**. Neuf équations nouvelles portent le total à **70 MathML**. Quatre domaines sont disponibles et huit restent planifiés.

## Sources et correction C20

Les passages utilisés ont été examinés visuellement dans les deux recueils : CPGE P14 p. 379 pour Laplace, p. 380 pour Faraday et Lenz, p. 383 pour le solénoïde ; théorie PC2 p. 269 pour Biot–Savart, Laplace et l’induction. Le passage théorique fournit les lois de départ, sans être présenté comme un exercice identique à chaque nouveau scénario.

La correction **C20** signale une incohérence dans les angles indiqués pour le solénoïde infini, CPGE p. 383. Les valeurs −π et +π donneraient une différence nulle de cosinus, incompatible avec le résultat imprimé μ0nI. La fiche utilise une intégrale axiale sans ambiguïté d’angle. Cette correction ciblée porte le catalogue à **20 corrections ou clarifications**, sans modification des PDF ni validation générale de la page.

Les références externes portent sur les relations scientifiques utilisées : [MIT OCW, chapitre 9, §9.4, équations 9.4.5–9.4.6](https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/378f66ab154c54f34f58ab72fbcf9414_ch9sourc_b_field.pdf), [OpenStax, Faraday §13.1](https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law), [Lenz §13.2](https://openstax.org/books/university-physics-volume-2/pages/13-2-lenzs-law), [tige mobile §13.3](https://openstax.org/books/university-physics-volume-2/pages/13-3-motional-emf), [champ électrique induit §13.4](https://openstax.org/books/university-physics-volume-2/pages/13-4-induced-electric-fields) et [temps de relaxation RL §14.4](https://openstax.org/books/university-physics-volume-2/pages/14-4-rl-circuits). Les fiches et leurs scénarios sont des synthèses originales ; les textes et figures des sources ne sont pas reproduits.

Voir [les vérifications effectives dans le journal](AVANCEES.md). E1 reste en cours : compléments de Maxwell, milieux et circuits inductifs pourront prolonger ces premiers modèles. Les ouvrages commercialisés, rendus et extractions, exports SQL et secrets restent privés.
