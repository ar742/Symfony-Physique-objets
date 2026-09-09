# E1a : charges, champ, potentiel et flux

Premier volet du domaine Électromagnétisme, livré le 9 septembre 2026. Les trois fiches sont des synthèses originales accompagnées dès leur création d'une analyse à deux étages : six systèmes globaux et six sous-niveaux par système. La relecture scientifique avec l'auteur reste ouverte.

| Fiche | Système physique supposé | Retour étudié |
| --- | --- | --- |
| `champ-coulomb` | Charge source ponctuelle immobile dans le vide, champ radial et force sur une charge test | Retrouver conditionnellement la charge source, puis comparer deux distances |
| `potentiel-energie-electrique` | Même type de source, potentiel référencé et énergie d'interaction d'une charge test | Confronter travail et différence de potentiel, puis inverser le trajet |
| `gauss-sphere-chargee` | Sphère non conductrice à charge volumique uniforme et fixe | Reconstruire charge ou densité sous les hypothèses de symétrie, puis comparer intérieur et extérieur |

## Des objets et des hypothèses distincts

Le champ dépend de la source ; la force dépend aussi de la charge qui le subit. Le potentiel électrique est une grandeur en volts, tandis que l'énergie d'interaction est en joules. Le flux est une intégrale sur une surface orientée ; sa valeur ne fixe pas à elle seule le champ en chaque point. Les fiches gardent ces distinctions dans leurs calculs et leurs retours.

Les exemples utilisent une charge source Q = +2,0 nC et la valeur approchée k = 8,99 × 10⁹ N·m²·C⁻². Les résultats numériques sont calculés à partir de ces données supposées. Les décimales affichées ne constituent pas une précision de mesure ; aucun protocole n'est présenté comme réalisé.

- **Coulomb** : à 0,30 m, le champ est sortant. Une charge test négative reçoit une force entrante. À 0,60 m, le modèle prévoit un champ et une force quatre fois plus faibles. La reconstruction d'une loi spatiale reste conditionnelle aux hypothèses utilisées.
- **Potentiel** : entre 0,20 m et 0,40 m, V passe de 89,90 V à 44,95 V. Pour q = +1,0 nC, ΔEp = −4,495 × 10⁻⁸ J et le travail électrique vaut son opposé. Le trajet inverse échange les bornes ; changer la référence du potentiel conserve les différences.
- **Gauss** : pour une sphère de rayon 0,10 m, le champ vaut 899 N/C à 0,05 m et 449,5 N/C à 0,20 m. L'intérieur suit un profil linéaire, l'extérieur un inverse carré. La répartition volumique supposée ne doit pas être remplacée par celle d'un conducteur à l'équilibre.

## Analyses et accès

Le volet ajoute **108 sous-niveaux, 126 relations qualifiées et 63 évaluations détaillées**. Les positions 2 et 5 réalisent des traitements théoriques. Chaque boucle explicite les comparaisons 4/3, 5/2 et 6/1 : objet comparé, conditions, critère et constat ou question ouverte. Les calculs inverses restent des contrôles internes tant qu'aucune donnée indépendante n'est fournie.

La page `/domaines/electromagnetisme` comporte une boucle d'orientation à six entrées. Chaque fiche ouvre ensuite son propre schéma global, ses six sous-boucles et les descriptions repérées par `n.p`. Les composants existants assurent les liens, info-bulles, accès au clavier, boutons tactiles et thèmes clair/sombre.

## Sources et précision C18

Les repères des recueils ont été examinés visuellement : CPGE P13 p. 372 et théorie PC2 p. 268 pour les relations électrostatiques ; CPGE P11 p. 355 pour Maxwell–Gauss. La sphère uniforme constitue un exemple développé dans la synthèse web, vérifié avec une source externe.

La précision **C18**, rattachée à la fiche potentiel, distingue l'énergie qV dans un potentiel extérieur fixé de l'énergie totale d'assemblage d'un ensemble de charges. Dans la seconde écriture, le facteur ½ évite de compter deux fois chaque paire dans la somme des contributions ; le potentiel propre de chaque charge est exclu. La formule d'interaction d'une charge test ne reçoit pas ce facteur. Les deux passages des recueils sont référencés sans modifier leurs PDF.

Les relations ont été confrontées aux sources universitaires primaires : [OpenStax, champ électrique, §5.4](https://openstax.org/books/university-physics-volume-2/pages/5-4-electric-field), [énergie électrique, §7.1](https://openstax.org/books/university-physics-volume-2/pages/7-1-electric-potential-energy), [potentiel et différence de potentiel, §7.2](https://openstax.org/books/university-physics-volume-2/pages/7-2-electric-potential-and-potential-difference) et [application de Gauss, §6.3](https://openstax.org/books/university-physics-volume-2/pages/6-3-applying-gausss-law). Les références détaillées figurent aussi dans chaque fiche. Les illustrations et le texte de ces sources ne sont pas reproduits.

Les ouvrages commercialisés, leurs pages rendues et leurs extractions restent privés. E1a couvre ce premier parcours d'électrostatique ; magnétostatique, induction, autres équations de Maxwell et milieux restent à développer.
