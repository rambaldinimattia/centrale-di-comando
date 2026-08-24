"use client";

import type { DashboardResult } from "@/lib/data";
import type { ClienteDerivato, Esito } from "@/lib/types";
import { useMemo, useState } from "react";
import { AlertFeed } from "./AlertFeed";
import { ClientCard } from "./ClientCard";
import { ClientDetail } from "./ClientDetail";
import { GroupCard } from "./GroupCard";
import { Header } from "./Header";
import { OnboardingList } from "./OnboardingList";

const RANK: Record<Esito, number> = { OK: 0, WARNING: 1, CRITICO: 2 };

// Etichette più belle per i gruppi auto-derivati dal nome (chiave → mostrato).
// La colonna `gruppo` nel foglio, se presente, ha comunque la precedenza.
const ETICHETTE_GRUPPO: Record<string, string> = {
  IC: "ITALIAN CONCEPT",
};

function etichettaGruppo(key: string): string {
  return ETICHETTE_GRUPPO[key] ?? key;
}

// Chiave di raggruppamento: la colonna `gruppo` se presente, altrimenti la
// prima parola del nome (così "EVANITE RONCADELLE" e "EVANITE PESCHIERA"
// finiscono insieme). Un gruppo con una sola sede resta una card singola.
function chiaveGruppo(c: ClienteDerivato): string {
  const g = c.config?.gruppo?.trim();
  if (g) return g;
  return c.cliente.split(" ")[0];
}

interface Blocco {
  key: string;
  membri: ClienteDerivato[];
  esito: Esito;
  gruppo: boolean;
}

function costruisciBlocchi(attivi: ClienteDerivato[]): Blocco[] {
  const mappa = new Map<string, ClienteDerivato[]>();
  for (const c of attivi) {
    const k = chiaveGruppo(c);
    if (!mappa.has(k)) mappa.set(k, []);
    mappa.get(k)!.push(c);
  }
  const blocchi: Blocco[] = Array.from(mappa.entries()).map(([key, membri]) => {
    let esito: Esito = "OK";
    for (const m of membri) if (RANK[m.esito] > RANK[esito]) esito = m.esito;
    return { key, membri, esito, gruppo: membri.length > 1 };
  });
  blocchi.sort(
    (a, b) => RANK[b.esito] - RANK[a.esito] || a.key.localeCompare(b.key, "it")
  );
  return blocchi;
}

export function Dashboard({ data }: { data: DashboardResult }) {
  const attivi = useMemo(() => data.clienti.filter((c) => c.attivo), [data.clienti]);
  const blocchi = useMemo(() => costruisciBlocchi(attivi), [attivi]);
  const onboarding = useMemo(
    () => data.clienti.filter((c) => !c.attivo),
    [data.clienti]
  );

  // Selezione: default al primo cliente attivo (già ordinato per gravità)
  const [selezionato, setSelezionato] = useState<string | null>(
    attivi[0]?.cliente ?? null
  );

  // Catena aperta (le sue sedi si mostrano sotto la griglia)
  const [gruppoAperto, setGruppoAperto] = useState<string | null>(null);
  const bloccoAperto = blocchi.find((b) => b.gruppo && b.key === gruppoAperto) ?? null;

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

      {/* Griglia clienti attivi: card uniformi (singoli + catene), per gravità */}
      <section className="mb-8">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {blocchi.map((b) =>
            b.gruppo ? (
              <GroupCard
                key={b.key}
                nome={etichettaGruppo(b.key)}
                membri={b.membri}
                esito={b.esito}
                aperto={gruppoAperto === b.key}
                onClick={() =>
                  setGruppoAperto((g) => (g === b.key ? null : b.key))
                }
              />
            ) : (
              <ClientCard
                key={b.key}
                cliente={b.membri[0]}
                selezionato={clienteSelezionato?.cliente === b.membri[0].cliente}
                onClick={() => setSelezionato(b.membri[0].cliente)}
              />
            )
          )}
        </div>
      </section>

      {/* Sedi della catena aperta */}
      {bloccoAperto && (
        <section className="mb-10 border-l-2 border-bordo pl-4 sm:pl-5">
          <h2 className="etichetta text-taupe mb-4">
            Sedi · {etichettaGruppo(bloccoAperto.key)}
          </h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {bloccoAperto.membri.map((m) => (
              <ClientCard
                key={m.cliente}
                cliente={m}
                selezionato={clienteSelezionato?.cliente === m.cliente}
                onClick={() => setSelezionato(m.cliente)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Dettaglio cliente selezionato */}
      {clienteSelezionato && (
        <section className="mb-10">
          <ClientDetail cliente={clienteSelezionato} />
        </section>
      )}

      {/* Feed alert (titolo + selettore periodo gestiti dentro AlertFeed) */}
      <section className="mb-10">
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
