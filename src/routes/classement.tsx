import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Trophy } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getLeaderboard, removePlayerCard } from "@/lib/game.functions";

export const Route = createFileRoute("/classement")({
  component: LeaderboardPage,
  head: () => ({
    meta: [
      { title: "Classement — Dossier d'enquête secret" },
      { name: "description", content: "Les scores des détectives, mis à jour en direct." },
      { property: "og:title", content: "Classement — Dossier d'enquête secret" },
      { property: "og:description", content: "Les scores des détectives, mis à jour en direct." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LeaderboardPage() {
  const fetchBoard = useServerFn(getLeaderboard);
  const remove = useServerFn(removePlayerCard);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchBoard(),
    refetchInterval: 3000,
  });
  const [admin, setAdmin] = useState(false);
  const taps = useRef(0);

  const rows = data ?? [];

  const secretTap = () => {
    taps.current += 1;
    if (taps.current >= 3) {
      setAdmin(true);
      toast.success("Mode maître de cérémonie activé");
    }
  };

  const onRemove = async (id: string, name: string) => {
    if (!window.confirm(`Retirer la fiche de ${name} du jeu ?`)) return;
    try {
      await remove({ data: { playerId: id } });
      toast.success(`Fiche de ${name} retirée.`);
      await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch {
      toast.error("Suppression impossible, réessaie.");
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="font-poster-title cursor-default select-none text-3xl uppercase tracking-wide" onClick={secretTap}>
            Classement
          </h1>
          <p className="text-sm text-muted-foreground">Mis à jour en direct pendant la soirée.</p>
        </header>

        <div className="poster-board relative space-y-3 px-4 py-8 shadow-xl sm:px-8">
          <div className="poster-tape -left-8 -top-2 rotate-[-45deg]" />
          <div className="poster-tape -right-8 -top-2 rotate-45" />
          {rows.length === 0 ? (
            <p className="text-center font-poster-hand text-xl text-poster-ink">
              Aucun détective en piste pour l'instant.
            </p>
          ) : (
            rows.map((p, i) => (
              <div key={p.id} className="poster-card flex items-center justify-between gap-4">
                <span className="font-poster-title text-sm uppercase tracking-wide">
                  {i + 1}. {p.name}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-poster-hand text-2xl font-bold text-poster-ink">
                    {p.score} pts
                  </span>
                  {admin && (
                    <button
                      aria-label={`Retirer ${p.name}`}
                      onClick={() => void onRemove(p.id, p.name)}
                      className="text-destructive hover:opacity-70"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/">Ma fiche</Link>
          </Button>
          <Button asChild>
            <Link to="/jeu">
              <Trophy className="mr-2 h-4 w-4" />
              Continuer l'enquête
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
