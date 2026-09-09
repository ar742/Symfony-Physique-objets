# Préciser les analyses existantes

Cette progression applique les [fondements du projet](FONDEMENTS-DU-PROJET.md) aux fiches déjà rédigées. Elle conserve leurs coordonnées afin de permettre la reprise de chaque élément. Les lots **AP1 à AP8** concernent les vingt-deux premières fiches :

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
| AP6 | `systeme-et-grandeurs` | Phénomène physique | Deux compartiments identiques ; frontières, extensivité et grandeurs rapportées |
| AP6 | `gaz-parfait` | Phénomène physique | Gaz dilué à l’équilibre ; équation d’état, unités SI et inversion conditionnelle |
| AP6 | `premier-principe` | Phénomène physique | Système fermé ; échanges signés, variation interne et variante de détente libre |
| AP7 | `capacites-thermiques` | Phénomène physique | Gaz parfait monoatomique chauffé sous deux contraintes ; capacités, travail et énergie |
| AP7 | `detente-isotherme` | Phénomène physique | Détentes réversible et libre entre mêmes états ; échanges et retour par compression |
| AP7 | `entropie` | Phénomène physique | Gaz et thermostat ; variation d’état, échange et production globale avec le contact |
| AP8 | `microcanonique` | Phénomène physique | Trois sites à énergie fixée ; dénombrement, événements et choix d’ensemble |
| AP8 | `boltzmann` | Phénomène physique | Système discret avec réservoir ; probabilités, dégénérescence et énergie moyenne |

## Ce qui est précisé

Les 792 sous-niveaux de ces huit lots reprennent les attributs reçus, le traitement effectué et la sortie à conserver. Chacun des lots AP1 à AP4, AP6 et AP7 en approfondit 108 ; AP5 et AP8 en approfondissent chacun 72. Les fonctions 2 et 5 réalisent un traitement théorique propre au système local : le retour ne se limite pas à inviter à vérifier ou décider.

Chaque niveau global et sous-niveau possède une relation entrante qualifiée. Les **924 relations** décrivent comment les entrées conduisent à l'élément étudié : dépendance logique, calcul, lecture, interprétation ou autre relation explicitée. Un contrôle de cohérence ne devient pas une mesure ; un changement de cas calculé ne devient pas une chronologie expérimentale.

Les trois comparaisons globales et les dix-huit comparaisons locales de chaque fiche possèdent quatre champs, soit **462 évaluations détaillées** au total :

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

## AP6 : système, gaz parfait et premier principe

Le sixième lot reprend trois fiches de thermodynamique. Les 108 sous-niveaux explicitent les attributs supposés, les traitements théoriques et les résultats calculés, puis les conditions de leur réexamen. Les variantes et les informations encore nécessaires restent identifiées.

- **Système et grandeurs** : distinguer frontières et échanges autorisés, puis additionner deux copies identiques dans le cadre macroscopique annoncé. Les grandeurs extensives et leurs rapports ne se confondent pas. Les volumes, énergies et capacités absents de l'énoncé restent symboliques ; aucun modèle de gaz parfait n'est ajouté. [MIT, systèmes thermodynamiques, p. 1–3](https://ocw.mit.edu/courses/8-044-statistical-physics-i-spring-2013/89308d5289b1c515392685be677fa330_MIT8_044S13_notes.def.pdf), [IUPAC, capacités thermiques](https://goldbook.iupac.org/terms/view/H02753).
- **Gaz parfait** : relier quantité de matière et nombre d'entités, conserver pression absolue et température thermodynamique, puis inverser l'équation d'état avec les paramètres connus. Les constantes SI exactes ne rendent pas les données d'un futur essai exemptes d'incertitude. Un accord calculé de Z avec 1 ne constitue pas une observation indépendante. [BIPM, constantes du SI](https://www.bipm.org/fr/measurement-units/si-defining-constants), [MIT, équation d'état, p. 2](https://ocw.mit.edu/courses/8-044-statistical-physics-i-spring-2013/89308d5289b1c515392685be677fa330_MIT8_044S13_notes.def.pdf).
- **Premier principe** : traduire les transferts dans la convention reçue positive, calculer le solde et examiner ce que permet sa reconstruction. Tous les travaux et les variations d'énergie macroscopique doivent être considérés. La détente libre adiabatique dans le vide est une variante distincte, sans autre travail ; ΔU = 0 ne fixe pas à elle seule la température finale. [MIT, cours 6, p. 6–8, 11, 16–18 et 23–24](https://ocw.mit.edu/courses/8-044-statistical-physics-i-spring-2013/ce5405cf466deea227c0bbdf350d19d2_MIT8_044S13_L6.pdf).

Ces références existantes ont été revérifiées le 9 septembre 2026. Les exemples et les inversions sont recalculés dans leurs hypothèses. Les repères des deux recueils sont conservés ; leurs documents restent privés. Les comparaisons 4/3, 5/2 et 6/1 définissent leurs objets et critères aux deux étages, sans transformer une cohérence interne en validation expérimentale.

## AP7 : capacités, détentes et entropie

Le septième lot reprend trois analyses liées aux échanges thermiques. Leurs 108 sous-niveaux conservent les exemples et leurs coordonnées, puis précisent les contraintes, les traitements de retour et les comparaisons entre systèmes et chemins. Les valeurs restent supposées et calculées.

- **Capacités thermiques** : distinguer les capacités totales, molaires et massiques, puis relier chaleur, variation interne et enthalpie sous les conditions adaptées. Les deux chauffages de 300 à 310 K ne conduisent généralement pas aux mêmes états mécaniques ; leur même ΔU repose ici sur la propriété U(T) du gaz parfait. Une capacité moyenne obtenue sur l'intervalle n'établit pas sa constance. [IUPAC, capacités thermiques](https://goldbook.iupac.org/terms/view/H02753), [MIT, cours 6, p. 10–13 et 16–19](https://ocw.mit.edu/courses/8-044-statistical-physics-i-spring-2013/ce5405cf466deea227c0bbdf350d19d2_MIT8_044S13_L6.pdf).
- **Détentes** : comparer deux chemins entre les mêmes états d'équilibre, en conservant leurs échanges distincts. Le travail réversible est calculé avec la pression d'équilibre le long du chemin ; la détente libre utilise la pression extérieure nulle, sans température globale imposée pendant la relaxation. Le retour par compression réversible restitue l'état du gaz ; après la détente libre, il consomme du travail et rejette de la chaleur vers le thermostat. [MIT, cours 6, p. 16–18 et 23](https://ocw.mit.edu/courses/8-044-statistical-physics-i-spring-2013/ce5405cf466deea227c0bbdf350d19d2_MIT8_044S13_L6.pdf).
- **Entropie** : séparer variation d'état, échange avec le thermostat et production globale, incluant le contact. Le bilan du gaz et du thermostat précise le périmètre auquel la non-négativité s'applique. Un retour du gaz à son état initial n'annule pas une production passée ; une entropie constante du gaz ne prouve pas à elle seule la réversibilité. [MIT, notes microcanoniques, p. 6–7](https://ocw.mit.edu/courses/8-044-statistical-physics-i-spring-2013/328b69f845f540b137c5fbde68203697_MIT8_044S13_mcrocanoncl.pdf).

Ces références existantes ont été revérifiées le 9 septembre 2026. Les bilans des exemples et des retours sont recalculés dans leurs hypothèses. Les comparaisons 4/3, 5/2 et 6/1 sont explicites aux deux étages ; les calculs inverses ne remplacent pas une confrontation indépendante. Les fiches scientifiques et les repères des recueils sont conservés ; leurs ouvrages complets restent privés.

## AP8 : états accessibles et probabilités de Boltzmann

Le huitième lot approfondit les deux dernières analyses dans leur première rédaction. Leurs 72 sous-niveaux distinguent micro-états, événements, poids statistiques et grandeurs moyennes. Les systèmes physiques sont représentés par des modèles discrets ; leurs attributs sont supposés et leurs résultats calculés.

- **Microcanonique** : énumérer les configurations sous contrainte énergétique, puis construire les probabilités sous le postulat d'équiprobabilité. Les trois sites à E = ε et à E = 2ε possèdent chacun trois micro-états, mais des configurations différentes : la probabilité d'excitation du premier site passe de 1/3 à 2/3. Même multiplicité et même entropie n'identifient donc ni l'énergie ni l'ensemble des états. Le dénombrement ne fournit aucune dynamique d'exploration. [MIT, notes microcanoniques, p. 1–4](https://ocw.mit.edu/courses/8-044-statistical-physics-i-spring-2013/328b69f845f540b137c5fbde68203697_MIT8_044S13_mcrocanoncl.pdf).
- **Boltzmann** : normaliser les poids, distinguer probabilité d'un micro-état et d'un niveau dégénéré, puis relier occupation et énergie moyenne. Le retour par le rapport des probabilités exige de connaître les multiplicités ; il identifie ε/T sans séparer les deux paramètres. Le changement d'origine énergétique conserve les probabilités, mais modifie Z et U. La variante de dégénérescence n'est pas un changement du nombre de particules. [MIT, notes canoniques, p. 1–4](https://ocw.mit.edu/courses/8-044-statistical-physics-i-spring-2013/7fa3fb4237d0d00d5603ae4ea8f02236_MIT8_044S13_Canonical.pdf).

Ces références existantes ont été revérifiées le 9 septembre 2026. Dénombrements, probabilités, moyennes et inversions ont été recalculés. La passerelle entre ensembles précise le grand réservoir et le couplage faible ; une cohérence interne ne valide pas expérimentalement le choix d'ensemble. Les comparaisons 4/3, 5/2 et 6/1 sont explicites aux deux étages. Les fiches scientifiques et les repères des recueils sont conservés ; leurs ouvrages complets restent privés.

## Lecture dans le site

Les fiches concernées portent la mention « Entrées et évaluations précisées » dans les catalogues. Leur schéma global indique la nature et le périmètre du sujet ainsi que la révision de l'analyse.

Dans une page de niveau, chaque point présente ses éléments reçus et la nature du lien entrant. Les retours affichent les quatre champs d'évaluation à côté des liens vers les éléments comparés. Les coordonnées et tous les anciens liens restent utilisables.

Les 22 fiches disposent désormais de ces entrées, relations et évaluations détaillées. Cette couverture marque un premier approfondissement analytique complet du catalogue existant ; elle ne clôt pas la relecture scientifique avec l'auteur.

## Nouvelles fiches dès leur création

Le [volet E1a](ELECTROSTATIQUE-E1A.md) ajoute trois fiches d’électrostatique rédigées directement avec les entrées, relations et évaluations détaillées. Le [volet E1b](MAGNETOSTATIQUE-E1B.md) poursuit avec trois fiches de champ magnétique : Lorentz, Ampère et la spire. Le [volet E1c](INDUCTION-E1C.md) ajoute le solénoïde fini, Faraday en circuit fixe et la tige mobile. Le [volet E1d](MAXWELL-INDUCTANCE-E1D.md) poursuit avec Maxwell dans un condensateur, le stockage magnétique et le circuit RL. Le catalogue comporte donc 34 analyses, 1 224 sous-niveaux, 1 428 relations et 714 évaluations. Les comptes AP1 à AP8 ci-dessus décrivent les 22 fiches approfondies lors de ces lots.

## Rédaction et données

Dans `app/config/content/analyses-fiches.json`, une analyse précisée comporte :

- `subject` : `type` (`physique` ou `theorique`), `description` et `scope` ;
- `refinement`, `version`, `updated` : repères de révision ;
- un `input` à chaque sous-niveau, en plus des entrées globales existantes ;
- une `relation` par niveau et sous-niveau : `nature` et `description` du lien avec ses entrées ;
- une `evaluation` aux positions 4, 5 et 6 des deux étages : `object`, `conditions`, `criterion`, `finding`.

Le champ `comparison` conserve un résumé compatible. Les gabarits affichent les quatre champs quand ils sont présents, ou la comparaison initiale sinon. Les tests vérifient la couverture complète des analyses précisées ; une vérification technique ne remplace pas la relecture du sens des textes.

La suite appliquera ces exigences aux nouvelles fiches et aux révisions ciblées du catalogue, en réexaminant le rôle théorique de chaque 2 et 5 et l'objet des trois comparaisons de chaque boucle.
