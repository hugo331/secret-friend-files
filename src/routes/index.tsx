import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Fingerprint, GraduationCap, Search, Trash2, Trophy, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyPlayer, savePlayer } from "@/lib/game.functions";
import { AUJOURDHUI_QUESTIONS, LYCEE_QUESTIONS } from "@/lib/questions";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Dossier d'enquête secret — Dépose ta fiche" },
      {
        name: "description",
        content: "Enregistre ton prénom et 10 indices (5 lycée, 5 aujourd'hui) avant la soirée.",
      },
      { property: "og:title", content: "Dossier d'enquête secret — Dépose ta fiche" },
      {
        property: "og:description",
        content: "Enregistre ton prénom et 10 indices (5 lycée, 5 aujourd'hui) avant la soirée.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type StoredPlayer = { id: string; name: string; deleteToken: string };

function Index() {
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [stored, setStored] = useState<StoredPlayer | null>(null);
  const save = useServerFn(savePlayer);
  const remove = useServerFn(deleteMyPlayer);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("enquete_player");
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as StoredPlayer;
      setStored(p);
      setName(p.name);
    } catch {
      localStorage.removeItem("enquete_player");
    }
  }, []);

  const lyceeFilled = LYCEE_QUESTIONS.filter((q) => (answers[q] ?? "").trim()).length;
  const todayFilled = AUJOURDHUI_QUESTIONS.filter((q) => (answers[q] ?? "").trim()).length;
  const valid = name.trim().length > 0 && lyceeFilled === 5 && todayFilled === 5;

  const onSubmit = async () => {
    if (!valid) {
      toast.error("Il faut ton prénom + 5 réponses lycée + 5 réponses aujourd'hui.");
      return;
    }
    setSaving(true);
    try {
      // Le serveur attend exactement 10 indices remplis (5 lycée + 5
      // aujourd'hui) : on ne garde que les questions auxquelles on a
      // répondu, pas la liste complète des questions proposées.
      const clues = [...LYCEE_QUESTIONS, ...AUJOURDHUI_QUESTIONS]
        .filter((q) => (answers[q] ?? "").trim().length > 0)
        .map((q) => ({
          q,
          a: (answers[q] ?? "").trim(),
        }));
      const player = await save({ data: { name, deleteToken: stored?.deleteToken, clues } });
      const next = { id: player.id, name: player.name, deleteToken: player.deleteToken };
      localStorage.setItem("enquete_player", JSON.stringify(next));
      setStored(next);
      toast.success("Fiche enregistrée !");
      navigate({ to: "/jeu" });
    } catch {
      toast.error("Impossible d'enregistrer la fiche, réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!stored) return;
    if (!window.confirm("Supprimer définitivement ta fiche ?")) return;
    setSaving(true);
    try {
      await remove({ data: { deleteToken: stored.deleteToken } });
      localStorage.removeItem("enquete_player");
      setStored(null);
      setName("");
      setAnswers({});
      toast.success("Fiche supprimée.");
    } catch {
      toast.error("Suppression impossible, réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const questionBlock = (
    title: string,
    icon: React.ReactNode,
    questions: readonly string[],
    filled: number,
  ) => (
    <Card className="border-l-4 border-l-investigation">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>Réponds à ces 5 questions — {filled}/5 remplies.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q) => (
          <div key={q} className="space-y-1.5">
            <Label htmlFor={q} className="text-sm font-normal">
              {q}
            </Label>
            <Input
              id={q}
              maxLength={300}
              value={answers[q] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center rounded-full border border-classified bg-classified/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-classified-foreground">
            <Fingerprint className="mr-2 h-4 w-4" />
            Dossier confidentiel
          </div>
          <h1 className="font-poster-title text-3xl uppercase tracking-wide sm:text-4xl">
            Dossier d'enquête secret
          </h1>
          <p className="text-muted-foreground">
            Dépose ta fiche avant la soirée : 5 indices sur tes années lycée, 5 sur ta vie
            d'aujourd'hui.
          </p>
        </header>

        <Card className="border-l-4 border-l-investigation">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-investigation" />
              Mon identité
            </CardTitle>
            <CardDescription>Ton prénom reste caché jusqu'à la révélation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="name">Mon prénom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Ex : Chloé"
            />
          </CardContent>
        </Card>

        {questionBlock(
          "À l'époque du lycée",
          <GraduationCap className="h-5 w-5 text-investigation" />,
          LYCEE_QUESTIONS,
          lyceeFilled,
        )}
        {questionBlock(
          "Aujourd'hui",
          <Fingerprint className="h-5 w-5 text-investigation" />,
          AUJOURDHUI_QUESTIONS,
          todayFilled,
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/jeu">
                <Search className="mr-2 h-4 w-4" />
                Jouer
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/classement">
                <Trophy className="mr-2 h-4 w-4" />
                Classement
              </Link>
            </Button>
            {stored && (
              <Button variant="destructive" onClick={() => void onDelete()} disabled={saving}>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer ma fiche
              </Button>
            )}
          </div>
          <Button onClick={() => void onSubmit()} disabled={saving || !valid}>
            <Fingerprint className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : stored ? "Mettre à jour ma fiche" : "Déposer ma fiche"}
          </Button>
        </div>
      </div>
    </div>
  );
}
