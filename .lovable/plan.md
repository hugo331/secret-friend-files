# Jeu d'enquête 100 % en ligne

Oui, c'est tout à fait faisable. Voici comment je le vois.

## Avant la soirée — chacun remplit sa fiche

Une page où la personne entre son prénom + 4 indices :
1. Un souvenir marquant ou une bêtise faite ensemble
2. Mon métier / ce que je fais aujourd'hui
3. Ma passion du moment
4. Trois mots pour me décrire

Elle valide, et c'est enregistré. Si quelqu'un revient avec le même prénom, il peut mettre sa fiche à jour.

## Le jour J — le jeu

1. J'arrive, je tape mon prénom → je suis reconnu.
2. Le jeu me présente les fiches des autres, une par une, en mode anonyme (jamais la mienne).
3. Pour chaque fiche : je lis les 4 indices, je tape le prénom de la personne, je valide.
4. Réponse immédiate : « Bravo, c'était Marie » ou « Raté, c'était Marie ». Un seul essai, puis on passe à la fiche suivante.
5. 1 point par bonne réponse.
6. À la fin : mon score, et le classement de tout le monde.

## Classement en direct

Une page classement qui se met à jour toute seule quand les autres répondent, visible pendant la soirée.

## Points à noter

- L'identification se fait juste au prénom, comme demandé : c'est volontairement léger, donc quelqu'un pourrait taper le prénom d'un autre. Suffisant entre amis.
- Pour éviter de « tricher », une fiche déjà jouée ne peut plus être rejouée par la même personne.
- Les prénoms sont comparés sans tenir compte des majuscules/accents, donc « chloe » vaut « Chloé ».

## Côté technique

- Activation de Lovable Cloud pour stocker les fiches et les scores.
- Tables : `players` (prénom, 4 indices) et `guesses` (qui a deviné quelle fiche, réponse, correct ou non), avec contrainte d'unicité pour garantir l'essai unique.
- Validation de la réponse côté serveur (server function) : le vrai prénom n'est jamais envoyé au navigateur avant la réponse.
- Classement en direct via abonnement temps réel sur les scores.
- Pages : `/` (remplir sa fiche), `/jeu` (jouer), `/classement`.
- Le style « avis de recherche » actuel est conservé pour l'affichage des fiches à deviner.
