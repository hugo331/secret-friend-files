import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, Fingerprint, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findPlayer, getCardClues, getGameState, submitGuess } from "@/lib/game.functions";
import type { Clue } from "@/lib/questions";

export const Route = createFileRoute("/jeu")({
  component: GamePage,
  head: () => ({
    meta: [
      { title: "Le jeu — Dossier d'enquête secret" },
      { name: "description", content: "Découvre les fiches anonymes et devine qui se cache derrière." },
      { property: "og:title", content: "Le jeu — Dossier d'enquête secret" },
      {
        property: "og:description",
        content: "Découvre les fiches anonymes et devine qui se cache derrière.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Fiche = { id: string; clueCount: number };
type State = {
  me: { id: string; name: string };
  score: number;
  answered: number;
  total: number;
  cards: Fiche[];
};

const ROTATIONS = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1", "rotate-1", "-rotate-2"];

function GamePage() {
  const find = useServerFn(findPlayer);
  const load = useServerFn(getGameState);
  const fetchClues = useServerFn(getCardClues);
  const guess = useServerFn(submitGuess);

  const [nameInput, setNameInput] = useState("");
  const [state, setState] = useState<State | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [totalClues, setTotalClues] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ correct: boolean; points: number; realName: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("enquete_player");
    if (!stored) return;
    try {
      const p = JSON.parse(stored) as { id: string };
      void load({ data: { playerId: p.id } })
        .then(setState)
        .catch(() => localStorage.removeItem("enquete_player"));
    } catch {
      localStorage.removeItem("enquete_player");
    }
  }, [load]);

  const current = state?.cards[0];

  useEffect(() => {
    if (!state || !current) return;
    setClues([]);
    setAnswer("");
    setResult(null);
    void fetchClues({ data: { playerId: state.me.id, targetId: current.id, revealed: 1 } })
      .then((res) => {
        setClues(res.clues);
        setRevealed(1);
        setTotalClues(res.totalClues);
      })
      .catch(() => toast.error("Impossible de charger la fiche."));
  }, [state?.me.id, current?.id, fetchClues, state]);

  const identify = async () => {
    if (!nameInput.trim()) return;
    setBusy(true);
    try {
      const player = await find({ data: { name: nameInput } });
      if (!player) {
        toast.error("Aucune fiche à ce prénom. Dépose d'abord ta fiche.");
        return;
      }
      localStorage.setItem("enquete_player", JSON.stringify(player));
      setState(await load({ data: { playerId: player.id } }));
    } catch {
      toast.error("Connexion impossible, réessaie.");
    } finally {
      setBusy(false);
    }
  };

  const potential = Math.max(0, totalClues - revealed);

  const reveal = async () => {
    if (!state || !current || revealed >= totalClues) return;
    setBusy(true);
    try {
      const next = revealed + 1;
      const res = await fetchClues({ data: { playerId: state.me.id, targetId: current.id, revealed: next } });
      setClues(res.clues);
      setRevealed(next);
    } catch {
      toast.error("Impossible de révéler l'indice.");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!state || !current || !answer.trim()) return;
    setBusy(true);
    try {
      const res = await guess({
        data: { playerId: state.me.id, targetId: current.id, answer, revealed },
      });
      setResult(res);
      setState({ ...state, score: state.score + res.points, answered: state.answered + 1 });
    } catch {
      toast.error("Réponse non enregistrée, réessaie.");
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (!state) return;
    setResult(null);
    setAnswer("");
    setState({ ...state, cards: state.cards.slice(1) });
  };

  if (!state) {
    return (
      <Shell>
        <Card className="border-l-4 border-l-investigation">
          <CardHeader>
            <CardTitle>Qui es-tu, détective ?</CardTitle>
            <CardDescription>Entre le prénom utilisé pour déposer ta fiche.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="who">Mon prénom</Label>
            <Input
              id="who"
              value={nameInput}
              maxLength={40}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void identify()}
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void identify()} disabled={busy}>
                Commencer l'enquête
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Déposer ma fiche</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!current) {
    return (
      <Shell>
        <div className="poster-board relative space-y-6 px-6 py-12 text-center shadow-xl">
          <div className="poster-tape -left-8 -top-2 rotate-[-45deg]" />
          <div className="poster-tape -right-8 -top-2 rotate-45" />
          <p className="font-poster-title text-2xl uppercase tracking-wide">Enquête bouclée</p>
          <p className="font-poster-hand text-4xl text-poster-ink">{state.score} points</p>
          <p className="text-sm text-muted-foreground">
            {state.total === 0
              ? "Aucune autre fiche pour l'instant, reviens plus tard."
              : "Beau travail, détective."}
          </p>
          <Button asChild>
            <Link to="/classement">
              <Trophy className="mr-2 h-4 w-4" />
              Voir le classement
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>Détective {state.me.name}</span>
        <span>
          Fiche {state.total - state.cards.length + 1} / {state.total} — {state.score} pts
        </span>
      </div>

      <div className="poster-board relative overflow-hidden px-4 py-8 shadow-xl sm:px-8">
        <div className="poster-tape -left-8 -top-2 rotate-[-45deg]" />
        <div className="poster-tape -right-8 -top-2 rotate-45" />
        <div className="poster-tape -bottom-2 -left-8 rotate-45" />
        <div className="poster-tape -bottom-2 -right-8 rotate-[-45deg]" />

        <div className="relative space-y-6">
          <div className="mx-auto w-fit rotate-[-1deg] bg-card px-6 py-2 shadow-md">
            <p className="font-poster-title text-lg uppercase tracking-widest text-investigation sm:text-2xl">
              Avis de recherche
            </p>
          </div>

          <div className="flex flex-wrap items-start justify-center gap-4">
            {clues.map((c, i) => (
              <div key={c.q} className={`poster-card ${ROTATIONS[i % ROTATIONS.length]} w-full max-w-sm`}>
                <p className="font-poster-hand text-sm italic text-muted-foreground">{c.q}</p>
                <p className="font-poster-hand text-xl font-bold leading-tight text-poster-ink">{c.a}</p>
              </div>
            ))}
          </div>

          <div className="poster-card mx-auto w-full max-w-md space-y-3 text-center">
            {result ? (
              <>
                <p className="font-poster-title text-base uppercase tracking-wider">
                  {result.correct ? `Bravo ! +${result.points} pts` : "Raté... 0 pt"}
                </p>
                <p className="font-poster-hand text-3xl text-poster-ink">{result.realName}</p>
                <Button onClick={next} className="w-full">
                  Fiche suivante
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <p className="font-poster-title text-sm uppercase tracking-wider">
                  Prénom de l'accusé·e
                </p>
                <p className="text-xs text-muted-foreground">
                  En jeu : {potential} pt{potential > 1 ? "s" : ""} — chaque indice révélé ou erreur
                  coûte 1 point.
                </p>
                <Input
                  value={answer}
                  maxLength={40}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void send()}
                  placeholder="Qui se cache derrière ?"
                  className="text-center"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void reveal()}
                    disabled={busy || revealed >= totalClues}
                    className="flex-1"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Indice ({revealed}/{totalClues})
                  </Button>
                  <Button onClick={() => void send()} disabled={busy} className="flex-1">
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Accuser
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">{children}</div>
    </div>
  );
}
