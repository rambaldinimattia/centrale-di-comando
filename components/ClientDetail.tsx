import {
  COLORE_ESITO,
  LABEL_ESITO,
  formatEuro,
  formatNumero,
} from "@/lib/format";
import type { ClienteDerivato } from "@/lib/types";
import { HistoryChart } from "./HistoryChart";
import { Semaforo } from "./Semaforo";

export function ClientDetail({ cliente }: { cliente: ClienteDerivato }) {
  const colore = COLORE_ESITO[cliente.esito];
  const tetto = cliente.config?.spesa_max_giorno ?? null;
  const baselineLead = cliente.checks.find((c) => c.check === "volume_lead")?.baseline;

  const spesaOltre =
    tetto != null && cliente.spesaIeri != null && cliente.spesaIeri > tetto;

  return (
    <section className="bg-card border border-bordo" style={{ borderRadius: 0 }}>
      {/* Intestazione dettaglio */}
      <div
        className="flex items-center gap-3 px-6 py-5 border-b border-bordo"
        style={{ borderLeft: `3px solid ${colore}` }}
      >
        <Semaforo esito={cliente.esito} size={14} />
        <div>
          <h2 className="cifra text-3xl text-inchiostro leading-none">
            {cliente.cliente}
          </h2>
          <p className="etichetta mt-1" style={{ color: colore }}>
            {LABEL_ESITO[cliente.esito]}
          </p>
        </div>
        {cliente.config?.ad_account_id && (
          <p className="ml-auto text-xs text-taupe-chiaro font-mono hidden sm:block">
            {cliente.config.ad_account_id}
          </p>
        )}
      </div>

      {/* 4 metric card */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-bordo">
        <MetricCard
          label="Spesa ieri"
          valore={formatEuro(cliente.spesaIeri)}
          sotto={
            tetto != null
              ? `Tetto ${formatEuro(tetto)}`
              : "Nessun tetto impostato"
          }
          allarme={spesaOltre}
        />
        <MetricCard
          label="Lead ieri"
          valore={formatNumero(cliente.leadIeri)}
          sotto={
            baselineLead ? `Baseline ${baselineLead}` : "Baseline non disponibile"
          }
        />
        <MetricCard
          label="CPL periodo"
          valore={cliente.cpl != null ? formatEuro(cliente.cpl) : "n/d"}
          sotto={cliente.cpl != null ? "Media 7 giorni" : "Nessun lead nel periodo"}
          na={cliente.cpl == null}
        />
        <MetricCard
          label="Campagne"
          valore={
            cliente.campagneAttive != null
              ? `${cliente.campagneAttive}${
                  cliente.campagneProblemi != null
                    ? ` / ${cliente.campagneProblemi}`
                    : ""
                }`
              : "non monitorato"
          }
          sotto={
            cliente.campagneAttive != null
              ? "Attive / con problemi"
              : "In attesa dalla Sentinella"
          }
          allarme={(cliente.campagneProblemi ?? 0) > 0}
          na={cliente.campagneAttive == null}
        />
      </div>

      {/* Grafico storico 7gg */}
      <div className="px-6 py-6 border-t border-bordo">
        <p className="etichetta text-taupe mb-4">Andamento 7 giorni</p>
        <HistoryChart dati={cliente.storico7gg} />
      </div>
    </section>
  );
}

function MetricCard({
  label,
  valore,
  sotto,
  allarme = false,
  na = false,
}: {
  label: string;
  valore: string;
  sotto: string;
  allarme?: boolean;
  na?: boolean;
}) {
  return (
    <div className="bg-panel px-5 py-5">
      <p className="etichetta text-taupe mb-2">{label}</p>
      {na ? (
        // Dato non disponibile: reso in stile attenuato, non come numero grande
        <p className="mb-1.5 text-lg text-taupe-chiaro italic leading-none py-2">
          {valore}
        </p>
      ) : (
        <p
          className="cifra text-4xl mb-1.5"
          style={{ color: allarme ? "#8E2A3C" : "#5C1A28" }}
        >
          {valore}
        </p>
      )}
      <p
        className="text-[0.72rem] text-taupe"
        style={{ color: allarme && !na ? "#8E2A3C" : undefined }}
      >
        {sotto}
      </p>
    </div>
  );
}
