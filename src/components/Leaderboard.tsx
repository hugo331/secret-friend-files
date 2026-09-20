import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

import { getLeaderboard } from "@/lib/game.functions";

export function Leaderboard({ compact = false }: { compact?: boolean }) {
  const fetchBoard = useServerFn(getLeaderboard);
  const { data } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchBoard(),
    refetchInterval: 4000,
  });
  const rows = data ?? [];

  if (compact) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Trophy className="h-4 w-4" />
          Classement en direct
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Personne n'a encore de points.</p>
        ) : (
          <ol className="space-y-1">
            {rows.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span>
                  {i + 1}. {p.name}
                </span>
                <span className="font-semibold">{p.score} pts</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
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
              {p.score} pts
            </span>
          </div>
        ))
      )}
    </div>
  );
}
