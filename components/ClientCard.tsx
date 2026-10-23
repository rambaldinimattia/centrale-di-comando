import {
  COLORE_ESITO,
  ESITO_BREVE,
  checkLabel,
  formatDurataAllarme,
  formatEuro,
  formatNumero,
} from "@/lib/format";
import type { ClienteDerivato, Esito } from "@/lib/types";
import { Semaforo } from "./Semaforo";

interface ClientCardProps {
  cliente: ClienteDerivato;
  selezionato: boolean;
  onClick: () => void;
}

export function ClientCard({ cliente, selezionato, onClick }: ClientCardProps) {
  const colore = COLORE_ESITO[cliente.esito];
  const statoTesto = cliente.checkPeggiore
    ? `${checkLabel(cliente.checkPeggiore.check)} — ${cliente.checkPeggiore.dettaglio}`
    : "Nessun dato disponibile";

  return (
    <button
      onClick={onClick}
      aria-pressed={selezionato}
      className="text-left w-full bg-card border border-bordo p-5 transizione hover:border-taupe-chiaro focus:outline-none focus-visible:ring-2 focus-visible:ring-bordeaux"
      style={{
        borderRadius: 0,
        borderLeft: `3px solid ${colore}`,
        boxShadow: selezionato ? `inset 0 0 0 1px ${colore}` : undefined,
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <Semaforo esito={cliente.esito} />
        <h3 className="cifra text-2xl text-inchiostro leading-tight truncate">
          {cliente.cliente}
        </h3>
      </div>

      <p className="text-[0.82rem] text-taupe leading-snug mb-4 line-clamp-2 min-h-[2.4em]">
        <StatoDurata esito={cliente.esito} giorni={cliente.giorniAllarme} />
        {statoTesto}
      </p>

      <div className="border-t border-bordo pt-3">
        {cliente.spesaIeri == null && cliente.leadIeri == null && cliente.leadCrm != null ? (
          // Cliente solo-CRM (nessun dato Meta): meglio il lead reale che tre "—"
          <MiniStat label="Lead CRM · 7g" valore={formatNumero(cliente.leadCrm)} />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Spesa ieri" valore={formatEuro(cliente.spesaIeri)} />
            <MiniStat label="Lead ieri" valore={formatNumero(cliente.leadIeri)} />
            <MiniStat label="CPL" valore={cliente.cpl != null ? formatEuro(cliente.cpl) : "—"} />
          </div>
        )}
      </div>
    </button>
  );
}

// In allarme: "Critico da 4 giorni · " nel colore della gravità, prima dello
// stato. In salute: nessuna resa visibile, solo l'etichetta per gli screen
// reader (pallino e bordo, che comunicano lo stato, sono aria-hidden).
function StatoDurata({ esito, giorni }: { esito: Esito; giorni: number | null }) {
  if (esito === "OK" || giorni == null) {
    return <span className="sr-only">{ESITO_BREVE[esito]} </span>;
  }
  return (
    <span className="font-medium" style={{ color: COLORE_ESITO[esito] }}>
      {ESITO_BREVE[esito]} {formatDurataAllarme(giorni)} ·{" "}
    </span>
  );
}

function MiniStat({ label, valore }: { label: string; valore: string }) {
  return (
    <div>
      <p className="etichetta text-taupe-chiaro mb-1 text-[0.6rem]">{label}</p>
      <p className="cifra text-lg text-bordeaux">{valore}</p>
    </div>
  );
}
