import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { normalizeName } from "./normalize";
import { MAX_EXTRA_PER_ENQUETE, REQUIRED_PER_ENQUETE, resolveClueEnquete } from "./questions";
import { type Enquete, type EnqueteStatus, getEnqueteStatus, ENQUETE_WINDOWS } from "./schedule";

const enqueteSchema = z.enum(["lycee", "aujourdhui"]);

const clueSchema = z.object({
  q: z.string().trim().min(1).max(120),
  a: z.string().trim().min(1).max(300),
  enquete: enqueteSchema,
});

const MAX_PER_ENQUETE = REQUIRED_PER_ENQUETE + MAX_EXTRA_PER_ENQUETE;

const saveSchema = z.object({
  name: z.string().trim().min(1).max(40),
  deleteToken: z.string().max(64).optional(),
  clues: z
    .array(clueSchema)
    .min(REQUIRED_PER_ENQUETE * 2)
    .max(MAX_PER_ENQUETE * 2),
});

type StoredClue = { q: string; a: string; enquete?: Enquete };

function validClues(raw: unknown): StoredClue[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is StoredClue =>
      !!c &&
      typeof c === "object" &&
      typeof (c as StoredClue).q === "string" &&
      typeof (c as StoredClue).a === "string" &&
      (c as StoredClue).a.trim().length > 0,
  );
}

function cluesForEnquete(
  raw: unknown,
  enquete: Enquete,
): { q: string; a: string; enquete: Enquete }[] {
  return validClues(raw)
    .filter((c) => resolveClueEnquete(c) === enquete)
    .map((c) => ({ q: c.q, a: c.a, enquete }));
}

function nameMatches(answer: string, targetKey: string, targetName: string): boolean {
  const norm = normalizeName(answer);
  if (!norm) return false;
  if (norm === targetKey) return true;
  return targetName
    .split(/[\s\-']+/)
    .map((part) => normalizeName(part))
    .filter(Boolean)
    .includes(norm);
}

export const savePlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nameKey = normalizeName(data.name);
    if (!nameKey) throw new Error("Prénom invalide");

    const lyceeCount = data.clues.filter((c) => c.enquete === "lycee").length;
    const todayCount = data.clues.filter((c) => c.enquete === "aujourdhui").length;
    if (lyceeCount < REQUIRED_PER_ENQUETE || todayCount < REQUIRED_PER_ENQUETE) {
      throw new Error(`Il faut au moins ${REQUIRED_PER_ENQUETE} indices dans chaque enquête`);
    }
    if (lyceeCount > MAX_PER_ENQUETE || todayCount > MAX_PER_ENQUETE) {
      throw new Error(`Maximum ${MAX_PER_ENQUETE} indices par enquête`);
    }

    const token = data.deleteToken || crypto.randomUUID();

    if (data.deleteToken) {
      const { data: updated, error } = await supabaseAdmin
        .from("players")
        .update({
          name: data.name,
          name_key: nameKey,
          clues: data.clues,
          removed: false,
          updated_at: new Date().toISOString(),
        })
        .eq("delete_token", data.deleteToken)
        .select("id, name")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (updated) return { id: updated.id, name: updated.name, deleteToken: token };
    }

    const { data: row, error } = await supabaseAdmin
      .from("players")
      .upsert(
        {
          name: data.name,
          name_key: nameKey,
          clues: data.clues,
          delete_token: token,
          removed: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "name_key" },
      )
      .select("id, name")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id, name: row.name, deleteToken: token };
  });

export const deleteMyPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ deleteToken: z.string().min(10).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("players")
      .delete()
      .eq("delete_token", data.deleteToken);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const nameSchema = z.object({ name: z.string().trim().min(1).max(40) });

export const findPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => nameSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("players")
      .select("id, name")
      .eq("name_key", normalizeName(data.name))
      .eq("removed", false)
      .maybeSingle();
    return row ? { id: row.id, name: row.name } : null;
  });

const idSchema = z.object({ playerId: z.string().uuid() });

const enqueteWindowsPayload = () =>
  (Object.keys(ENQUETE_WINDOWS) as Enquete[]).reduce(
    (acc, key) => {
      acc[key] = {
        status: getEnqueteStatus(key),
        start: ENQUETE_WINDOWS[key].start.toISOString(),
        end: ENQUETE_WINDOWS[key].end?.toISOString() ?? null,
      };
      return acc;
    },
    {} as Record<Enquete, { status: EnqueteStatus; start: string; end: string | null }>,
  );

const gameStateSchema = z.object({ playerId: z.string().uuid(), enquete: enqueteSchema });

export const getGameState = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => gameStateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await supabaseAdmin
      .from("players")
      .select("id, name")
      .eq("id", data.playerId)
      .eq("removed", false)
      .maybeSingle();
    if (!me) throw new Error("Joueur introuvable");

    const status = getEnqueteStatus(data.enquete);
    const windows = enqueteWindowsPayload();

    const { data: others, error } = await supabaseAdmin
      .from("players")
      .select("id, clues")
      .eq("removed", false)
      .neq("id", data.playerId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: guesses } = await supabaseAdmin
      .from("guesses")
      .select("target_id, points")
      .eq("guesser_id", data.playerId)
      .eq("enquete", data.enquete);

    const done = new Set((guesses ?? []).map((g) => g.target_id));
    const score = (guesses ?? []).reduce((sum, g) => sum + (g.points ?? 0), 0);

    // Les fiches sans indices exploitables pour cette enquête (fiche vide,
    // ou complétée uniquement pour l'autre enquête) sont ignorées.
    const playable = (others ?? []).filter(
      (o) => cluesForEnquete(o.clues, data.enquete).length > 0,
    );

    return {
      windows,
      status,
      me: { id: me.id, name: me.name },
      score,
      answered: playable.filter((o) => done.has(o.id)).length,
      total: playable.length,
      cards: playable
        .filter((o) => !done.has(o.id))
        .map((o) => ({ id: o.id, clueCount: cluesForEnquete(o.clues, data.enquete).length })),
    };
  });

const clueStateSchema = z.object({
  playerId: z.string().uuid(),
  targetId: z.string().uuid(),
  enquete: enqueteSchema,
  revealed: z.number().int().min(0).max(MAX_PER_ENQUETE),
  preview: z.boolean().optional(),
});

export const getCardClues = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => clueStateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Le mode aperçu (organisateur) permet de tester le déroulé d'une
    // enquête avant l'ouverture officielle de sa fenêtre d'accès.
    if (!data.preview && getEnqueteStatus(data.enquete) !== "open") {
      throw new Error("Cette enquête n'est pas accessible actuellement");
    }

    const { data: already } = await supabaseAdmin
      .from("guesses")
      .select("id")
      .eq("guesser_id", data.playerId)
      .eq("target_id", data.targetId)
      .eq("enquete", data.enquete)
      .maybeSingle();
    if (already) throw new Error("Enquête déjà jouée pour ce suspect");

    const { data: target } = await supabaseAdmin
      .from("players")
      .select("id, clues")
      .eq("id", data.targetId)
      .eq("removed", false)
      .neq("id", data.playerId)
      .maybeSingle();
    if (!target) throw new Error("Fiche introuvable");

    const available = cluesForEnquete(target.clues, data.enquete);
    const revealed = Math.min(data.revealed, available.length);

    return { clues: available.slice(0, revealed), totalClues: available.length };
  });

const guessSchema = z.object({
  playerId: z.string().uuid(),
  targetId: z.string().uuid(),
  enquete: enqueteSchema,
  answer: z.string().trim().min(1).max(40),
  revealed: z.number().int().min(1).max(MAX_PER_ENQUETE),
  preview: z.boolean().optional(),
});

// Une seule tentative par suspect et par enquête : le participant consulte
// les indices progressivement, puis valide un nom UNE fois. Bonne réponse =>
// fiche résolue et points enregistrés (le nombre d'indices déjà vus). Mauvaise
// réponse => l'enquête est immédiatement perdue pour ce suspect (0 pt) et
// l'accès aux indices suivants est coupé (la ligne "déjà jouée" bloque tout
// nouvel appel à getCardClues comme à submitGuess).
export const submitGuess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => guessSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.preview && getEnqueteStatus(data.enquete) !== "open") {
      throw new Error("Cette enquête n'est pas accessible actuellement");
    }

    const { data: target } = await supabaseAdmin
      .from("players")
      .select("id, name, name_key, clues")
      .eq("id", data.targetId)
      .eq("removed", false)
      .maybeSingle();
    if (!target) throw new Error("Fiche introuvable");
    if (target.id === data.playerId) throw new Error("Impossible de deviner sa propre fiche");

    const { data: already } = await supabaseAdmin
      .from("guesses")
      .select("id")
      .eq("guesser_id", data.playerId)
      .eq("target_id", data.targetId)
      .eq("enquete", data.enquete)
      .maybeSingle();
    if (already) throw new Error("Enquête déjà jouée pour ce suspect");

    const available = cluesForEnquete(target.clues, data.enquete);
    const totalClues = Math.max(1, available.length);
    const revealed = Math.min(data.revealed, totalClues);
    const correct = nameMatches(data.answer, target.name_key, target.name);
    const points = correct ? Math.max(0, totalClues - revealed) : 0;

    const { error } = await supabaseAdmin.from("guesses").insert({
      guesser_id: data.playerId,
      target_id: data.targetId,
      enquete: data.enquete,
      answer: data.answer,
      correct,
      points,
    });
    if (error) throw new Error(error.message);
    return { correct, points, realName: target.name };
  });

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: players } = await supabaseAdmin
    .from("players")
    .select("id, name")
    .eq("removed", false);
  const { data: guesses } = await supabaseAdmin.from("guesses").select("guesser_id, points");

  return (players ?? [])
    .map((p) => {
      const mine = (guesses ?? []).filter((g) => g.guesser_id === p.id);
      return {
        id: p.id,
        name: p.name,
        score: mine.reduce((s, g) => s + (g.points ?? 0), 0),
        answered: mine.length,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
});

// Vue organisateur : contenu complet de chaque fiche (questions + réponses,
// regroupées par enquête) pour pouvoir relire et supprimer une fiche avant
// la soirée.
export const getAllPlayerCards = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: players, error } = await supabaseAdmin
    .from("players")
    .select("id, name, clues, created_at")
    .eq("removed", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (players ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    lycee: cluesForEnquete(p.clues, "lycee"),
    aujourdhui: cluesForEnquete(p.clues, "aujourdhui"),
  }));
});

export const removePlayerCard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // La fiche disparaît du jeu : les tentatives déjà faites dessus doivent
    // disparaître aussi, sinon les points gagnés dessus restent comptés
    // dans le score alors que la fiche n'existe plus.
    const { error: guessesError } = await supabaseAdmin
      .from("guesses")
      .delete()
      .eq("target_id", data.playerId);
    if (guessesError) throw new Error(guessesError.message);

    const { error } = await supabaseAdmin
      .from("players")
      .update({ removed: true })
      .eq("id", data.playerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Nettoyage avant la vraie soirée : supprime toutes les fiches et toutes les
// réponses (utile pour effacer les données de test créées pendant les
// réglages). Réservé à l'organisateur via le mode "maître de cérémonie".
export const resetAllGameData = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: guessesError } = await supabaseAdmin
    .from("guesses")
    .delete()
    .not("id", "is", null);
  if (guessesError) throw new Error(guessesError.message);

  const { error: playersError } = await supabaseAdmin
    .from("players")
    .delete()
    .not("id", "is", null);
  if (playersError) throw new Error(playersError.message);

  return { ok: true };
});
