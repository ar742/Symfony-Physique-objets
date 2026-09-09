# E1b : force magnétique, fil et spire

Ce deuxième volet du domaine Électromagnétisme ajoute trois fiches originales, chacune avec six systèmes et 36 sous-niveaux détaillés dès sa création. Il prolonge [E1a, consacré à l’électrostatique](ELECTROSTATIQUE-E1A.md). La rédaction et sa précision scientifique restent à affiner avec l’auteur.

| Fiche | Système supposé | Retour étudié |
| --- | --- | --- |
| `force-lorentz-trajectoire` | Proton non relativiste dans un champ magnétique uniforme prescrit, sans champ électrique | Reconstruire les paramètres accessibles, puis comparer cercle et hélice à conditions initiales distinctes |
| `champ-fil-ampere` | Cylindre droit infini à densité uniforme de courant permanent, dans un milieu de perméabilité μ0 | Reconstruire courant et densité, et distinguer champ local, circulation et courant enlacé |
| `champ-axe-spire` | Spire circulaire filiforme, courant permanent, champ sur son axe dans le vide | Inverser conditionnellement les paramètres, comparer les deux demi-axes et délimiter l’approximation dipolaire |

## Des modèles délimités

Le champ uniforme de la première fiche est prescrit. Les deux autres fiches calculent des champs de sources particulières : elles ne prétendent pas fournir ce même champ uniforme dans tout l’espace. La boucle du domaine oriente entre ces sujets ; chaque fiche conserve sa propre analyse complète à deux étages.

Pour Lorentz, les valeurs du proton sont arrondies : q ≈ +1,60 × 10⁻¹⁹ C et m ≈ 1,67 × 10⁻²⁷ kg. Avec B = 0,100 e_z T et v₀ = 10⁵ e_x m/s, la force initiale est dirigée selon −e_y. Le rayon vaut 0,0104375 m et la période environ 6,558075 × 10⁻⁷ s. La variante ajoute une vitesse initiale parallèle de 10⁵ m/s : elle possède un pas signé positif et une énergie initiale différente. Dans chaque scénario, la force magnétique conserve l’énergie cinétique ; la comparaison ne décrit pas un gain d’énergie provoqué par le champ.

Pour Ampère, le cylindre de rayon a = 0,010 m porte I = +4,0 A. À r = 0,005 m et r = 0,020 m, les champs ont tous deux une norme de 40 µT ; les courants enlacés valent pourtant 1 A et 4 A. La longueur du contour intervient dans la circulation. La symétrie complète et le choix du champ de cette source seule permettent d’obtenir le profil azimutal ; la circulation ne suffit pas à déterminer toutes les composantes d’un champ quelconque. Le courant est prescrit, sans modèle de son alimentation ni hypothèse de champ électrique nul dans le conducteur.

Pour la spire de rayon R = 0,10 m et de courant I = +2,0 A, le champ central vaut environ 12,566371 µT et celui à z = R environ 4,442883 µT. Le courant est orienté dans le sens antihoraire vu depuis +z. Sur les deux demi-axes, le champ est dirigé selon +z : la substitution z → −z ne renverse pas son sens. L’approximation dipolaire utilise |z|³ et suppose |z| grand devant R ; elle ne s’applique pas au centre.

Les calculs du fil et de la spire utilisent μ0 ≈ 4π × 10⁻⁷ T·m/A. Cette valeur numérique est approchée : la perméabilité du vide n’est pas une constante exacte du SI actuel. Le [tableau CODATA 2022 du NIST, p. 1](https://physics.nist.gov/cuu/pdf/all.pdf) indique sa valeur et son incertitude. Les décimales des exemples proviennent des données de calcul ; elles ne représentent pas une précision de mesure.

## Deux étages de comparaison

Le volet ajoute **108 sous-niveaux, 126 relations et 63 évaluations**. Chaque boucle conserve les trois confrontations 4/3, 5/2 et 6/1, avec objet, conditions, critère et constat. Les positions 2 et 5 réalisent les traitements théoriques des éléments reçus. Les variantes sont séparées de la référence et les inversions restent conditionnelles aux hypothèses annoncées.

Une seconde boucle de domaine, `#boucle-magnetostatique`, donne accès aux trois nouvelles fiches. Le parcours E1a conserve ses liens. Les schémas propres aux fiches réutilisent les six sous-boucles, les coordonnées `n.p`, les info-bulles, les accès au clavier et les thèmes clair/sombre.

## Repères des recueils et correction C19

Les pages utilisées ont été examinées visuellement : CPGE P14 p. 379 pour Lorentz, Biot–Savart et Ampère, puis p. 383 pour la spire ; théorie PC2 p. 266 pour le terme magnétique de l’équation mécanique et la pulsation cyclotron, puis p. 269 pour Biot–Savart, Ampère et le dipôle. Le passage p. 266 traite un conducteur : la fiche Lorentz en retient les relations indiquées, sans importer collisions ni champ électrique dans son scénario de proton libre.

La correction **C19**, portée par la fiche Ampère, précise le terme de déplacement de Maxwell–Ampère. La page CPGE 379 affiche une dérivée seconde temporelle du champ électrique ; il faut une dérivée première. Pour une surface fixe, le courant de déplacement équivalent vaut ε0 dΦE/dt ; il s’ajoute au courant de conduction enlacé. Il s’annule dans le régime permanent retenu ici. Cette correction ciblée ne constitue pas une validation de l’ensemble des formules de la page et ne modifie aucun PDF.

Les relations utilisées sont confrontées à des sources universitaires : [OpenStax, mouvement dans un champ magnétique, §11.3](https://openstax.org/books/university-physics-volume-2/pages/11-3-motion-of-a-charged-particle-in-a-magnetic-field), [Ampère, §12.5, exemple 12.7](https://openstax.org/books/university-physics-volume-2/pages/12-5-amperes-law), [spire, §12.4](https://openstax.org/books/university-physics-volume-2/pages/12-4-magnetic-field-of-a-current-loop) et [Maxwell, §16.1](https://openstax.org/books/university-physics-volume-2/pages/16-1-maxwells-equations-and-electromagnetic-waves). Les bibliographies des fiches donnent les références détaillées. Leurs textes et figures ne sont pas reproduits.

E1 reste en cours : solénoïdes, induction, compléments de Maxwell et milieux pourront prolonger ces premiers modèles. Les ouvrages commercialisés, leurs rendus et extractions, les exports SQL et les secrets restent privés. Voir [le journal des livraisons et leurs vérifications](AVANCEES.md).
