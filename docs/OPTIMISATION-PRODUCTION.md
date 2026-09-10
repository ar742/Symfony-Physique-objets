# Huit machines : amélioration locale et optimisation sous contraintes

Quatrième exemple du volet [production en réseau](PRODUCTION-MACHINES.md), demandé le 10 septembre 2026. Il applique les [fondements](FONDEMENTS-DU-PROJET.md) et le [cas 1b](FORMES-ANALYSE.md) aux machines : alimentation en entrée, fonction de production au traitement, production en sortie. Les valeurs sont fictives et les résultats calculés ; aucun bilan industriel ou énergétique mesuré n’est supposé.

L’objectif est explicite : **maximiser la production finale r**, pour un réseau, une loi de machine et un budget d’alimentation fixés. La comparaison porte sur une recherche locale depuis un état compatible et une méthode globale par régimes affines et programmation linéaire. Les autres ateliers de production décrivent des itérations temporelles ; celui-ci recherche des configurations statiques compatibles.

## Un réseau orienté sans cycle et un budget commun

Le graphe comporte huit machines et dix liaisons orientées :

```text
M1 → M2, M3
M2 → M4
M3 → M4, M5
M4 → M6
M5 → M6, M7
M6 → M8
M7 → M8
```

M1 reçoit l’unique apport externe u ; M8 fournit la production finale `r = y8`. Les autres entrées sont les sommes des flux reçus. Les machines ont une ou deux entrées internes et une ou deux sorties internes, avec les exceptions explicites de la source M1 et de la sortie finale M8. Une liaison autorisée peut porter un flux nul.

Le budget est une borne : `0 ≤ u ≤ B ≤ 1`. Les deux méthodes utilisent le même B. Elles peuvent laisser une part du budget inutilisée : la contrainte n’impose pas `u = B`. Cette distinction importe puisque la fonction de production peut décroître avec l’alimentation.

Toutes les machines utilisent la même fonction et les mêmes paramètres :

```text
          0                                  si 0 ≤ x ≤ a
f(x) =    c (x − a) / (b − a)                 si a < x ≤ b
          c + (d − c) (x − b) / (1 − b)       si b < x ≤ 1

0 ≤ a < b < 1 ; 0 ≤ d ≤ c ≤ 1.
```

La loi impose `f(a)=0`, `f(b)=c`, `f(1)=d` et `0≤f(x)≤c`. Le seuil reste nul en a ; le dernier segment est un plateau si d=c, et toute la loi est nulle si c=0. **r est une production finale**, distincte des fractions de répartition et d’un rapport de rendement.

Les conversions entre production expédiée et alimentation reçue valent ici κ=1, avec des références normalisées compatibles déclarées. L’égalité des valeurs numériques ne transforme pas l’alimentation et la production en attributs de même nature : chaque machine reste de type 1b. Un seuil interprétable en énergie demanderait une référence supplémentaire ; il ne permettrait pas d’identifier y à une énergie.

## Ce que signifie un état compatible

Notons `p_ij ≥ 0` le flux de production envoyé de Mi vers Mj. Les contraintes communes sont :

```text
x1 = u ; 0 ≤ u ≤ B
xi = Σ_j p_ji                         pour i = 2,…,8
0 ≤ xi ≤ 1 ; yi = f(xi)                pour i = 1,…,8
Σ_j p_ij = yi                         pour i = 1,…,7
r = y8
```

Seules les dix liaisons du graphe sont autorisées. Toute la production des machines intermédiaires est partagée entre leurs destinataires : pas de sortie externe intermédiaire, pas de stockage, pas de rejet de production. Une entrée qui dépasserait 1 rend la configuration **incompatible**. Contrairement aux trois premiers scénarios, cette optimisation n’utilise pas un plafonnement `min(1,x)` qui éliminerait un surplus.

« Tout partagé, sans perte » qualifie l’allocation de chaque production aux sorties du même nœud. Cela ne pose pas `yi=xi` à travers la transformation, ne conserve pas une énergie globale et n’interdit pas une amplification numérique par f. Une somme de productions à différents stades compterait plusieurs fois ce qui circule ; l’objectif reste uniquement la sortie terminale r.

Les flux et états décrivent une configuration statique. L’ordre M1,…,M8 sert à calculer les dépendances du graphe sans cycle ; il ne fournit pas de dates, durées ou stocks. Un état « compatible » satisfait ces relations. Il n’est pas pour autant optimal, stable face à une dynamique future ou validé expérimentalement.

## Quatre commandes pour explorer localement

La configuration peut être commandée par `(u,s1,s3,s5)`, avec `0≤si≤1` :

| Commande | Première sortie | Autre sortie |
| --- | --- | --- |
| s1 | p12 = s1 y1 | p13 = (1−s1) y1 |
| s3 | p34 = s3 y3 | p35 = (1−s3) y3 |
| s5 | p56 = s5 y5 | p57 = (1−s5) y5 |

Les machines à sortie interne unique transmettent toute leur production. Les entrées et productions sont recalculées dans l’ordre du graphe. Une commande dans ses bornes n’assure pas, à elle seule, la compatibilité : une réunion de flux peut encore produire une entrée supérieure à 1.

La recherche locale part d’une configuration compatible. À chaque recherche de voisin, elle modifie une seule des quatre commandes, en plus ou en moins, puis recalcule l’ensemble du réseau. Les commandes proposées sont ramenées à leurs bornes déclarées ; les configurations incompatibles sont rejetées. Seule une amélioration stricte de r, dépassant le seuil d’arrondi numérique du calcul, est acceptée. Lorsqu’aucune amélioration n’est trouvée, les pas sont divisés par deux.

Les pas initiaux du prototype sont 0,02 pour u et 0,1 pour les fractions, avec un pas minimal de 10⁻⁵ et une limite de 80 itérations. Ces choix appartiennent à l’algorithme de recherche, pas aux lois des machines. L’interface peut proposer des variations de 0,1 sans rendre toutes les fractions admissibles multiples de 0,1 : l’ensemble optimisé reste continu.

Un arrêt signifie qu’aucun voisin essayé n’améliore le résultat avec les pas et règles retenus, ou que la limite de calcul a été atteinte. Il ne prouve pas qu’aucune variation combinée des commandes, aucun passage par un plateau et aucun autre départ ne donneraient mieux. En particulier, une méthode refusant les déplacements sans gain peut rester bloquée avant un seuil. Une simple recherche par coordonnées ne justifie pas, en général, l’expression « optimum local démontré ».

## Formulation globale par flux et régimes affines

La méthode globale utilise les flux p_ij comme variables. Si l’on optimisait simultanément les fractions si et les productions yi, les produits `si yi` seraient bilinéaires. Les contraintes de partage en flux sont linéaires ; les fractions peuvent être retrouvées ensuite comme `p_ij/yi` lorsque yi>0. Si yi=0, tous ses flux sortants sont nuls et la fraction n’est pas identifiable : toute répartition admissible représente le même état nul.

Cette paramétrisation décrit le même ensemble de configurations. Une commande compatible fournit des flux satisfaisant les contraintes. Réciproquement, des flux compatibles définissent les fractions des trois bifurcations lorsqu’elles produisent ; en cas de production nulle, une convention suffit. Le graphe sans cycle permet de reconstruire les mêmes entrées et sorties dans l’ordre des dépendances.

Il reste la contrainte `yi=f(xi)`. Pour une machine, son graphe est l’union de trois segments :

| Régime | Intervalle fermé | Relation affine |
| --- | --- | --- |
| 0 · Sous le seuil | 0 ≤ xi ≤ a | yi = 0 |
| 1 · Croissance | a ≤ xi ≤ b | yi = c(xi−a)/(b−a) |
| 2 · Fin de réponse | b ≤ xi ≤ 1 | yi = c+(d−c)(xi−b)/(1−b) |

Les bornes a et b appartiennent à deux régimes, dont les formules y coïncident. Ce recouvrement ne crée ni incohérence ni omission. Si un segment est plat ou nul, plusieurs régimes peuvent encore décrire le même état. **3⁸ = 6 561** compte des combinaisons de régimes, pas des configurations physiques distinctes.

La représentation du graphe d’une fonction affine par morceaux comme union de segments polyédriques est exposée dans [Huchette et Vielma, *Nonconvex piecewise linear functions*, §2, p.4–5](https://arxiv.org/abs/1708.00050). Le présent atelier emploie une énumération directe, adaptée à huit machines, sans prétendre implémenter toutes les formulations mixtes entières étudiées dans cet article.

Pour chaque combinaison, les lois de machine deviennent affines, les intervalles sont fixés et toutes les autres contraintes restent linéaires. Maximiser r revient alors à résoudre un **programme linéaire (PL)**. Les combinaisons incompatibles sont éliminées ; les autres donnent un optimum sur leur propre domaine.

Tout état compatible appartient à au moins une combinaison. Chaque domaine est fermé et borné ; son optimum est atteint lorsqu’il est non vide. Le domaine global contient au moins l’état nul, obtenu avec u=0. Le maximum des optimums de toutes les combinaisons est donc l’optimum du modèle global. Cette justification vient de la couverture complète des régimes ; elle ne résulte pas d’un ordre particulier de visite du graphe.

Un régime dont la résolution reste indéterminée ne peut pas être écarté comme s’il était incompatible. La portée globale doit alors être retirée ou accompagnée d’une borne encore valide qui couvre ce régime. Le nombre de régimes augmente exponentiellement avec le nombre de machines ; cette méthode pédagogique ne promet pas le même coût de calcul sur un grand réseau.

La borne universelle `r≤c` reste disponible, même si certains PL sont ambigus. Une configuration compatible de production r_compatible fournit alors l’encadrement `r_compatible≤r*≤c`. L’écart `c−r_compatible` exprime ce qui reste potentiellement à gagner ; un statut incertain ne permet pas d’affirmer davantage. Une meilleure borne issue des régimes ne remplace c que si elle couvre effectivement tous les régimes concernés.

## Le rôle précis du lagrangien et des certificats duaux

Pour expliquer un régime, écrivons un PL de maximisation sous la forme :

```text
maximiser       qᵀz
sous            Az ≤ h, Ez = g, z ≥ 0.
```

z regroupe les variables de flux et d’état ; q sélectionne la production finale. Des multiplicateurs `λ≥0` pour les inégalités et ν libres pour les égalités définissent le lagrangien :

`L(z,λ,ν)=qᵀz + λᵀ(h−Az) + νᵀ(g−Ez)`.

Pour tout état réalisable, `qᵀz ≤ L(z,λ,ν)`. Si `Aᵀλ+Eᵀν≥q`, le supremum de L sur z≥0 vaut `hᵀλ+gᵀν`. On obtient donc une **borne supérieure** de la production dans ce régime. Un état primal réalisable et des multiplicateurs duaux réalisables ayant la même valeur établissent son optimalité. Avec un écart non nul, leurs valeurs encadrent l’optimum.

La dualité des PL et les conditions d’optimalité sont présentées dans [Boyd et Vandenberghe, *Convex Optimization*, §5.2.4 p.227 et §5.5.3 p.243–244](https://web.stanford.edu/~boyd/cvxbook/bv_cvxbook.pdf). Les conditions KKT suffisent dans le cadre convexe approprié ; elles ne transforment pas, à elles seules, notre union non convexe de régimes en un seul problème convexe.

Aux cassures a et b, f peut ne pas être différentiable. Des conditions KKT écrites comme si cette loi possédait partout une dérivée unique ne suffiraient donc pas. Les PL conservent chaque relation affine avec ses bornes et examinent les régimes adjacents.

Le lagrangien intervient ici dans les contraintes d’optimisation statique. La garantie globale associe **couverture de tous les régimes**, contrôles de compatibilité et bornes duales par régime. Un certificat attaché uniquement au régime de la meilleure solution ne prouve pas que les autres régimes donnent moins.

Les calculs en nombres flottants demandent des tolérances déclarées : violations primales et duales, écart des objectifs, statut des régimes. Un multiplicateur presque réalisable n’est pas automatiquement une borne exacte en arithmétique réelle. Les résultats du solveur constituent une vérification numérique ; une certification exacte demanderait des calculs ou bornes d’erreur adaptés. Toute annonce de maximum doit garder la portée effectivement établie par ces contrôles.

### Forme effectivement calculée

Le moteur `app/public/scripts/optimisation-engine.mjs` élimine les bilans dans chaque régime pour ne garder que `z=(u,p12,p34,p56)`. Toutes les entrées et sorties deviennent des expressions affines de ces quatre variables. Les 23 inégalités comprennent les 16 bornes de régime, trois restes de production non négatifs et les quatre bornes supérieures de z ; sa non-négativité est imposée par le PL. La boîte connue est `0≤z≤U`, avec `U=(B,1,1,1)`.

Après cette élimination, l’objectif comporte une constante : `q0+qᵀz`. Pour des multiplicateurs λ≥0, le calcul utilise la borne suivante, qui reste valable même lorsque le résidu dual n’est pas nul :

`q0 + λᵀh + Σ_k max(0, q_k−(Aᵀλ)_k) U_k`.

Elle vient du supremum du lagrangien sur la boîte : chaque coefficient positif est majoré par sa valeur à U_k, et chaque coefficient négatif par sa valeur à zéro. Le moteur conserve cette correction et ajoute une marge numérique. Avec un objectif nul, une borne strictement négative fournit un contrôle d’incompatibilité du régime, puisqu’un état réalisable aurait nécessairement la valeur zéro.

Les points candidats sont reconstruits en commandes, puis recalculés avec la fonction f d’origine. Le dossier numérique conserve la classification des 6 561 régimes, leurs multiplicateurs, résidus, marges et bornes, ainsi que l’écart final. Le statut global exige que tous les régimes soient résolus, que les bornes ne contredisent pas le meilleur état recalculé et que l’écart respecte la tolérance. Ces contrôles ne deviennent pas une preuve exacte par la seule appellation « certificat ».

## Scénarios et contrôles indépendants

Les huit machines prennent `a=0,1`, `b=0,5`, `c=0,8`, `d=0,4`, avec `B=0,2`. Deux départs compatibles permettent de distinguer les questions :

| Départ | Commandes initiales | Production finale initiale |
| --- | --- | --- |
| Plateau | u=0 ; s1=s3=s5=0,5 | r=0 |
| Actif | u=0,196 ; s1=s3=s5=1 | r=0,072 |

Au départ actif, seul le chemin M1–M2–M4–M6–M8 est alimenté. Ses productions successives valent `0,192 ; 0,184 ; 0,168 ; 0,136 ; 0,072`. Les trois autres productions sont nulles. En portant u à 0,2 avec les mêmes fractions, les cinq machines du chemin donnent toutes 0,2, et la production finale vaut **r=0,2**.

Cette valeur dispose d’une borne indépendante pour ce scénario précis. Sur [0 ; 0,2], la loi vérifie `f(x)≤x`. Partons du flux disponible u et traitons les machines dans l’ordre du graphe : une machine consomme ses flux entrants et les remplace par une production au plus égale, ensuite partagée sans duplication. La somme des flux encore disponibles ne peut augmenter ; toutes les entrées restent dans [0 ; 0,2]. La sortie finale vérifie donc `r≤u≤0,2`. Le réglage précédent atteint cette borne, d’où **r*=0,2** pour ces paramètres.

Il s’agit d’une propriété du modèle normalisé dans cet intervalle, pas d’une conservation énergétique générale. Lorsque le budget ou la loi changent, cette démonstration particulière doit être réexaminée ; la fonction peut amplifier une entrée sur d’autres intervalles.

Depuis le plateau, le premier essai u=0,02 reste sous le seuil et n’améliore pas r. Les modifications des fractions ne produisent rien ; la réduction des pas n’aide pas à franchir le seuil. Cette recherche locale reste à zéro. Depuis le départ actif, l’augmentation de u, projetée sur la borne 0,2, atteint le maximum du scénario. La comparaison montre l’influence du départ et de la règle d’acceptation ; elle ne proclame pas qu’une méthode locale réussit ou échoue toujours.

Un troisième départ conserve la loi mais prend **B=0,4**, `u=0,3` et `s1=s3=s5=0,5`. Ses entrées valent `(0,3 ; 0,2 ; 0,2 ; 0,3 ; 0,1 ; 0,4 ; 0 ; 0,6)` et ses productions `(0,4 ; 0,2 ; 0,2 ; 0,4 ; 0 ; 0,6 ; 0 ; 0,72)`. M5 est au seuil et M8 sur le segment décroissant. Les répartitions sont partagées, mais certains flux restent nuls parce que leur machine source ne produit pas.

Pour ce nouveau budget, la borne `r≤c=0,8` est atteinte avec `u=0,21875` et les trois fractions égales à 1 : le chemin alimenté donne successivement `0,2375 ; 0,275 ; 0,35 ; 0,5 ; 0,8`. Ainsi `r*=0,8` et l’apport optimal présenté reste strictement inférieur au budget. Le résultat local doit être comparé au global avec ce même B=0,4, pas au maximum 0,2 du scénario précédent.

## Comparer sans changer de problème

Les résultats doivent présenter les mêmes paramètres de loi, le même budget, les mêmes liaisons et les mêmes contraintes de partage. Pour chaque méthode, relever l’état de départ si pertinent, le résultat final, u utilisé, les commandes ou flux, la compatibilité, la règle d’arrêt et les calculs réellement effectués.

L’écart `r_global−r_local` est un déficit de production pour cette comparaison. Un écart relatif ne se calcule que si le dénominateur annoncé est strictement positif. Si c=0 ou si le budget ne permet aucune production finale, r*=0 et un pourcentage relatif au maximum serait indéfini. L’égalité des productions finales n’impose pas une configuration unique.

Le compteur d’essais locaux et le compteur de PL globaux ne mesurent pas la même opération. Le temps d’exécution dépend aussi de l’implémentation et de la machine utilisée. Ces données peuvent être affichées avec leur définition ; elles ne constituent pas un classement universel des méthodes.

## Production maximale, entropie et suites du modèle

Le maximum recherché concerne r sous les contraintes déclarées. **Aucune entropie thermodynamique n’est définie** : le modèle ne décrit ni températures, ni échanges thermiques, ni états permettant un tel bilan. La décroissance de f et l’écart entre deux résultats d’optimisation ne mesurent donc pas une production d’entropie.

Une entropie d’information appliquée à des parts de répartition demanderait elle aussi une définition et une question propres. Favoriser une répartition équilibrée ou ajouter une pénalité entropique modifierait l’objectif ; cela ne serait pas une autre démonstration du maximum de r. Un budget, un rendement, une perte et une entropie ne sont pas des termes interchangeables.

Pour prolonger l’étude, préciser des ressources et produits vectoriels, leurs unités, les capacités des machines, des conversions justifiées, les stocks et délais, puis les objectifs et contraintes associés. Une formulation mixte entière peut remplacer l’énumération explicite pour sélectionner les régimes ; une évolution temporelle ou des rétroactions modifieraient encore la question. Les cas analytiques 2, 3 et 4 pourront approfondir les machines et les méthodes, avec leurs comparaisons explicites.

Les sources primaires ci-dessus ont été consultées le 10 septembre 2026. Elles étayent les notions de régimes polyédriques et de dualité, pas les paramètres fictifs de cet exemple. Les validations effectuées et la livraison applicative sont consignées dans [le journal](AVANCEES.md). Les PDF commerciaux et leurs extractions privées restent hors du dépôt ; cet atelier n’ajoute pas de fiche au catalogue des 37 analyses historiques 6×6.
