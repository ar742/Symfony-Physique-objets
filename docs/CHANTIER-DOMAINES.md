# Étendre les parcours de physique

Chantier ouvert le 9 septembre 2026 à la demande de l'auteur. La thermodynamique et la physique statistique conservent leur parcours existant. Le présent chantier porte sur les autres domaines, avec les mathématiques comme prérequis et la chimie seulement lorsqu'un lien physique l'exige.

## Ordre des lots

**Priorité depuis le 9 septembre 2026 : la structure analytique de chaque fiche.** Les 22 fiches existantes disposent de six systèmes globaux, chacun décliné selon la même boucle de six sous-niveaux (792 points). La première rédaction et les schémas constituent une base de relecture avec l'auteur, avant l'approfondissement scientifique. E1 reste planifié après cette étape. Voir [la méthode et les règles d'extension](ANALYSES-DEUX-NIVEAUX.md).

Les [lots AP1 et AP2 de perfectionnement](PRECISIONS-ANALYTIQUES.md) précisent six analyses : oscillateur, Bernoulli, Lagrange–Hamilton, travail-énergie, Poiseuille et corde. Entrées, fonctions théoriques, relations et évaluations sont définies aux deux étages. Seize fiches conservent leur première rédaction analytique ; leur reprise et les nouvelles fiches suivront les mêmes exigences de sens.

Les pages ci-dessous sont les repères des éditions locales déjà indexées. Une fiche du recueil n'est pas considérée comme transposée intégralement dès qu'une première fiche web l'utilise.

| Lot | Domaine et contenu à construire | Recueil CPGE | Recueil théorique | Première interaction envisagée |
| --- | --- | --- | --- | --- |
| M1 | Mécanique du point : Newton, travail-énergie, oscillateur, force centrale | P1 p. 265–274 ; P2 p. 275–282 | PC1 p. 237–247 | Boucle à six entrées reliant les hypothèses aux calculs |
| M2 | Solides, rotations, référentiels ; prolongement lagrangien et hamiltonien | P1–P3 p. 265–290 | PC1 et outils mathématiques, passages à vérifier | Bilan des moments et liens vers les conservations |
| F1 | Fluides, élasticité, ondes mécaniques et acoustique | P4 p. 291–299 : ondes et élasticité ; P6 p. 306–311 : statique des fluides ; P7 p. 312–321 : dynamique ; P8 p. 322–324 : acoustique | PC1 p. 248–261 | Deux boucles : pression et écoulements ; déformation et propagation |
| E1 | Champs, électrostatique, magnétostatique, induction, Maxwell et milieux | P11–P14 p. 351–385 | PC2 p. 262–286 | Charges, champs et flux reliés aux lois |
| E2 | Circuits, signaux, filtres, composants et technologies | P15–P19 p. 386–433 | PC2 pour les fondements ; compléter avec des sources spécialisées | Circuit RLC et réponse fréquentielle |
| O1 | Optique géométrique et ondulatoire | P9–P10 p. 325–350 | PC2, passages à vérifier | Rayons, conjugaison, interférences et diffraction |
| Q1 | Mécanique quantique, atomes et matière condensée | P21 p. 443–449 ; P25 p. 471–479 ; P26 p. 480–490 | PC4 p. 304–340 | États, observables, mesure et évolution |
| R1 | Relativité restreinte et générale | P5 p. 300–305 | CU3–CU5 p. 505–535 ; TQC1 pour les prérequis | Événements, changement de repère et invariants |
| P1 | Noyaux, particules, champs quantiques et modèle standard | P26 p. 480–490 | TQC1–TQC8 p. 341–485 | Des symétries aux interactions et observables |
| C1 | Astrophysique et cosmologie | Liens depuis mécanique et relativité | CU1–CU2 p. 486–504 ; CU6–CU9 p. 536–589 | Observations, modèles cosmologiques et limites |
| A1 | Gravités quantiques, SUSY, cordes, alternatives et géométrie non commutative | Préparation mathématique et physique | GQ1–GQ4 p. 590–652 ; SCSG1–SCSG3 p. 653–718 ; RMM1–RMM2 p. 719–767 ; GNC1–GNC2 p. 768–798 | Carte des programmes de recherche et de leurs hypothèses |
| T1 | Mesure, incertitudes, diffusion et transferts comme liens transversaux | P19, P23 p. 460–465, P24 p. 466–470 | Passages selon le domaine | Confronter calcul et mesure sans refaire le parcours thermique |

Les sujets de recherche du lot A1 seront distingués des résultats expérimentalement établis. Les contraintes observationnelles et valeurs numériques contemporaines seront datées et vérifiées au moment de la rédaction.

## Méthode de chaque livraison

Lire d'abord [les fondements du projet](FONDEMENTS-DU-PROJET.md) : la nature du sujet ne change pas les fonctions théoriques de 2 et 5 ; les évaluations 6/1, 5/2 et 4/3 sont à définir aux deux étages. Chaque livraison enrichit une analyse qui reste perfectible et repérable par ses coordonnées.

1. Choisir un ensemble limité de notions et relever les passages exacts des deux recueils. Examiner visuellement les formules, unités et conventions.
2. Rédiger une synthèse web originale : objectif, prérequis, système, hypothèses, lois, limites, exemple recalculé, question corrigée, références précises.
3. Définir les six systèmes globaux de chaque fiche et les six sous-niveaux de chacun selon la même chaîne analytique. Rédiger les 36 actions, sorties et comparaisons spécifiques au sujet. Relier le schéma global aux six schémas locaux, puis aux descriptions et passages scientifiques : clic, survol, clavier et bouton tactile. N'ajouter une simulation que si elle apporte un apprentissage identifiable.
4. Contrôler les formules avec des sources primaires, puis vérifier calculs, liens, ancres, affichage serveur et absence de régression sur les parcours existants. Documenter les erreurs de source identifiées sans modifier les PDF.
5. Actualiser le journal, synchroniser les fichiers concernés avec l'application locale, créer un commit lisible et l'envoyer sur `master`. Vérifier que la branche distante pointe sur ce commit. Aucune réécriture de l'historique.

Une livraison est une avancée cohérente et vérifiée ; les modifications intermédiaires non fonctionnelles ne sont pas publiées. La relecture scientifique de l'auteur reste indiquée jusqu'à sa validation explicite.

## Sources externes

Pour M1, le [manuel MIT 8.01SC](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/pages/online-textbook/) fournit des chapitres distincts sur Newton, l'énergie, le moment cinétique, les oscillations et la mécanique céleste. Les références précises utilisées sont indiquées dans chaque fiche.

Pour les lots suivants, sélectionner les cours universitaires ouverts (MIT OCW, Cambridge), les publications des organismes scientifiques (BIPM, CERN, PDG, ESA) et les articles de recherche originaux selon la notion traitée. Ces pistes ne valent pas validation anticipée de tout leur contenu. Aucun extrait ou illustration externe ne sera repris sans vérifier sa provenance et ses conditions de réutilisation.

## Ouvrages et publication

Les deux recueils sont des ouvrages commercialisés de l'auteur. Les PDF complets, les pages rendues, les extractions de texte, les exports SQL et les secrets restent hors du dépôt. Seules les synthèses web, les références bibliographiques et les repères de pages sont publiés. Aucune autorisation de diffusion des ouvrages complets n'est déduite de ce chantier.

Le site fonctionne localement ; `physicstopics.fr` n'a plus d'hébergement. L'envoi GitHub publie le code, pas un nouveau site hébergé. Avant un éventuel hébergement, supprimer ou protéger l'accès aux fichiers complets : les routes de lecture locales ne sont pas authentifiées.

## Suivi

Voir [le journal des avancées](AVANCEES.md). M1 et M2 ont livré huit fiches de mécanique et deux boucles. F1 ajoute six fiches et deux boucles pour les fluides, l'élasticité, la corde et l'acoustique. Ces livraisons constituent des premiers parcours délimités ; elles ne transposent pas l'intégralité des chapitres sources. M2 se limite notamment à une introduction analytique sur un système à un degré de liberté. La priorité actuelle est la relecture des analyses à deux niveaux des 22 fiches, y compris la thermodynamique et la physique statistique. E1 (champs et électromagnétisme) viendra ensuite. Les autres lots restent planifiés tant que le journal ne mentionne pas une livraison effective.
