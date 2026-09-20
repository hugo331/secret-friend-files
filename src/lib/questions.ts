import type { Enquete } from "./schedule";

export const LYCEE_QUESTIONS = [
  "Dans quelle ville habitais-tu au lycée ?",
  "Quel bac as-tu fait ?",
  "Quelle était ta matière ou ton professeur préféré ?",
  "Quelle était ta matière ou ton professeur détesté ?",
  "Quel était ton groupe de musique ou chanteur préféré à l'époque ?",
  "Avais-tu une caractéristique vestimentaire particulière ?",
  "Quelle était ta principale bêtise au lycée ?",
  "Quel était ton meilleur souvenir au lycée ?",
  "Quel était ton meilleur souvenir en dehors du lycée avec nous ?",
  "Cite un(e) ami(e) dont tu étais particulièrement proche au lycée.",
] as const;

export const AUJOURDHUI_QUESTIONS = [
  "Dans quelle ville habites-tu aujourd'hui ?",
  "Es-tu en couple ou célibataire ?",
  "Combien d'enfants as-tu ?",
  "Quelle profession exerces-tu ?",
  "Quel est ton principal diplôme obtenu après le bac ?",
  "Avec qui es-tu principalement resté en contact depuis l'époque du lycée ?",
  "Quel est ton groupe ou chanteur préféré aujourd'hui ?",
  "Quelle est ta passion aujourd'hui ?",
  "Quel est ton loisir préféré aujourd'hui ?",
  "Quel est ton plus beau voyage ?",
] as const;

// Nombre minimum d'indices requis pour chaque enquête. Le nombre maximum
// n'est pas fixé dans le code : chacun peut ajouter des indices bonus en
// plus de ces questions de base (jusqu'à MAX_EXTRA_PER_ENQUETE).
export const REQUIRED_PER_ENQUETE = 10;
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
