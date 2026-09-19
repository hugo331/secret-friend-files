export const LYCEE_QUESTIONS = [
  "Ton lieu de naissance ?",
  "Quel bac as-tu fait ?",
  "Ta principale bêtise au lycée ?",
  "Ton meilleur souvenir au lycée ?",
  "Ton rêve de métier à l'époque du lycée ?",
] as const;

export const AUJOURDHUI_QUESTIONS = [
  "Dans quelle ville habites-tu ?",
  "Quelle profession exerces-tu ?",
  "Es-tu en couple ou célibataire ?",
  "Quelle est ta passion aujourd'hui ?",
  "Quel est ton plus beau voyage ?",
] as const;

export type Clue = { q: string; a: string };
