// Calendrier de la soirée. Toutes les dates sont regroupées ici : c'est le
// seul endroit à modifier pour décaler le dépôt des fiches ou les fenêtres
// d'accès aux indices — rien n'est codé en dur ailleurs dans l'app.
//
// Format : new Date("AAAA-MM-JJTHH:MM:SS+02:00") — garde le "+02:00" (heure
// d'été Paris) tel quel, ou ajuste-le si la soirée tombe hors de cette période.

export type Enquete = "lycee" | "aujourdhui";

export const ENQUETE_LABELS: Record<Enquete, string> = {
  lycee: "Lycée",
  aujourdhui: "Aujourd'hui",
};

// Dernier moment pour déposer / modifier sa fiche (lundi soir).
export const SUBMISSION_DEADLINE = new Date("2026-09-21T22:00:00+02:00");

// Fenêtre d'accès aux indices de chaque enquête. `end: null` = pas de fin.
export const ENQUETE_WINDOWS: Record<Enquete, { start: Date; end: Date | null }> = {
  lycee: {
    start: new Date("2026-09-23T18:00:00+02:00"), // mercredi soir
    end: new Date("2026-09-26T12:00:00+02:00"), // samedi 12h00
  },
  aujourdhui: {
    start: new Date("2026-09-26T12:30:00+02:00"), // samedi 12h30
    end: null,
  },
};

export type EnqueteStatus = "upcoming" | "open" | "closed";

export function isSubmissionOpen(now: Date = new Date()): boolean {
  return now.getTime() < SUBMISSION_DEADLINE.getTime();
}

export function getEnqueteStatus(enquete: Enquete, now: Date = new Date()): EnqueteStatus {
  const window = ENQUETE_WINDOWS[enquete];
  if (now.getTime() < window.start.getTime()) return "upcoming";
  if (window.end && now.getTime() >= window.end.getTime()) return "closed";
  return "open";
}

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatSchedule(date: Date): string {
  return DATE_FORMAT.format(date);
}
