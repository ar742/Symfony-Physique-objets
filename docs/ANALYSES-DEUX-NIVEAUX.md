# Analyser chaque fiche à deux niveaux

Cette présentation reprend la conception du schéma général de 2018, précisée par l'auteur le 9 septembre 2026. La priorité est la structure analytique de chaque phénomène ou objet théorique ; les développements scientifiques pourront être affinés ensuite à tous les niveaux.

## Six fonctions, répétées aux deux étages

| Position | Fonction | Ce qui est étudié |
| --- | --- | --- |
| 1 | Exp. IN — Expression du système | Système complet, environnement, observations, données initiales ou hypothèses posées |
| 2 | TH — Formalisation d'entrée | Concepts, modèle, conventions, lois et hypothèses d'entrée |
| 3 | Exp. OUT — Résultats d'entrée | Calculs, applications, manipulations ou expériences de pensée et leurs résultats |
| 4 | Retour · Exp. IN — Relecture | Résultats d'entrée repris comme données de la chaîne de retour |
| 5 | Retour · TH — Confrontation théorique | Cadre de retour confronté au cadre théorique de l'entrée |
| 6 | Retour · Exp. OUT — Résultats de retour | Nouvelle application et comparaison aux données et hypothèses initiales |

Le terme « Exp. » ne suppose pas qu'une manipulation ait été effectuée. Il peut désigner l'expression d'un système observé, prédit ou supposé, un résultat de calcul, une expérience de pensée ou une donnée à recueillir. Les fiches distinguent ces statuts ; aucun protocole proposé ne devient une expérience effectivement réalisée par le seul fait de sa rédaction.

Un niveau global est un système à part entière : le système physique initial, son dossier de données, le modèle théorique, la chaîne de calcul ou le dispositif de confrontation peuvent constituer des objets différents. Sa sous-boucle doit analyser CET objet, et non répéter six chapitres génériques du cours.

## Coordonnées et transmissions

`n.0` décrit l'ensemble du système global n. `n.1` à `n.6` appliquent les six mêmes fonctions à l'intérieur de ce système. Le premier chiffre est le niveau de base ; le second est le niveau de précision. Ces coordonnées ne désignent pas une difficulté scolaire.

- Chaîne locale : n.1 → n.2 → n.3 → n.4 → n.5 → n.6 → n.1.
- La sortie n.3 alimente aussi l'entrée (n+1).1. Après le système 6, elle rejoint 1.1 pour le tour suivant.
- L'entrée 1.1 reçoit les données générales et, lors d'une reprise, le retour de la chaîne globale. Chaque n.1 reçoit aussi le retour local n.6.
- À l'étage global, le parcours suit 1 → 2 → 3 → 4 → 5 → 6 → 1.

Les transmissions sont des liens d'analyse : elles ne constituent pas une exécution automatique d'expérience ni une preuve que les objets sont déjà renseignés ou validés.

## Comparer la chaîne de retour à la chaîne d'entrée

Deux types de comparaison, présents aux deux étages, reprennent la distinction historique entre méthodes et valeurs :

| Retour | Comparaison de valeurs/résultats | Comparaison de méthodes de même fonction |
| --- | --- | --- |
| 4 | 4 ↔ 3 : résultats relus et résultats d'entrée | 4 ↔ 1 : façons d'observer et de décrire |
| 5 | 5 ↔ 2 : cadres et paramètres théoriques | 5 ↔ 2 : façons de formaliser |
| 6 | 6 ↔ 1 : résultats finaux et données initiales | 6 ↔ 3 : façons d'appliquer et d'analyser |

Le niveau 5 peut conserver le modèle, préciser sa validité ou le réviser. Le retour 6 peut fermer une comparaison ou consigner ce qui demeure ouvert. Un test de cohérence algébrique, un recalcul et une mesure indépendante ne sont pas des validations de même nature.

## Parcourir et modifier les fiches

Les 22 fiches disposent chacune de six systèmes globaux et de 36 sous-niveaux rédigés, soit **132 systèmes et 792 sous-niveaux**. Les anciens parcours transversaux et thématiques restent accessibles ; ils ne remplacent pas cette analyse individuelle.

L'ouverture d'une fiche présente son schéma global. Un clic sur le niveau n ouvre `/fiches/{slug}/analyse/{n}`, puis un clic sur le sous-niveau rejoint sa description `#point-n.p`. Chaque page comporte les entrées, l'action, la sortie à conserver, les comparaisons de retour et les liens vers les passages scientifiques. La vue d'ensemble de la fiche donne aussi accès aux 36 coordonnées.

Les données sont explicitement rédigées dans `app/config/content/analyses-fiches.json`. Elles sont modifiables fiche par fiche, niveau par niveau : pas de génération à la volée à partir d'une trame de verbes. Les libellés fonctionnels et coordonnées sont appliqués par `CardAnalysisLibrary`. Les premiers textes sont une proposition analytique, à préciser avec l'auteur.

Pour ajouter une fiche, rédiger son analyse complète avec six niveaux et six sous-niveaux par niveau. Chaque niveau doit nommer son propre système, ses entrées, sa sortie, un passage associé et ses comparaisons. Les tests refusent une fiche sans analyse et vérifient la couverture, les coordonnées et les destinations des liens.

## Source de conception et confidentialité

Le schéma fourni par l'auteur est déjà représenté dans les archives de présentation par `app/public/legacy/images/schemaphysmvcglobal.png`. Le texte historique sur les niveaux est conservé dans `app/templates/site/legacy/niveaux.html.twig`. Les schémas interactifs utilisent le composant du site, avec ses deux sens de parcours et des liens de comparaison visibles.

Cette étape publie les descriptions analytiques et leur navigation. Elle ne publie aucun PDF complet, rendu de page, extraction privée, export SQL ou secret. L'extension scientifique E1 est différée au profit de cette priorité de présentation.
