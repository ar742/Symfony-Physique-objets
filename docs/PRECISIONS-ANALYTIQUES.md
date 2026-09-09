# Préciser les analyses existantes

Cette progression applique les [fondements du projet](FONDEMENTS-DU-PROJET.md) aux fiches déjà rédigées. Elle conserve leurs coordonnées afin de permettre la reprise de chaque élément. Les lots **AP1 à AP5** concernent quatorze fiches :

| Lot | Fiche | Nature du sujet | Périmètre |
| --- | --- | --- | --- |
| AP1 | `oscillateur-harmonique` | Phénomène physique | Masse-ressort libre, sans frottement puis avec résistance linéaire ; exemples calculés |
| AP1 | `continuite-bernoulli` | Phénomène physique | Écoulement stationnaire incompressible ; débit imposé, sections et pression, limites du bilan idéal |
| AP1 | `lagrange-hamilton` | Objet théorique | Correspondance entre les deux formalismes sur un même oscillateur ; attributs mathématiques et conséquences calculées |
| AP2 | `travail-energie-mecanique` | Phénomène physique | Mobile ponctuel sur piste horizontale, traction et frottement constants ; bilans et freinage calculés |
| AP2 | `viscosite-poiseuille` | Phénomène physique | Fluide newtonien en tube circulaire horizontal, régime laminaire établi ; débit, profil et dissipation |
| AP2 | `onde-corde` | Phénomène physique | Corde idéale homogène à extrémités fixes, petites pentes ; propagation et modes propres |
| AP3 | `rotation-axe-fixe` | Phénomène physique | Disque puis cerceau autour du même axe central fixe ; couple constant, palier idéal |
| AP3 | `roulement-sans-glissement` | Phénomène physique | Cylindre homogène sur plan incliné fixe ; contact idéal et condition de frottement statique |
| AP3 | `referentiel-tournant` | Phénomène physique | Même point matériel décrit dans deux repères ; origine commune fixe et rotation uniforme |
| AP4 | `newton-referentiel` | Phénomène physique | Mobile ponctuel sur pente fixe sans frottement ; bilan des forces, intégration et conditions initiales |
| AP4 | `force-centrale-orbite` | Phénomène physique | Force centrale puis gravitation newtonienne ; orbite circulaire et paramètres conditionnels |
| AP4 | `hydrostatique-archimede` | Phénomène physique | Liquide homogène au repos, pression puis bloc flottant librement ; équilibre vertical |
| AP5 | `elasticite-lineaire` | Phénomène physique | Barre homogène en traction quasistatique ; petites déformations, raideur et travail élastique |
| AP5 | `onde-acoustique` | Phénomène physique | Onde plane progressive sinusoïdale dans un fluide homogène ; pression, flux moyen et niveau d’intensité |

## Ce qui est précisé

Les 504 sous-niveaux de ces cinq lots reprennent les attributs reçus, le traitement effectué et la sortie à conserver. Chacun des lots AP1 à AP4 en approfondit 108 ; AP5 en approfondit 72. Les fonctions 2 et 5 réalisent un traitement théorique propre au système local : le retour ne se limite pas à inviter à vérifier ou décider.

Chaque niveau global et sous-niveau possède une relation entrante qualifiée. Les **588 relations** décrivent comment les entrées conduisent à l'élément étudié : dépendance logique, calcul, lecture, interprétation ou autre relation explicitée. Un contrôle de cohérence ne devient pas une mesure ; un changement de cas calculé ne devient pas une chronologie expérimentale.

Les trois comparaisons globales et les dix-huit comparaisons locales de chaque fiche possèdent quatre champs, soit **294 évaluations détaillées** au total :

1. **Éléments comparés** : références exactes, correspondant à 4/3, 5/2 ou 6/1.
2. **Conditions de comparaison** : hypothèses communes, conventions et statut des données.
3. **Critère d'évaluation** : identité, relation, ordre de grandeur, signe ou autre critère précisé.
4. **Constat ou question ouverte** : résultat de calcul ou de raisonnement, réserve, informations encore nécessaires.

La réécriture conserve les hypothèses, exemples et références scientifiques des fiches. Les cadres d'entrée et de retour restent perfectibles. Les modèles conditionnels de diagnostic n'attribuent aucune valeur mesurée à un paramètre absent des données.

Les repères externes existants ont été revérifiés le 9 septembre 2026 : [MIT 8.01SC, chapitre 23](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter23.pdf) pour rappel linéaire, amortissement et énergie ; [MIT 8.223, cours 15](https://ocw.mit.edu/courses/8-223-classical-mechanics-ii-january-iap-2017/09ab68ae8e7987debc025892e00c0f1f_MIT8_223IAP17_Lec15.pdf) pour la transformation de Legendre, les équations canoniques et l'autonomie ; [OpenStax, §14.6](https://openstax.org/books/university-physics-volume-1/pages/14-6-bernoullis-equation) pour les hypothèses et le bilan de Bernoulli. Les références des recueils restent celles des fiches ; aucun document complet n'est ajouté au dépôt.

## AP2 : bilans, écoulement visqueux et corde

Le deuxième lot applique la même structure à trois phénomènes physiques. Les exemples numériques sont supposés et calculés ; les protocoles évoqués restent à réaliser. Les retours théoriques traitent les résultats disponibles avant d'en confronter la portée au modèle d'entrée.

- **Travail et énergie** : expliciter les travaux signés, retrouver une force résistante dans le cadre annoncé et comparer le dossier de retour aux attributs initiaux. Le freinage sans traction repart de 3 m·s⁻¹, soit 9 J ; ses 4,5 m d'arrêt ne sont pas les 4 m du trajet avec traction.
- **Poiseuille** : relier pression, cisaillement, profil et débit, puis examiner la résistance hydraulique et les inversions conditionnelles. Un débit ne détermine pas simultanément rayon, viscosité et chute de pression. Le faible Reynolds reste distinct des hypothèses d'adhérence et de profil établi ; la dissipation demeure présente.
- **Corde** : séparer déplacement matériel, propagation et modes imposés par les extrémités. Retrouver la tension depuis les fréquences exige de connaître longueur et masse linéique. Les amplitudes dépendent des conditions initiales ; le temps de parcours et la période fondamentale sont deux grandeurs différentes.

Les relations de référence ont été vérifiées le 9 septembre 2026 : [MIT 8.01SC, chapitre 13](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter13.pdf) pour le travail et le théorème de l'énergie cinétique ; [OpenStax, §14.7](https://openstax.org/books/university-physics-volume-1/pages/14-7-viscosity-and-turbulence) pour résistance hydraulique et régime ; [OpenStax, §16.3](https://openstax.org/books/university-physics-volume-1/pages/16-3-wave-speed-on-a-stretched-string) et [§16.6](https://openstax.org/books/university-physics-volume-1/pages/16-6-standing-waves-and-resonance) pour la célérité et les modes de corde. Les inversions proposées sont des conséquences algébriques des modèles annoncés, contrôlées par recalcul ; elles ne fournissent pas de nouvelles observations. Les repères des deux recueils restent ceux des fiches.

## AP3 : rotation, roulement et référentiel tournant

Le troisième lot approfondit trois autres sujets physiques. Chaque chaîne de retour traite les résultats du scénario d'entrée puis explicite la portée de la comparaison. Les variantes restent séparées du cas initial ; les sorties calculées ne sont pas des observations indépendantes.

- **Rotation axiale** : relier distribution de masse, moment d'inertie et moment axial, puis confronter dynamique et travail du couple. Le passage du disque au cerceau conserve masse, rayon, couple et durée. Retrouver une inertie depuis le mouvement exige de connaître les actions extérieures ; un accord énergétique interne ne mesure pas les frottements d'un palier. [MIT, chapitre 17](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter17.pdf).
- **Roulement** : distinguer point matériel et position de contact, puis associer translation, rotation et admissibilité du frottement statique. La puissance totale de ce frottement est nulle dans le modèle idéal sur support fixe, alors que ses contributions de translation et de rotation se compensent. La variante avec μs = 0,10 échoue au test d'adhérence ; aucune trajectoire de glissement n'est chiffrée sans loi correspondante. [MIT, chapitre 21, exemple 21.4](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter21.pdf).
- **Référentiel tournant** : reconstruire les vitesses et accélérations du même point dans les deux descriptions. Les termes centrifuge et de Coriolis sont séparés des interactions matérielles. La variante v′ = 0 concerne un instant ; elle ne suffit pas à conclure à un équilibre relatif. Les dérivées sont rattachées au repère utilisé. [MIT, chapitre 31](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter31.pdf).

Ces références existantes ont été revérifiées le 9 septembre 2026. Les exemples et les contrôles inverses sont recalculés dans les hypothèses indiquées ; les passages des deux recueils gardent leurs repères existants et leurs documents privés.

## AP4 : forces, orbites et équilibre d'un fluide

Le quatrième lot reprend trois sujets physiques existants. Les modèles et leurs conditions initiales conduisent à des résultats calculés, ensuite utilisés pour retrouver certains attributs d'entrée. Les données indépendantes nécessaires pour confronter ces modèles au réel restent à recueillir.

- **Newton** : distinguer les interactions extérieures de leur résultante, projeter le bilan dans les axes de la pente et intégrer avec les conditions initiales. Le retour sépare reconstruction de l'accélération, du départ et d'une force conditionnelle. Doubler la masse conserve le mouvement idéal, tout en doublant le poids et la réaction. [MIT, chapitre 7, §7.2–7.4](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter7.pdf).
- **Orbite centrale** : distinguer conservation du moment cinétique, hypothèse gravitationnelle et conditions du cercle. Retrouver GM depuis un rayon et une période suppose le modèle annoncé ; un seul cercle n'identifie pas toute une loi radiale. Le second rayon est un scénario distinct, avec ses propres conditions circulaires. [MIT, chapitre 25, §25.2–25.3, §25.4.1 et §25.6](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter25new.pdf).
- **Hydrostatique et Archimède** : distinguer pression absolue et surpression, puis relier la résultante des pressions au volume déplacé. Les inversions de profondeur ou de masse volumique gardent leurs paramètres connus explicites. La variante du corps plus dense demande un volume immergé supérieur au volume total ; le bilan de flottaison libre n'a donc pas de solution. L'équilibre vertical reste distinct de la stabilité en inclinaison. [MIT, chapitre 27, §27.3–27.4 et §27.6](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter27.pdf).

Ces références ont été revérifiées le 9 septembre 2026. Le repère de la référence orbitale a été corrigé pour situer les lois de Kepler au §25.6. Les exemples et les inversions sont recalculés ; les repères des recueils sont conservés et leurs documents restent privés.

## AP5 : élasticité et acoustique

Le cinquième lot approfondit les deux dernières fiches du domaine « Fluides et ondes » encore dans leur première rédaction. Leurs 72 sous-niveaux conservent les scénarios et les coordonnées existants. Les valeurs restent supposées et calculées ; les retours explicitent les informations nécessaires à une confrontation indépendante.

- **Élasticité** : distinguer module du matériau, géométrie et raideur de la barre. La somme des forces opposées peut être nulle alors que leurs points d'application se déplacent et que le chargement stocke de l'énergie. Les retours examinent les conditions de reconstruction du module et les limites d'une déduction fondée sur un seul allongement. La longueur doublée définit une autre barre à section, module et effort conservés. [OpenStax, §12.3](https://openstax.org/books/university-physics-volume-1/pages/12-3-stress-strain-and-elastic-modulus).
- **Acoustique** : relier amplitude et pression efficace, vitesse particulaire, célérité et flux moyen, puis expliciter les hypothèses des conversions. L'intensité dépend conjointement de la pression et de la vitesse ; les ondes de sens opposés montrent pourquoi la pression seule ne suffit pas dans un champ inconnu. La variante double l'amplitude à milieu et fréquence constants ; les décibels restent un niveau d'intensité avec sa référence. [OpenStax, §17.2](https://openstax.org/books/university-physics-volume-1/pages/17-2-speed-of-sound) et [§17.3](https://openstax.org/books/university-physics-volume-1/pages/17-3-sound-intensity).

Les références OpenStax ont été revérifiées le 9 septembre 2026. La bibliographie acoustique est complétée par le [cours 1 du MIT 6.551J](https://ocw.mit.edu/courses/6-551j-acoustics-of-speech-and-hearing-fall-2004/c45734e2684a8592c0600120a0b6584c_lec_1_2004.pdf), p. 6 pour le flux et le déphasage, p. 14 pour les deux sens de propagation. Les reconstructions sont des conséquences des relations annoncées, contrôlées par recalcul. Les repères des recueils et leurs documents privés sont conservés.

## Lecture dans le site

Les fiches concernées portent la mention « Entrées et évaluations précisées » dans les catalogues. Leur schéma global indique la nature et le périmètre du sujet ainsi que la révision de l'analyse.

Dans une page de niveau, chaque point présente ses éléments reçus et la nature du lien entrant. Les retours affichent les quatre champs d'évaluation à côté des liens vers les éléments comparés. Les coordonnées et tous les anciens liens restent utilisables.

Les autres fiches affichent leurs comparaisons sous leur forme initiale. Ce maintien permet de perfectionner les analyses par groupes cohérents sans prétendre que tout le catalogue a reçu la même profondeur de relecture.

## Rédaction et données

Dans `app/config/content/analyses-fiches.json`, une analyse précisée comporte :

- `subject` : `type` (`physique` ou `theorique`), `description` et `scope` ;
- `refinement`, `version`, `updated` : repères de révision ;
- un `input` à chaque sous-niveau, en plus des entrées globales existantes ;
- une `relation` par niveau et sous-niveau : `nature` et `description` du lien avec ses entrées ;
- une `evaluation` aux positions 4, 5 et 6 des deux étages : `object`, `conditions`, `criterion`, `finding`.

Le champ `comparison` conserve un résumé compatible. Les gabarits affichent les quatre champs quand ils sont présents, ou la comparaison initiale sinon. Les tests vérifient la couverture complète des analyses précisées ; une vérification technique ne remplace pas la relecture du sens des textes.

La suite du perfectionnement appliquera ces exigences aux autres fiches, en réexaminant réellement le rôle théorique de chaque 2 et 5 et l'objet des trois comparaisons de chaque boucle.
