import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2, Trophy } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAllPlayerCards,
  getLeaderboard,
  removePlayerCard,
  resetAllGameData,
} from "@/lib/game.functions";

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
  const fetchCards = useServerFn(getAllPlayerCards);
  const remove = useServerFn(removePlayerCard);
  const resetAll = useServerFn(resetAllGameData);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchBoard(),
    refetchInterval: 3000,
  });
  const [admin, setAdmin] = useState(false);
  const [resetting, setResetting] = useState(false);
  const taps = useRef(0);

  const { data: cardsData } = useQuery({
    queryKey: ["all-cards"],
    queryFn: () => fetchCards(),
    enabled: admin,
    refetchInterval: admin ? 5000 : false,
  });
  const cards = cardsData ?? [];

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
      await queryClient.invalidateQueries({ queryKey: ["all-cards"] });
    } catch {
      toast.error("Suppression impossible, réessaie.");
    }
  };

  const onResetAll = async () => {
    const answer = window.prompt(
      "Ça va supprimer TOUTES les fiches et réponses (utile pour nettoyer les données de test avant la vraie soirée). Tape SUPPRIMER pour confirmer.",
    );
    if (answer !== "SUPPRIMER") return;
    setResetting(true);
    try {
      await resetAll();
      toast.success("Toutes les données ont été effacées.");
      localStorage.removeItem("enquete_player");
      await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch {
      toast.error("Réinitialisation impossible, réessaie.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-2 text-center">
          <h1
            className="font-poster-title cursor-default select-none text-3xl uppercase tracking-wide"
            onClick={secretTap}
          >
            Classement
          </h1>
          <p className="text-sm text-muted-foreground">Mis à jour en direct pendant la soirée.</p>
        </header>

        {admin ? (
          <Tabs defaultValue="classement" className="w-full">
            <TabsList className="mx-auto grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="classement">Classement</TabsTrigger>
              <TabsTrigger value="fiches">Fiches ({cards.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="classement">
              <LeaderboardBoard rows={rows} admin={admin} onRemove={onRemove} />
            </TabsContent>

            <TabsContent value="fiches">
              <div className="poster-board relative space-y-2 px-4 py-6 shadow-xl sm:px-8">
                <div className="poster-tape -left-8 -top-2 rotate-[-45deg]" />
                <div className="poster-tape -right-8 -top-2 rotate-45" />
                {cards.length === 0 ? (
                  <p className="text-center font-poster-hand text-xl text-poster-ink">
                    Aucune fiche déposée pour l'instant.
                  </p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {cards.map((p) => (
                      <AccordionItem key={p.id} value={p.id}>
                        <AccordionTrigger className="font-poster-title text-sm uppercase tracking-wide">
                          {p.name} ({p.clues.length} indices)
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {p.clues.map((c) => (
                              <p key={c.q} className="text-sm">
                                <span className="text-muted-foreground">{c.q}</span>{" "}
                                <span className="font-medium">{c.a}</span>
                              </p>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void onRemove(p.id, p.name)}
                              className="mt-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer cette fiche
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <LeaderboardBoard rows={rows} admin={admin} onRemove={onRemove} />
        )}

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

        {admin && (
          <div className="flex flex-col items-center gap-2 border-t border-dashed border-muted pt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Mode organisateur — avant la vraie soirée, efface les fiches de test.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onResetAll()}
              disabled={resetting}
              className="text-destructive hover:text-destructive"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {resetting ? "Réinitialisation..." : "Effacer toutes les données (test)"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

type Row = { id: string; name: string; score: number; answered: number };

function LeaderboardBoard({
  rows,
  admin,
  onRemove,
}: {
  rows: Row[];
  admin: boolean;
  onRemove: (id: string, name: string) => void | Promise<void>;
}) {
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
  );
}
