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
});

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

    const totalClues = Math.max(1, countAnswers(target.clues));
    const revealed = Math.min(data.revealed, totalClues);
    const correct = nameMatches(data.answer, target.name_key, target.name);
    const points = correct ? Math.max(0, totalClues - revealed) : 0;

    const { error } = await supabaseAdmin.from("guesses").insert({
      guesser_id: data.playerId,
      target_id: data.targetId,
      answer: data.answer,
      correct,
      points,
      attempts: 1,
    });
    if (error) throw new Error(error.message);

    return { correct, points, realName: target.name, potential: Math.max(0, totalClues - revealed) };
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
