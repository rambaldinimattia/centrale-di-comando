"use client";

import { COLORE_ESITO } from "@/lib/format";
import type { ClienteDerivato, Esito } from "@/lib/types";
import { useState } from "react";
import { ClientCard } from "./ClientCard";
import { Semaforo } from "./Semaforo";

interface BrandGroupProps {
  nome: string;
  membri: ClienteDerivato[];
  esito: Esito;
  selezionato: string | null;
  onSelect: (nome: string) => void;
  className?: string;
}

// Blocco collassabile per una catena (es. tutti i saloni "Evanitè").
export function BrandGroup({
  nome,
  membri,
  esito,
  selezionato,
  onSelect,
  className,
}: BrandGroupProps) {
  const contieneSelezionato = membri.some((m) => m.cliente === selezionato);
  const [aperto, setAperto] = useState(contieneSelezionato);

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
    <div className={className}>
      <button
        onClick={() => setAperto((v) => !v)}
        aria-expanded={aperto}
        className="w-full text-left bg-card border border-bordo px-5 py-4 flex items-center gap-3 transizione hover:border-taupe-chiaro focus:outline-none focus-visible:ring-2 focus-visible:ring-bordeaux"
        style={{ borderRadius: 0, borderLeft: `3px solid ${colore}` }}
      >
        <Semaforo esito={esito} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h3 className="cifra text-2xl text-inchiostro leading-none">{nome}</h3>
            <span className="etichetta text-taupe-chiaro text-[0.6rem]">
              {membri.length} {membri.length === 1 ? "sede" : "sedi"}
            </span>
          </div>
          <p className="text-[0.8rem] text-taupe mt-1" style={{ color: nCrit > 0 ? "#8E2A3C" : undefined }}>
            {riepilogo}
          </p>
        </div>
        <span
          className="text-taupe-chiaro transizione shrink-0"
          style={{ transform: aperto ? "rotate(180deg)" : "none" }}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {aperto && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4 pl-0 sm:pl-4">
          {membri.map((m) => (
            <ClientCard
              key={m.cliente}
              cliente={m}
              selezionato={selezionato === m.cliente}
              onClick={() => onSelect(m.cliente)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
