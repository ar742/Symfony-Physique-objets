# Référence de conception du projet

Lire [les fondements](docs/FONDEMENTS-DU-PROJET.md), étendus par l’auteur le 10 septembre 2026, puis [les quatre formes d’analyse](docs/FORMES-ANALYSE.md). La mise en œuvre historique [à deux étages de six fonctions](docs/ANALYSES-DEUX-NIVEAUX.md) décrit le cas 4.

- Un sujet peut être physique, théorique ou un champ de sujets. Exp. désigne ses attributs, avec statut explicite : observé, supposé, calculé, à recueillir. Ne pas inventer de mesure.
- Cas 1 : Exp.1 → TH2 → Exp.3. 1a conserve la nature et le sens des attributs principaux suivis, pas nécessairement leur valeur ; 1b produit d’autres attributs. Distinguer ces attributs du contexte, des paramètres et des hypothèses.
- Cas 2 : trois systèmes, chacun analysé en trois sous-systèmes Exp.–TH–Exp. TH2 est effectif globalement et localement. Qualifier 1a/1b à chaque échelle selon les attributs réellement traités. Pas de boucle de retour implicite 3→1.
- Cas 3 : six systèmes globaux, sans sous-niveaux. TH2 et TH5 effectifs ; évaluations 4/3, 5/2 et 6/1 explicites.
- Cas 4 : six systèmes × six sous-systèmes. TH2 et TH5 et les trois évaluations sont définis aux deux étages. Les 37 fiches existantes relèvent de ce cas.
- Conserver des coordonnées stables, qualifier les relations sans déduire une causalité des flèches. Une analyse renseignée reste perfectible et ne constitue pas une validation scientifique définitive.
- Les nouveaux exemples méthodologiques sont dans exemples-analyse.json ; ne pas gonfler le décompte des fiches 6×6. Les lots scientifiques suivants sont en attente depuis le 10 septembre ; le lot E1e est terminé. Le journal consigne les seules livraisons effectives.

Les PDF commercialisés, leurs rendus et extractions privées, les exports SQL et les secrets restent hors du dépôt. Chaque avancée cohérente et vérifiée est synchronisée localement et publiée sur GitHub selon l’autorisation de l’auteur.
