import { COLORE_ESITO } from "@/lib/format";
import type { ClienteDerivato, Esito } from "@/lib/types";
import { Semaforo } from "./Semaforo";

interface GroupCardProps {
  nome: string;
  membri: ClienteDerivato[];
  esito: Esito;
  aperto: boolean;
  onClick: () => void;
}

// Card di una catena (stessa forma delle card cliente). Cliccandola si aprono
// le sedi in una sezione sotto la griglia.
export function GroupCard({ nome, membri, esito, aperto, onClick }: GroupCardProps) {
  const colore = COLORE_ESITO[esito];
  const nCrit = membri.filter((m) => m.esito === "CRITICO").length;
  const nWarn = membri.filter((m) => m.esito === "WARNING").length;

  const riepilogo =
    nCrit > 0
      ? `${nCrit} critic${nCrit === 1 ? "o" : "i"}${nWarn > 0 ? ` · ${nWarn} warning` : ""}`
      : nWarn > 0
        ? `${nWarn} warning`
        : "Tutto in salute";

  return (
    <button
      onClick={onClick}
      aria-expanded={aperto}
      className="text-left w-full bg-card border border-bordo p-5 transizione hover:border-taupe-chiaro focus:outline-none focus-visible:ring-2 focus-visible:ring-bordeaux"
      style={{
        borderRadius: 0,
        borderLeft: `3px solid ${colore}`,
        boxShadow: aperto ? `inset 0 0 0 1px ${colore}` : undefined,
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <Semaforo esito={esito} />
        <h3 className="cifra text-2xl text-inchiostro leading-tight truncate">{nome}</h3>
      </div>

      <p className="text-[0.82rem] text-taupe leading-snug mb-4 min-h-[2.4em]">
        {membri.length} {membri.length === 1 ? "sede" : "sedi"} · {riepilogo}
      </p>

      <div className="border-t border-bordo pt-3 flex items-center justify-between">
        <span className="etichetta text-taupe-chiaro text-[0.6rem]">
          {aperto ? "Chiudi sedi" : "Apri sedi"}
        </span>
        <span
          className="text-taupe-chiaro transizione"
          style={{ transform: aperto ? "rotate(180deg)" : "none" }}
          aria-hidden
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </button>
  );
}
