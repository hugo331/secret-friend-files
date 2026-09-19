import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { normalizeName } from "./normalize";

const clueSchema = z.object({
  q: z.string().trim().min(1).max(120),
  a: z.string().trim().min(1).max(300),
});

const saveSchema = z.object({
  name: z.string().trim().min(1).max(40),
  deleteToken: z.string().max(64).optional(),
  clues: z.array(clueSchema).length(10),
});

function countAnswers(clues: unknown): number {
  if (!Array.isArray(clues)) return 0;
  return clues.filter(
    (c) =>
      c && typeof c === "object" && typeof (c as { a?: unknown }).a === "string" && ((c as { a: string }).a.trim().length > 0),
  ).length;
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

    const token = data.deleteToken || crypto.randomUUID();

    if (data.deleteToken) {
      const { data: updated, error } = await supabaseAdmin
        .from("players")
        .update({ name: data.name, name_key: nameKey, clues: data.clues, updated_at: new Date().toISOString() })
        .eq("delete_token", data.deleteToken)
        .select("id, name")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (updated) return { id: updated.id, name: updated.name, deleteToken: token };
    }

    const { data: row, error } = await supabaseAdmin
      .from("players")
      .upsert(
        { name: data.name, name_key: nameKey, clues: data.clues, delete_token: token, updated_at: new Date().toISOString() },
        { onConflict: "name_key" },
      )
      .select("id, name")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id, name: row.name, deleteToken: token };
  });

export const deleteMyPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ deleteToken: z.string().min(10).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("players").delete().eq("delete_token", data.deleteToken);
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

export const getGameState = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await supabaseAdmin
      .from("players")
      .select("id, name")
      .eq("id", data.playerId)
      .eq("removed", false)
      .maybeSingle();
    if (!me) throw new Error("Joueur introuvable");

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
      .eq("guesser_id", data.playerId);

    const done = new Set((guesses ?? []).map((g) => g.target_id));
    const score = (guesses ?? []).reduce((sum, g) => sum + (g.points ?? 0), 0);

    return {
      me: { id: me.id, name: me.name },
      score,
      answered: done.size,
      total: (others ?? []).length,
      cards: (others ?? [])
        .filter((o) => !done.has(o.id))
        .map((o) => ({ id: o.id, clueCount: countAnswers(o.clues) })),
    };
  });

const clueStateSchema = z.object({
  playerId: z.string().uuid(),
  targetId: z.string().uuid(),
  revealed: z.number().int().min(0).max(10),
});

export const getCardClues = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => clueStateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: already } = await supabaseAdmin
      .from("guesses")
      .select("id")
      .eq("guesser_id", data.playerId)
      .eq("target_id", data.targetId)
      .maybeSingle();
    if (already) throw new Error("Fiche déjà jouée");

    const { data: target } = await supabaseAdmin
      .from("players")
      .select("id, clues")
      .eq("id", data.targetId)
      .eq("removed", false)
      .neq("id", data.playerId)
      .maybeSingle();
    if (!target) throw new Error("Fiche introuvable");

    const clues = Array.isArray(target.clues) ? (target.clues as { q: string; a: string }[]) : [];
    const available = clues.filter((c) => c && typeof c.a === "string" && c.a.trim().length > 0);
    const revealed = Math.min(data.revealed, available.length);

    return { clues: available.slice(0, revealed), totalClues: available.length };
  });

const guessSchema = z.object({
  playerId: z.string().uuid(),
  targetId: z.string().uuid(),
  answer: z.string().trim().min(1).max(40),
  revealed: z.number().int().min(1).max(10),
  attempts: z.number().int().min(1).max(20).optional(),
});

// Une tentative sur une fiche : bonne réponse => la fiche est validée et le
// score enregistré. Mauvaise réponse => tant qu'il reste des indices à
// révéler, on en dévoile un de plus automatiquement (-1 pt) et on laisse
// retenter (aucune écriture en base, la fiche n'est pas encore "jouée").
// Une fois tous les indices épuisés sans trouver, la fiche est enregistrée
// comme ratée (0 pt) et le vrai nom est révélé.
export const submitGuess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => guessSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
      .maybeSingle();
    if (already) throw new Error("Fiche déjà jouée");

    const clues = Array.isArray(target.clues) ? (target.clues as { q: string; a: string }[]) : [];
    const available = clues.filter((c) => c && typeof c.a === "string" && c.a.trim().length > 0);
    const totalClues = Math.max(1, available.length);
    const revealed = Math.min(data.revealed, totalClues);
    const correct = nameMatches(data.answer, target.name_key, target.name);
    const attempts = data.attempts ?? 1;

    if (correct) {
      const points = Math.max(0, totalClues - revealed);
      const { error } = await supabaseAdmin.from("guesses").insert({
        guesser_id: data.playerId,
        target_id: data.targetId,
        answer: data.answer,
        correct: true,
        points,
        attempts,
      });
      if (error) throw new Error(error.message);
      return { done: true, correct: true, points, realName: target.name };
    }

    const nextRevealed = revealed + 1;
    if (nextRevealed < totalClues) {
      // Encore des indices en réserve : on en dévoile un de plus et on
      // laisse retenter, sans enregistrer la tentative en base.
      return {
        done: false,
        correct: false,
        revealed: nextRevealed,
        totalClues,
        clues: available.slice(0, nextRevealed),
      };
    }

    // Plus aucun indice à révéler : la fiche est perdue, on enregistre 0 pt.
    const { error } = await supabaseAdmin.from("guesses").insert({
      guesser_id: data.playerId,
      target_id: data.targetId,
      answer: data.answer,
      correct: false,
      points: 0,
      attempts,
    });
    if (error) throw new Error(error.message);
    return { done: true, correct: false, points: 0, realName: target.name };
  });

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: players } = await supabaseAdmin.from("players").select("id, name").eq("removed", false);
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

export const removePlayerCard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("players").update({ removed: true }).eq("id", data.playerId);
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
