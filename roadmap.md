# Roadmap — Jeu d'enquête en ligne

- [x] Base de données : fiches joueurs + réponses
- [x] Page `/` : enregistrer son prénom + indices
- [x] Page `/jeu` : deviner les fiches des autres
- [x] Page `/classement` : scores en direct
- [x] 5 indices lycée + 5 indices aujourd'hui (questions fixes, + indices bonus optionnels)
- [x] Suppression de fiche (joueur + organisateur via classement / onglet Fiches)
- [x] Nettoyage des données de test (bouton organisateur sur `/classement`)
- [x] Calendrier configurable (`src/lib/schedule.ts`) : deadline de dépôt des fiches,
      fenêtres d'accès indépendantes pour l'enquête Lycée et l'enquête Aujourd'hui
- [x] Deux enquêtes séparées par suspect (Lycée / Aujourd'hui), chacune avec son
      propre score, son propre verrou, jouable à des moments différents
- [x] Une seule tentative par suspect et par enquête : mauvaise réponse = 0 pt et
      accès aux indices suivants coupé immédiatement
- [x] Compteur de suspects restants visible sur `/jeu`
- [x] Classement en direct affiché directement sous la fiche sur `/jeu`
