import { COLORE_ESITO, checkLabel, formatEuro, formatNumero } from "@/lib/format";
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
        <ChipEsito esito={cliente.esito} />
        {statoTesto}
      </p>

      <div className="grid grid-cols-3 gap-2 border-t border-bordo pt-3">
        <MiniStat label="Spesa ieri" valore={formatEuro(cliente.spesaIeri)} />
        <MiniStat label="Lead ieri" valore={formatNumero(cliente.leadIeri)} />
        <MiniStat label="CPL" valore={cliente.cpl != null ? formatEuro(cliente.cpl) : "—"} />
      </div>
    </button>
  );
}

// Etichetta compatta per la chip di severità (segnale non solo cromatico)
const CHIP_LABEL: Record<Esito, string> = {
  OK: "In salute",
  WARNING: "Warning",
  CRITICO: "Critico",
};

// Chip di stato: visibile solo per warning/critico (le card verdi restano pulite);
// per lo stato OK resta un'etichetta per gli screen reader.
function ChipEsito({ esito }: { esito: Esito }) {
  if (esito === "OK") return <span className="sr-only">In salute</span>;
  const colore = COLORE_ESITO[esito];
  return (
    <span
      className="etichetta align-middle mr-2 px-1.5 py-0.5 text-[0.58rem] border whitespace-nowrap"
      style={{ color: colore, borderColor: colore, backgroundColor: `${colore}12` }}
    >
      {CHIP_LABEL[esito]}
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
