import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileSearch, Fingerprint, Printer, RotateCcw, Search } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Dossier d'enquête secret" },
      { name: "description", content: "Un jeu d'enquête à remplir anonymement entre amis." },
      { property: "og:title", content: "Dossier d'enquête secret" },
      {
        property: "og:description",
        content: "Un jeu d'enquête à remplir anonymement entre amis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const initialForm = {
  surnom: "",
  pireLook: "",
  souvenir: "",
  musique: "",
  localisation: "",
  metier: "",
  passion: "",
  accomplissement: "",
  mot1: "",
  mot2: "",
  mot3: "",
  enqueteur: "",
  suspect: "",
  verdict: "",
};

function Index() {
  const [form, setForm] = useState(initialForm);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const filledCount = Object.values(form).filter(Boolean).length;
  const totalFields = Object.keys(form).length;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground md:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="relative space-y-4 text-center">
          <div className="pointer-events-none absolute inset-0 -z-10 flex select-none items-center justify-center opacity-[0.04]">
            <span className="rotate-[-12deg] border-4 border-current px-6 py-3 text-4xl font-black uppercase tracking-widest text-investigation md:text-6xl">
              Confidentiel
            </span>
          </div>

          <div className="inline-flex items-center justify-center rounded-full border border-classified bg-classified/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-classified-foreground">
            <Fingerprint className="mr-2 h-4 w-4" />
            Enquête n° 001
          </div>

          <h1 className="flex items-center justify-center gap-3 text-3xl font-bold tracking-tight md:text-4xl">
            <Search className="h-8 w-8 text-investigation md:h-10 md:w-10" />
            DOSSIER D'ENQUÊTE SECRET
            <Fingerprint className="h-8 w-8 text-classified-foreground md:h-10 md:w-10" />
          </h1>

          <p className="text-muted-foreground">
            À remplir anonymement et avec honnêteté !
          </p>

          <div className="mx-auto h-1 w-24 rounded-full bg-investigation/30" />
        </header>

        <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>Indices collectés : {filledCount}/{totalFields}</span>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-investigation transition-all duration-500"
              style={{ width: `${(filledCount / totalFields) * 100}%` }}
            />
          </div>
        </div>

        <section className="space-y-6">
          <Card className="border-l-4 border-l-investigation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileSearch className="h-5 w-5 text-investigation" />
                SECTION 1 : LE PASSÉ
              </CardTitle>
              <CardDescription>L'époque où on s'est connus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Mon surnom ou mon principal trait de caractère à l'époque"
                value={form.surnom}
                onChange={update("surnom")}
              />
              <Field
                label="Mon pire look vestimentaire ou ma pire coupe de cheveux de l'époque"
                value={form.pireLook}
                onChange={update("pireLook")}
              />
              <Field
                label="Un souvenir marquant ou une bêtise faite ensemble"
                value={form.souvenir}
                onChange={update("souvenir")}
                textarea
              />
              <Field
                label="La chanson ou le style de musique que j'écoutais en boucle"
                value={form.musique}
                onChange={update("musique")}
              />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-investigation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Search className="h-5 w-5 text-investigation" />
                SECTION 2 : LE PRÉSENT
              </CardTitle>
              <CardDescription>Ce que je suis devenu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Ma situation géographique actuelle (région ou ville)"
                value={form.localisation}
                onChange={update("localisation")}
              />
              <Field
                label="Mon métier actuel (ou le domaine)"
                value={form.metier}
                onChange={update("metier")}
              />
              <Field
                label="Ma plus grande passion ou mon loisir du moment"
                value={form.passion}
                onChange={update("passion")}
              />
              <Field
                label="Une chose incroyable / insolite que j'ai accomplie depuis tout ce temps"
                value={form.accomplissement}
                onChange={update("accomplissement")}
                textarea
              />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-classified">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Fingerprint className="h-5 w-5 text-classified-foreground" />
                SECTION 3 : L'INDICE BONUS
              </CardTitle>
              <CardDescription>3 mots pour me décrire aujourd'hui</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="1." value={form.mot1} onChange={update("mot1")} />
                <Field label="2." value={form.mot2} onChange={update("mot2")} />
                <Field label="3." value={form.mot3} onChange={update("mot3")} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-investigation bg-investigation/[0.02]">
            <CardHeader>
              <CardTitle className="text-xl uppercase tracking-wide text-investigation">
                [Réservé à l'enquêteur]
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Nom de l'enquêteur"
                value={form.enqueteur}
                onChange={update("enqueteur")}
              />
              <Field
                label="Mon suspect principal"
                value={form.suspect}
                onChange={update("suspect")}
              />
              <Field
                label="Verdict final (Vrai nom de la personne)"
                value={form.verdict}
                onChange={update("verdict")}
              />
            </CardContent>
          </Card>
        </section>

        <footer className="flex flex-col items-center gap-4 border-t border-border pt-8 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Bonne chance, détective.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setForm(initialForm)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Recommencer
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer le dossier
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  textarea?: boolean;
}) {
  const inputId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="font-medium leading-snug">
        {label}
      </Label>
      {textarea ? (
        <Textarea
          id={inputId}
          value={value}
          onChange={onChange}
          rows={3}
          placeholder="Rédiger l'indice ici..."
        />
      ) : (
        <Input
          id={inputId}
          value={value}
          onChange={onChange}
          placeholder="Rédiger l'indice ici..."
        />
      )}
    </div>
  );
}
