# E1d : courant de déplacement, inductance et circuit RL

Ce quatrième volet de l’électromagnétisme ajoute trois fiches originales avec leur analyse complète à deux étages. Il prolonge [les modèles d’induction E1c](INDUCTION-E1C.md). Chaque fiche reste ouverte à la relecture scientifique de l’auteur.

| Fiche | Système supposé | Retour étudié |
| --- | --- | --- |
| `condensateur-maxwell` | Condensateur plan idéal chargé par un courant imposé | Comparer deux surfaces de même bord, dériver la continuité et reconstruire la charge avec une donnée initiale |
| `auto-induction-energie` | Bobine linéaire sans pertes, inductance estimée par le modèle long | Comparer flux et énergie, retrouver les informations accessibles et calculer une restitution séparée |
| `circuit-rl-transitoire` | Circuit série alimenté depuis un courant nul | Répartir les énergies, inverser le transitoire sous conditions et comparer une décharge initialisée séparément |

## Déplacement de Maxwell et conservation de charge

Le condensateur possède des armatures de rayon a = 0,050 m, séparées de d = 0,001 m. L’axe +z va de l’armature positive vers l’autre. Le contour circulaire médian de rayon r = 0,080 m est orienté selon +eθ. Alimentation axiale, symétrie, champ uniforme sur l’aire S = πa² et effets de bord négligés sont des hypothèses du modèle, pas une solution exacte de toute la géométrie réelle.

La référence impose I = +1,00 mA et Q0 = 1,00 nC pendant 2,00 µs. Le flux sur le disque d’entrefer vaut Q/ε0 ; sa dérivée multipliée par ε0 donne Id = I, alors qu’aucun courant matériel ne traverse le vide. Une surface bombée coupant le fil d’alimentation possède le même bord orienté. Dans l’approximation, sa contribution provient de la conduction. Le total conduction plus déplacement est invariant : on n’additionne pas les contributions de deux surfaces différentes pour obtenir 2I. Cette égalité et ses conditions sont également expliquées par Gauss et le bilan de charge. [OpenStax, §16.1](https://openstax.org/books/university-physics-volume-2/pages/16-1-maxwells-equations-and-electromagnetic-waves).

Avec ε0 ≈ 8,8541878 × 10⁻¹² F/m et μ0 ≈ 4π × 10⁻⁷ T·m/A, Γ ≈ +1,256637061 × 10⁻⁹ T·m et Bθ ≈ +2,50 nT. E passe d’environ 14 380,083 à 43 140,249 V/m. Ces constantes sont approchées ; les décimales servent à vérifier les calculs et ne décrivent pas une précision de mesure. [NIST CODATA 2022](https://physics.nist.gov/cuu/pdf/all.pdf).

La variante indépendante impose −1,00 mA pendant 0,500 µs depuis le même Q0. Q demeure positive, avec Qf = 0,500 nC et Ef ≈ +7 190,041 V/m ; Bθ devient négatif. B renseigne ici la dérivée de Q, pas sa constante initiale. Celle-ci exige un attribut électrique supplémentaire, à géométrie et instant connus.

La divergence de Maxwell–Ampère complet, combinée à Gauss, donne ∂ρ/∂t + div j = 0. Le terme de déplacement est conservé dans l’entrefer malgré l’approximation quasi stationnaire. L’ARQS magnétique présentée plus bas dans le recueil théorique p. 265, avec suppression de ce terme, ne décrit pas ce bilan du condensateur. [MIT 6.013, p. 25, équations 2.1.18–2.1.21](https://ocw.mit.edu/courses/6-013-electromagnetics-and-applications-spring-2009/d3be4ea78b036a6362230fb41780cf54_MIT6_013S09_notes.pdf).

## Stockage et restitution dans une bobine

La bobine comporte N = 1000 spires, de rayon a = 0,020 m, sur une longueur ℓ = 0,200 m. L’approximation longue donne L ≈ μ0N²S/ℓ ≈ 7,895684 mH. La relation linéaire λ = Li concerne le flux propre lié. Cette estimation ne constitue pas le calcul exact de l’inductance finie ; l’erreur du champ central étudiée en E1c ne fournit pas une erreur sur L ou sur l’énergie. [OpenStax, §14.2](https://openstax.org/books/university-physics-volume-2/pages/14-2-self-inductance-and-inductors).

La rampe i = βt, avec β = 50,0 A/s pendant T = 0,0100 s, atteint I₀ = 0,500 A. La tension réceptrice vaut environ +0,394784 V et la force électromotrice propre a le signe opposé. Le flux lié final vaut environ 0,003947842 Wb et l’énergie stockée 0,986960 mJ. La puissance varie pendant la rampe : son intégrale donne l’énergie reçue, et non sa valeur finale multipliée par la durée.

Dans la variante descendante séparée, i_d = I₀−βt_d demeure non négatif et la tension devient négative. Le travail reçu par la bobine vaut environ −0,986960 mJ ; l’énergie libérée vers l’extérieur est positive. Le dispositif extérieur est supposé capable de recevoir cette énergie. La bobine idéale n’a aucune dissipation Joule ; les transitions de commande et le rendement global du dispositif ne sont pas calculés.

L’intégrale de B²/(2μ0) concerne tout le champ réel, y compris à l’extérieur de la bobine. La remplacer par la densité uniforme intérieure multipliée par Sℓ appartient au seul modèle long. L’accord avec Li²/2 est une cohérence interne de cette approximation. Le flux signé permet de retrouver i à L connu ; l’énergie seule conserve seulement son module. [OpenStax, §14.3](https://openstax.org/books/university-physics-volume-2/pages/14-3-energy-in-a-magnetic-field).

## Établissement et décharge du circuit RL

R = 20,0 Ω, L = 0,200 H et U = +10,0 V donnent τ = 10,0 ms et I∞ = 0,500 A. Depuis i(0) = 0, la réponse est i = I∞[1−exp(−t/τ)]. À t = τ, i ≈ 0,316060 A, u_R ≈ 6,321206 V et u_L ≈ 3,678794 V. Le régime reste transitoire. Le modèle suppose des paramètres localisés et une bobine sans pertes ; les seules pertes retenues sont celles de R. [OpenStax, §14.4](https://openstax.org/books/university-physics-volume-2/pages/14-4-rl-circuits).

À cet instant, E_g ≈ 0,018393972 J se partage en E_J ≈ 0,008404562 J et W_m ≈ 0,009989410 J. Si la source demeure branchée, son énergie fournie et l’énergie dissipée continuent de croître sans limite, tandis que le stockage tend vers 0,0250 J.

La décharge est un autre problème initial, depuis i_d(0) = I∞ supposé en régime permanent préalable. Son temps t_d est distinct ; elle ne commence pas au temps τ de l’établissement précédent. La commutation retire la source tout en gardant un chemin RL fermé. À t_d = τ, i_d ≈ 0,183940 A, W_m,d ≈ 0,003383382 J et E_J,d ≈ 0,021616618 J. Leur somme vaut W_0 = 0,0250 J. Le stockage décroît avec l’échelle τ/2, car il dépend du carré du courant.

Le retour retrouve τ par le logarithme d’un rapport de courant, si l’instant et I∞ sont connus ; R connu fournit L. Un seul point ne permet plus cette identification lorsque I∞ est également inconnu. Les inversions utilisent ici les résultats du même calcul et ne constituent pas une validation expérimentale.

## Structure analytique, sources et clarifications

Le lot ajoute **108 sous-niveaux, 126 relations et 63 évaluations**. Les fonctions théoriques 2 et 5 traitent les entrées 1 et 4 pour produire 3 et 6. Les comparaisons 4/3, 5/2 et 6/1 indiquent objet, conditions, critère et constat aux deux étages. Les raccords entre systèmes et les retours locaux sont explicites. Variantes et contre-exemples gardent leurs données propres.

La quatrième boucle d’orientation du domaine, `#boucle-maxwell-rl`, relie ces situations distinctes. Elle ne suppose pas que le condensateur de la première fiche alimente les bobines des deux autres. Les analyses 6 × 6 réutilisent les schémas, coordonnées, info-bulles, accès au clavier et thèmes clair/sombre. La fiche RL reste rattachée à l’électromagnétisme et prépare le futur domaine des circuits E2 ; elle n’en couvre pas tout le chantier.

Les passages des recueils ont été inspectés visuellement : CPGE P14 p. 379–380 et P15 p. 391 ; théorie PC2 p. 264–265 et 269. Les passages théoriques fournissent des lois de départ et des bilans ; ils ne sont pas présentés comme les solutions de ces nouveaux exemples.

- **C21** : CPGE p. 379 place div A = 0 sous « Conservation de la charge ». Il s’agit du choix de jauge de Coulomb, distinct de ∂ρ/∂t + div j = 0. Le recueil théorique p. 264 distingue déjà les deux notions. [University of Texas, jauge de Coulomb](https://farside.ph.utexas.edu/teaching/em/lectures/node38.html).
- **C22** : la chaîne d’énergie de bobine, CPGE p. 379, contient un produit courant-tension ayant la dimension d’une puissance et la forme i²/(2L), qui n’est pas une énergie. La fiche utilise W_m = Li²/2 = λ²/(2L), avec dW_m/dt = u_L i. Li²/2 est correctement rappelé p. 380. [OpenStax, énergie magnétique §14.3](https://openstax.org/books/university-physics-volume-2/pages/14-3-energy-in-a-magnetic-field).

Le catalogue atteint **34 fiches, 204 systèmes, 1 224 sous-niveaux, 1 428 relations, 714 évaluations, 79 MathML et 22 corrections ou clarifications**. Quatre domaines sont disponibles et huit restent planifiés. Les 31 fiches précédentes et leurs analyses sont conservées.

Voir [les vérifications effectives dans le journal](AVANCEES.md). Les ondes électromagnétiques, les milieux et les couplages pourront prolonger E1. Les synthèses sont originales : ouvrages commercialisés, rendus, extractions, SQL et secrets restent privés.
