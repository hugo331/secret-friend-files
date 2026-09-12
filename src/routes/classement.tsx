import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getLeaderboard } from "@/lib/game.functions";

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
  const { data } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchBoard(),
    refetchInterval: 3000,
  });

  const rows = data ?? [];

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="font-poster-title text-3xl uppercase tracking-wide">Classement</h1>
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
                <span className="font-poster-hand text-2xl font-bold text-poster-ink">
                  {p.score} pt{p.score > 1 ? "s" : ""}
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
