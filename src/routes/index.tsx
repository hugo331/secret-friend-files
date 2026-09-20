import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  Fingerprint,
  GraduationCap,
  Plus,
  Search,
  Trash2,
  Trophy,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyPlayer, savePlayer } from "@/lib/game.functions";
import {
  AUJOURDHUI_QUESTIONS,
  LYCEE_QUESTIONS,
  MAX_EXTRA_PER_ENQUETE,
  REQUIRED_PER_ENQUETE,
} from "@/lib/questions";
import {
  formatSchedule,
  isSubmissionOpen,
  SUBMISSION_DEADLINE,
  type Enquete,
} from "@/lib/schedule";

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
type ExtraClue = { id: string; q: string; a: string };

function Index() {
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Record<Enquete, ExtraClue[]>>({ lycee: [], aujourdhui: [] });
  const [saving, setSaving] = useState(false);
  const [stored, setStored] = useState<StoredPlayer | null>(null);
  const [adminOverride, setAdminOverride] = useState(false);
  const save = useServerFn(savePlayer);
  const remove = useServerFn(deleteMyPlayer);
  const adminTaps = useRef(0);

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

  const submissionOpen = isSubmissionOpen();
  const secretTap = () => {
    adminTaps.current += 1;
    if (adminTaps.current >= 3) {
      setAdminOverride(true);
      toast.success("Mode organisateur activé : dépôt débloqué après la deadline.");
    }
  };

  const lyceeFilled = LYCEE_QUESTIONS.filter((q) => (answers[q] ?? "").trim()).length;
  const todayFilled = AUJOURDHUI_QUESTIONS.filter((q) => (answers[q] ?? "").trim()).length;
  const valid =
    name.trim().length > 0 &&
    lyceeFilled === REQUIRED_PER_ENQUETE &&
    todayFilled === REQUIRED_PER_ENQUETE;

  const addExtra = (enquete: Enquete) => {
    setExtras((prev) => {
      if (prev[enquete].length >= MAX_EXTRA_PER_ENQUETE) return prev;
      return { ...prev, [enquete]: [...prev[enquete], { id: crypto.randomUUID(), q: "", a: "" }] };
    });
  };

  const updateExtra = (enquete: Enquete, id: string, field: "q" | "a", value: string) => {
    setExtras((prev) => ({
      ...prev,
      [enquete]: prev[enquete].map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  const removeExtra = (enquete: Enquete, id: string) => {
    setExtras((prev) => ({ ...prev, [enquete]: prev[enquete].filter((c) => c.id !== id) }));
  };

  const onSubmit = async () => {
    if (!valid) {
      toast.error(
        `Il faut ton prénom + ${REQUIRED_PER_ENQUETE} réponses lycée + ${REQUIRED_PER_ENQUETE} réponses aujourd'hui.`,
      );
      return;
    }
    setSaving(true);
    try {
      const fixedClues = [
        ...LYCEE_QUESTIONS.map((q) => ({ q, a: answers[q], enquete: "lycee" as const })),
        ...AUJOURDHUI_QUESTIONS.map((q) => ({ q, a: answers[q], enquete: "aujourdhui" as const })),
      ];
      const extraClues = (["lycee", "aujourdhui"] as const).flatMap((enquete) =>
        extras[enquete]
          .filter((c) => c.q.trim() && c.a.trim())
          .map((c) => ({ q: c.q.trim(), a: c.a.trim(), enquete })),
      );
      const clues = [...fixedClues, ...extraClues];
      const player = await save({ data: { name, deleteToken: stored?.deleteToken, clues } });
      const next = { id: player.id, name: player.name, deleteToken: player.deleteToken };
      localStorage.setItem("enquete_player", JSON.stringify(next));
      setStored(next);
      toast.success("Fiche enregistrée ! Rendez-vous le jour J pour jouer.");
    } catch {
      toast.error("Impossible d'enregistrer la fiche, réessaie.");
    } finally {
      setSaving(false);
    }
  };

  // Sur un appareil partagé, la fiche précédente reste enregistrée dans le
  // navigateur : sans ça, la personne suivante écraserait la fiche de la
  // précédente au lieu d'en créer une nouvelle.
  const startNewPlayer = () => {
    localStorage.removeItem("enquete_player");
    setStored(null);
    setName("");
    setAnswers({});
    setExtras({ lycee: [], aujourdhui: [] });
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
    enquete: Enquete,
  ) => (
    <Card className="border-l-4 border-l-investigation">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>
          Réponds à ces {REQUIRED_PER_ENQUETE} questions — {filled}/{REQUIRED_PER_ENQUETE} remplies.
        </CardDescription>
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

        {extras[enquete].length > 0 && (
          <div className="space-y-3 border-t border-dashed pt-3">
            {extras[enquete].map((c, i) => (
              <div key={c.id} className="space-y-1.5 rounded-md border border-dashed p-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">Indice bonus {i + 1}</Label>
                  <button
                    type="button"
                    aria-label="Supprimer cet indice bonus"
                    onClick={() => removeExtra(enquete, c.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  placeholder="Ta question"
                  maxLength={120}
                  value={c.q}
                  onChange={(e) => updateExtra(enquete, c.id, "q", e.target.value)}
                />
                <Input
                  placeholder="Ta réponse"
                  maxLength={300}
                  value={c.a}
                  onChange={(e) => updateExtra(enquete, c.id, "a", e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {extras[enquete].length < MAX_EXTRA_PER_ENQUETE && (
          <Button type="button" variant="ghost" size="sm" onClick={() => addExtra(enquete)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un indice bonus
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (!submissionOpen && !adminOverride) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto max-w-xl space-y-6 text-center">
          <h1
            className="font-poster-title cursor-default select-none text-3xl uppercase tracking-wide"
            onClick={secretTap}
          >
            Inscriptions closes
          </h1>
          <p className="text-muted-foreground">
            Le dépôt des fiches était ouvert jusqu'au {formatSchedule(SUBMISSION_DEADLINE)}.
            Rendez-vous sur la page jeu pour l'enquête !
          </p>
          <div className="flex justify-center gap-3">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center rounded-full border border-classified bg-classified/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-classified-foreground">
            <Fingerprint className="mr-2 h-4 w-4" />
            Dossier confidentiel
          </div>
          <h1
            className="font-poster-title cursor-default select-none text-3xl uppercase tracking-wide sm:text-4xl"
            onClick={secretTap}
          >
            Dossier d'enquête secret
          </h1>
          <p className="text-muted-foreground">
            Dépose ta fiche avant la soirée : {REQUIRED_PER_ENQUETE} indices sur tes années lycée,{" "}
            {REQUIRED_PER_ENQUETE} sur ta vie d'aujourd'hui.
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-classified-foreground">
            Dépôt ouvert jusqu'au {formatSchedule(SUBMISSION_DEADLINE)}
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
          <CardContent className="space-y-3">
            {stored && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/50 px-3 py-2 text-sm">
                <span>
                  Fiche enregistrée sur cet appareil : <strong>{stored.name}</strong>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={startNewPlayer}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ce n'est pas moi, nouvelle fiche
                </Button>
              </div>
            )}
            <div>
              <Label htmlFor="name">Mon prénom</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Ex : Chloé"
              />
            </div>
          </CardContent>
        </Card>

        {questionBlock(
          "À l'époque du lycée",
          <GraduationCap className="h-5 w-5 text-investigation" />,
          LYCEE_QUESTIONS,
          lyceeFilled,
          "lycee",
        )}
        {questionBlock(
          "Aujourd'hui",
          <Fingerprint className="h-5 w-5 text-investigation" />,
          AUJOURDHUI_QUESTIONS,
          todayFilled,
          "aujourdhui",
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
