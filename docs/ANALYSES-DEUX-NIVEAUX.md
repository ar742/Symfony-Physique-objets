# Analyser chaque fiche à deux niveaux

Cette présentation reprend la conception du schéma général de 2018, précisée par l'auteur le 9 septembre 2026. La priorité est la structure analytique de chaque phénomène ou objet théorique ; les développements scientifiques pourront être affinés ensuite à tous les niveaux.

**Référence de sens : [Fondements du projet](FONDEMENTS-DU-PROJET.md).** Le présent document en décrit la mise en œuvre. La fiche permet de répertorier les éléments du sujet et d'y revenir par leurs coordonnées pour préciser continuellement leur analyse. Son périmètre peut être un phénomène physique, un sujet théorique ou un champ de sujets explicitement délimité.

## Six fonctions, répétées aux deux étages

| Position | Fonction | Ce qui est étudié |
| --- | --- | --- |
| 1 | Exp. IN — Expression du système | Système complet, environnement, observations, données initiales ou hypothèses posées |
| 2 | TH — Formalisation d'entrée | Traitement théorique des éléments Exp. de 1, conduisant aux conséquences de 3 |
| 3 | Exp. OUT — Résultats d'entrée | Calculs, applications, manipulations ou expériences de pensée et leurs résultats |
| 4 | Retour · Exp. IN — Relecture | Résultats d'entrée repris comme données de la chaîne de retour |
| 5 | Retour · TH — Formalisation et confrontation | Traitement théorique des éléments Exp. de 4, conduisant aux conséquences de 6, et confrontation à la théorie de 2 |
| 6 | Retour · Exp. OUT — Résultats de retour | Nouvelle application et comparaison aux données et hypothèses initiales |

Le terme « Exp. » ne suppose pas qu'une manipulation ait été effectuée. Il peut désigner l'expression d'un système observé, prédit ou supposé, un résultat de calcul, une expérience de pensée ou une donnée à recueillir. Les fiches distinguent ces statuts ; aucun protocole proposé ne devient une expérience effectivement réalisée par le seul fait de sa rédaction.

Le sujet est le plus souvent un phénomène physique à ancrage expérimental. S'il est théorique dès le départ (théorème, théorie, etc.), les éléments Exp. initiaux et finaux sont ses attributs, propriétés, conditions et conséquences. **Les positions 2 et 5 restent toujours théoriques aux deux étages**, y compris dans les sous-boucles d'un système lui-même théorique. Elles utilisent respectivement Exp. 1 et Exp. 4 pour produire Exp. 3 et Exp. 6. Le libellé « Formalisation et confrontation » de 5 explicite le traitement théorique de retour, au-delà de la comparaison avec 2.

Un niveau global est un système à part entière : le système physique initial, son dossier de données, le modèle théorique, la chaîne de calcul ou le dispositif de confrontation peuvent constituer des objets différents. Sa sous-boucle doit analyser CET objet, et non répéter six chapitres génériques du cours.

## Coordonnées et transmissions

`n.0` décrit l'ensemble du système global n. `n.1` à `n.6` appliquent les six mêmes fonctions à l'intérieur de ce système. Le premier chiffre est le niveau de base ; le second est le niveau de précision. Ces coordonnées ne désignent pas une difficulté scolaire.

- Chaîne locale : n.1 → n.2 → n.3 → n.4 → n.5 → n.6 → n.1.
- La sortie n.3 alimente aussi l'entrée (n+1).1. Après le système 6, elle rejoint 1.1 pour le tour suivant.
- L'entrée 1.1 reçoit les données générales et, lors d'une reprise, le retour de la chaîne globale. Chaque n.1 reçoit aussi le retour local n.6.
- À l'étage global, le parcours suit 1 → 2 → 3 → 4 → 5 → 6 → 1.

Les transmissions sont des liens d'analyse dont la nature doit être précisée selon le sujet : causale, chronologique, logique, dépendance de données ou autre. L'ordre graphique ne prouve ni causalité physique ni succession temporelle. Ces liens ne constituent pas une exécution automatique d'expérience ni une preuve que les objets sont déjà renseignés ou validés.

## Comparer la chaîne de retour à la chaîne d'entrée

Les trois évaluations fondamentales, obligatoires aux deux étages, sont **6 ↔ 1 (Exp.), 5 ↔ 2 (TH) et 4 ↔ 3 (Exp.)**. Chacune doit définir les éléments comparés, les conditions de comparabilité, le critère ou la méthode, puis le constat ou la question ouverte. Les comparaisons historiques de méthodes complètent ces liens sans les remplacer :

| Retour | Évaluation fondamentale | Comparaison complémentaire de méthodes de même fonction |
| --- | --- | --- |
| 4 | 4 ↔ 3 : résultats relus et résultats d'entrée | 4 ↔ 1 : façons d'observer et de décrire |
| 5 | 5 ↔ 2 : cadres et paramètres théoriques | 5 ↔ 2 : façons de formaliser |
| 6 | 6 ↔ 1 : résultats finaux et données initiales | 6 ↔ 3 : façons d'appliquer et d'analyser |

Le niveau 5 peut conserver le modèle, préciser sa validité ou le réviser. Le retour 6 peut fermer une comparaison ou consigner ce qui demeure ouvert. Un test de cohérence algébrique, un recalcul et une mesure indépendante ne sont pas des validations de même nature.

## Parcourir et modifier les fiches

Les 22 fiches disposent chacune de six systèmes globaux et de 36 sous-niveaux rédigés, soit **132 systèmes et 792 sous-niveaux**. Les anciens parcours transversaux et thématiques restent accessibles ; ils ne remplacent pas cette analyse individuelle.

L'ouverture d'une fiche présente son schéma global. Un clic sur le niveau n ouvre `/fiches/{slug}/analyse/{n}`, puis un clic sur le sous-niveau rejoint sa description `#point-n.p`. Chaque page comporte les entrées, l'action, la sortie à conserver, les comparaisons de retour et les liens vers les passages scientifiques. La vue d'ensemble de la fiche donne aussi accès aux 36 coordonnées.

Les données sont explicitement rédigées dans `app/config/content/analyses-fiches.json`. Elles sont modifiables fiche par fiche, niveau par niveau : pas de génération à la volée à partir d'une trame de verbes. Les libellés fonctionnels et coordonnées sont appliqués par `CardAnalysisLibrary`. Les premiers textes sont une proposition analytique, à préciser avec l'auteur.

Le couple identifiant de fiche + coordonnée n.p situe l'élément à répertorier, relire et réviser. Préserver ces repères lors des enrichissements et documenter les déplacements en cas de restructuration. Le nombre de points renseignés et la validité technique des liens ne suffisent pas à établir la précision scientifique de leurs significations et évaluations.

Pour ajouter une fiche, rédiger son analyse complète avec six niveaux et six sous-niveaux par niveau. Chaque niveau doit nommer son propre système, ses entrées, sa sortie, un passage associé et ses comparaisons. Les tests refusent une fiche sans analyse et vérifient la couverture, les coordonnées et les destinations des liens.

Les [lots d'approfondissement analytique AP1 à AP6](PRECISIONS-ANALYTIQUES.md) précisent dix-sept fiches : oscillateur, Bernoulli, Lagrange–Hamilton, travail-énergie, Poiseuille, corde, rotation axiale, roulement, référentiel tournant, Newton, orbite centrale, hydrostatique, élasticité, acoustique, système thermodynamique, gaz parfait et premier principe. Ils distinguent la nature et le périmètre du sujet, les entrées de chaque sous-niveau, les relations avec ces entrées et les quatre champs de chaque évaluation. Les cinq autres fiches conservent leur première rédaction pendant cette progression.

## Source de conception et confidentialité

Le schéma fourni par l'auteur est déjà représenté dans les archives de présentation par `app/public/legacy/images/schemaphysmvcglobal.png`. Le texte historique sur les niveaux est conservé dans `app/templates/site/legacy/niveaux.html.twig`. Les schémas interactifs utilisent le composant du site, avec ses deux sens de parcours et des liens de comparaison visibles.

Cette étape publie les descriptions analytiques et leur navigation. Elle ne publie aucun PDF complet, rendu de page, extraction privée, export SQL ou secret. L'extension scientifique E1 est différée au profit de cette priorité de présentation.
