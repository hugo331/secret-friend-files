import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { normalizeName } from "./normalize";

const clue = z.string().trim().max(300);

const saveSchema = z.object({
  name: z.string().trim().min(1).max(40),
  clueMemory: clue,
  clueJob: clue,
  cluePassion: clue,
  clueWords: clue,
});

export const savePlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nameKey = normalizeName(data.name);
    if (!nameKey) throw new Error("Prénom invalide");

    const { data: row, error } = await supabaseAdmin
      .from("players")
      .upsert(
        {
          name: data.name,
          name_key: nameKey,
          clue_memory: data.clueMemory,
          clue_job: data.clueJob,
          clue_passion: data.cluePassion,
          clue_words: data.clueWords,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "name_key" },
      )
      .select("id, name")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id, name: row.name };
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
      .maybeSingle();
    if (!me) throw new Error("Joueur introuvable");

    const { data: others, error } = await supabaseAdmin
      .from("players")
      .select("id, clue_memory, clue_job, clue_passion, clue_words")
      .neq("id", data.playerId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: guesses } = await supabaseAdmin
      .from("guesses")
      .select("target_id, correct")
      .eq("guesser_id", data.playerId);

    const done = new Set((guesses ?? []).map((g) => g.target_id));
    const score = (guesses ?? []).filter((g) => g.correct).length;

    return {
      me: { id: me.id, name: me.name },
      score,
      answered: done.size,
      total: (others ?? []).length,
      cards: (others ?? [])
        .filter((o) => !done.has(o.id))
        .map((o) => ({
          id: o.id,
          memory: o.clue_memory,
          job: o.clue_job,
          passion: o.clue_passion,
          words: o.clue_words,
        })),
    };
  });

const guessSchema = z.object({
  playerId: z.string().uuid(),
  targetId: z.string().uuid(),
  answer: z.string().trim().min(1).max(40),
});

export const submitGuess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => guessSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin
      .from("players")
      .select("id, name, name_key")
      .eq("id", data.targetId)
      .maybeSingle();
    if (!target) throw new Error("Fiche introuvable");
    if (target.id === data.playerId) throw new Error("Impossible de deviner sa propre fiche");

    const correct = normalizeName(data.answer) === target.name_key;

    const { error } = await supabaseAdmin.from("guesses").insert({
      guesser_id: data.playerId,
      target_id: data.targetId,
      answer: data.answer,
      correct,
    });
    if (error && error.code !== "23505") throw new Error(error.message);

    return { correct, realName: target.name };
  });

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: players } = await supabaseAdmin.from("players").select("id, name");
  const { data: guesses } = await supabaseAdmin.from("guesses").select("guesser_id, correct");

  return (players ?? [])
    .map((p) => {
      const mine = (guesses ?? []).filter((g) => g.guesser_id === p.id);
      return {
        id: p.id,
        name: p.name,
        score: mine.filter((g) => g.correct).length,
        answered: mine.length,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
});
