import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Fingerprint, Search, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { savePlayer } from "@/lib/game.functions";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Dossier d'enquête secret — Dépose ta fiche" },
      {
        name: "description",
        content: "Enregistre ton prénom et tes 4 indices avant la soirée, puis retrouve les autres le jour J.",
      },
      { property: "og:title", content: "Dossier d'enquête secret — Dépose ta fiche" },
      {
        property: "og:description",
        content: "Enregistre ton prénom et tes 4 indices avant la soirée, puis retrouve les autres le jour J.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const initialForm = {
  name: "",
  clueMemory: "",
  clueJob: "",
  cluePassion: "",
  clueWords: "",
};

function Index() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(savePlayer);
  const navigate = useNavigate();

  const update =
    (key: keyof typeof initialForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const filled = Object.values(form).filter((v) => v.trim()).length;

  const onSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Indique ton prénom");
      return;
    }
    if (filled < 5) {
      toast.error("Remplis tes 4 indices");
      return;
    }
    setSaving(true);
    try {
      const player = await save({ data: form });
      localStorage.setItem("enquete_player", JSON.stringify(player));
      toast.success("Fiche enregistrée, à toi de jouer le jour J !");
      navigate({ to: "/jeu" });
    } catch {
      toast.error("Impossible d'enregistrer la fiche, réessaie.");
    } finally {
      setSaving(false);
    }
  };

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
            Dépose ta fiche avant la soirée. Le jour J, chacun devra retrouver qui se cache derrière
            chaque fiche.
          </p>
        </header>

        <Card className="border-l-4 border-l-investigation">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Search className="h-5 w-5 text-investigation" />
              Ma fiche
            </CardTitle>
            <CardDescription>Ton prénom reste caché jusqu'à la révélation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Mon prénom</Label>
              <Input
                id="name"
                value={form.name}
                onChange={update("name")}
                maxLength={40}
                placeholder="Ex : Chloé"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memory">Un souvenir marquant ou une bêtise faite ensemble</Label>
              <Textarea
                id="memory"
                rows={3}
                maxLength={300}
                value={form.clueMemory}
                onChange={update("clueMemory")}
                placeholder="Indice n°1..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job">Ce que je fais aujourd'hui</Label>
              <Input
                id="job"
                maxLength={300}
                value={form.clueJob}
                onChange={update("clueJob")}
                placeholder="Indice n°2..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passion">Ma passion du moment</Label>
              <Input
                id="passion"
                maxLength={300}
                value={form.cluePassion}
                onChange={update("cluePassion")}
                placeholder="Indice n°3..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="words">Trois mots pour me décrire</Label>
              <Input
                id="words"
                maxLength={300}
                value={form.clueWords}
                onChange={update("clueWords")}
                placeholder="Indice n°4..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex gap-3">
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
          </div>
          <Button onClick={onSubmit} disabled={saving}>
            <Fingerprint className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : "Déposer ma fiche"}
          </Button>
        </div>
      </div>
    </div>
  );
}
