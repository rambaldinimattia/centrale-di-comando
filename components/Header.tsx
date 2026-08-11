import { formatTimestamp } from "@/lib/format";
import { RefreshButton } from "./RefreshButton";

interface HeaderProps {
  ultimaEsecuzione: string | null;
  nCritici: number;
  nWarning: number;
  fonte: "reale" | "mock";
}

export function Header({ ultimaEsecuzione, nCritici, nWarning, fonte }: HeaderProps) {
  return (
    <header className="border-b border-bordo pb-6 mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="etichetta text-taupe mb-1">One Marketing Consulting</p>
          <h1 className="cifra text-bordeaux text-5xl sm:text-6xl leading-none">
            Centrale di Comando
          </h1>
        </div>
        <RefreshButton />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-taupe">
          Ultima esecuzione Sentinella:{" "}
          <span className="text-inchiostro font-medium">
            {formatTimestamp(ultimaEsecuzione)}
          </span>
          {fonte === "mock" && (
            <span className="ml-2 inline-block px-2 py-0.5 text-[0.65rem] uppercase tracking-label bg-panel text-taupe border border-bordo">
              dati dimostrativi
            </span>
          )}
        </p>

        <div className="flex items-center gap-2">
          <Pill colore="#8E2A3C" numero={nCritici} label={nCritici === 1 ? "critico" : "critici"} />
          <Pill colore="#B67B2E" numero={nWarning} label="warning" />
        </div>
      </div>
    </header>
  );
}

function Pill({ colore, numero, label }: { colore: string; numero: number; label: string }) {
  const attivo = numero > 0;
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 border text-sm"
      style={{
        borderColor: attivo ? colore : "#DDD5C4",
        color: attivo ? colore : "#8A7E6D",
        backgroundColor: attivo ? `${colore}0F` : "transparent",
      }}
    >
      <span className="cifra text-xl" style={{ color: attivo ? colore : "#B5A992" }}>
        {numero}
      </span>
      <span className="etichetta">{label}</span>
    </span>
  );
}
