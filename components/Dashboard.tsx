"use client";

import type { DashboardResult } from "@/lib/data";
import { useMemo, useState } from "react";
import { AlertFeed } from "./AlertFeed";
import { ClientDetail } from "./ClientDetail";
import { ClientGrid } from "./ClientGrid";
import { Header } from "./Header";
import { OnboardingList } from "./OnboardingList";

export function Dashboard({ data }: { data: DashboardResult }) {
  const attivi = useMemo(() => data.clienti.filter((c) => c.attivo), [data.clienti]);
  const onboarding = useMemo(
    () => data.clienti.filter((c) => !c.attivo),
    [data.clienti]
  );

  // Selezione: default al primo cliente attivo (già ordinato per gravità)
  const [selezionato, setSelezionato] = useState<string | null>(
    attivi[0]?.cliente ?? null
  );

  const clienteSelezionato =
    attivi.find((c) => c.cliente === selezionato) ?? attivi[0] ?? null;

  return (
    <main className="mx-auto max-w-console px-4 sm:px-6 py-8 sm:py-10">
      <Header
        ultimaEsecuzione={data.ultimaEsecuzione}
        nCritici={data.nCritici}
        nWarning={data.nWarning}
        fonte={data.fonte}
      />

      {data.errore && (
        <div className="mb-6 border border-warning bg-warning/10 px-4 py-3 text-sm text-inchiostro">
          <span className="etichetta text-warning">Attenzione</span>
          <p className="mt-1">
            Impossibile leggere il Google Sheet — mostrati dati dimostrativi.
            Dettaglio tecnico: {data.errore}
          </p>
        </div>
      )}

      {/* Griglia clienti attivi, ordinata per gravità */}
      <section className="mb-10">
        <ClientGrid
          clienti={attivi}
          selezionato={clienteSelezionato?.cliente ?? null}
          onSelect={setSelezionato}
        />
      </section>

      {/* Dettaglio cliente selezionato */}
      {clienteSelezionato && (
        <section className="mb-10">
          <ClientDetail cliente={clienteSelezionato} />
        </section>
      )}

      {/* Feed alert */}
      <section className="mb-10">
        <h2 className="etichetta text-taupe mb-4">Cronologia alert</h2>
        <AlertFeed feed={data.feed} />
      </section>

      {/* Clienti in onboarding (attenuati, in fondo) */}
      {onboarding.length > 0 && <OnboardingList clienti={onboarding} />}

      <footer className="mt-14 pt-6 border-t border-bordo text-center">
        <p className="etichetta text-taupe-chiaro">
          One Marketing Consulting · Agente Sentinella
        </p>
      </footer>
    </main>
  );
}
