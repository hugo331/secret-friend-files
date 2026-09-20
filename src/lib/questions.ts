import type { Enquete } from "./schedule";

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

// Nombre minimum d'indices requis pour chaque enquête. Le nombre maximum
// n'est pas fixé dans le code : chacun peut ajouter des indices bonus en
// plus de ces questions de base (jusqu'à MAX_EXTRA_PER_ENQUETE).
export const REQUIRED_PER_ENQUETE = 5;
export const MAX_EXTRA_PER_ENQUETE = 5;

export type Clue = { q: string; a: string; enquete: Enquete };

const QUESTIONS_BY_ENQUETE: Record<Enquete, readonly string[]> = {
  lycee: LYCEE_QUESTIONS,
  aujourdhui: AUJOURDHUI_QUESTIONS,
};

export function questionsFor(enquete: Enquete): readonly string[] {
  return QUESTIONS_BY_ENQUETE[enquete];
}

// Les fiches créées avant l'ajout du champ `enquete` sur chaque indice n'ont
// que `{ q, a }` : on retrouve leur enquête via le texte de la question.
export function resolveClueEnquete(clue: { q: string; enquete?: Enquete }): Enquete | null {
  if (clue.enquete === "lycee" || clue.enquete === "aujourdhui") return clue.enquete;
  if ((LYCEE_QUESTIONS as readonly string[]).includes(clue.q)) return "lycee";
  if ((AUJOURDHUI_QUESTIONS as readonly string[]).includes(clue.q)) return "aujourdhui";
  return null;
}
