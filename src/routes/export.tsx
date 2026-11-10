import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getAllPlayerCards } from "@/lib/game.functions";

export const Route = createFileRoute("/export")({
  component: ExportPage,
  head: () => ({
    meta: [{ title: "Export des fiches — Dossier d'enquête secret" }],
  }),
});

function ExportPage() {
  const fetchCards = useServerFn(getAllPlayerCards);
  const [admin, setAdmin] = useState(false);
  const taps = useRef(0);

  const { data, isLoading } = useQuery({
    queryKey: ["all-cards"],
    queryFn: () => fetchCards(),
    enabled: admin,
  });
  const cards = data ?? [];

  const secretTap = () => {
    taps.current += 1;
    if (taps.current >= 3) {
      setAdmin(true);
      toast.success("Mode organisateur activé");
    }
  };

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 text-center">
        <div>
          <h1
            className="cursor-default select-none text-2xl font-semibold text-neutral-800"
            onClick={secretTap}
          >
            Export des fiches
          </h1>
          <p className="mt-2 text-sm text-neutral-500">Réservé à l'organisateur.</p>
          <Button asChild variant="outline" className="mt-6 print:hidden">
            <Link to="/classement">Retour</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-6 py-10 text-neutral-900 print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl space-y-10 print:max-w-none">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-semibold">Export des fiches</h1>
            <p className="text-sm text-neutral-500">
              {isLoading ? "Chargement..." : `${cards.length} fiche(s)`} — une fiche par page à
              l'impression.
            </p>
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer / Enregistrer en PDF
          </Button>
        </div>

        {cards.length === 0 && !isLoading && (
          <p className="text-neutral-500">Aucune fiche à exporter.</p>
        )}

        {cards.map((p) => (
          <article
            key={p.id}
            className="break-after-page rounded-lg border border-neutral-200 p-8 print:break-after-page print:rounded-none print:border-none print:p-0"
          >
            <h2 className="mb-6 text-3xl font-bold tracking-tight">{p.name}</h2>

            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Lycée
              </h3>
              <dl className="space-y-2">
                {p.lycee.map((c) => (
                  <div key={c.q}>
                    <dt className="text-sm text-neutral-500">{c.q}</dt>
                    <dd className="text-base font-medium">{c.a}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Aujourd'hui
              </h3>
              <dl className="space-y-2">
                {p.aujourdhui.map((c) => (
                  <div key={c.q}>
                    <dt className="text-sm text-neutral-500">{c.q}</dt>
                    <dd className="text-base font-medium">{c.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </article>
        ))}
      </div>
    </div>
  );
}
