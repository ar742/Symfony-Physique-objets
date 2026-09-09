# Préciser les analyses existantes

Cette progression applique les [fondements du projet](FONDEMENTS-DU-PROJET.md) aux fiches déjà rédigées. Elle conserve leurs coordonnées afin de permettre la reprise de chaque élément. Les lots **AP1 et AP2** concernent six fiches :

| Lot | Fiche | Nature du sujet | Périmètre |
| --- | --- | --- | --- |
| AP1 | `oscillateur-harmonique` | Phénomène physique | Masse-ressort libre, sans frottement puis avec résistance linéaire ; exemples calculés |
| AP1 | `continuite-bernoulli` | Phénomène physique | Écoulement stationnaire incompressible ; débit imposé, sections et pression, limites du bilan idéal |
| AP1 | `lagrange-hamilton` | Objet théorique | Correspondance entre les deux formalismes sur un même oscillateur ; attributs mathématiques et conséquences calculées |
| AP2 | `travail-energie-mecanique` | Phénomène physique | Mobile ponctuel sur piste horizontale, traction et frottement constants ; bilans et freinage calculés |
| AP2 | `viscosite-poiseuille` | Phénomène physique | Fluide newtonien en tube circulaire horizontal, régime laminaire établi ; débit, profil et dissipation |
| AP2 | `onde-corde` | Phénomène physique | Corde idéale homogène à extrémités fixes, petites pentes ; propagation et modes propres |

## Ce qui est précisé

Les 216 sous-niveaux de ces deux lots reprennent les attributs reçus, le traitement effectué et la sortie à conserver. Chaque lot en approfondit 108. Les fonctions 2 et 5 réalisent un traitement théorique propre au système local : le retour ne se limite pas à inviter à vérifier ou décider.

Chaque niveau global et sous-niveau possède une relation entrante qualifiée. Les **252 relations** décrivent comment les entrées conduisent à l'élément étudié : dépendance logique, calcul, lecture, interprétation ou autre relation explicitée. Un contrôle de cohérence ne devient pas une mesure ; un changement de cas calculé ne devient pas une chronologie expérimentale.

Les trois comparaisons globales et les dix-huit comparaisons locales de chaque fiche possèdent quatre champs, soit **126 évaluations détaillées** au total :

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
