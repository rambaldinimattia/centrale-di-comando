"use client";

import { parseTs } from "@/lib/derive";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

// Oltre questa soglia senza un giro nuovo la Sentinella è "in ritardo": gira
// ogni mattina, quindi 26 ore lasciano margine per un giro un po' tardivo.
const SOGLIA_ORE = 26;

// Indicatore vivo nell'intestazione: pallino verde che respira se i dati sono
// freschi, arancio fisso se l'ultimo giro è troppo vecchio (workflow fermo,
// righe non lette…). Calcolato solo nel browser: dipende dall'ora corrente,
// e calcolarlo anche sul server darebbe un risultato diverso all'idratazione.
export function StatoSentinella({ ultimaEsecuzione }: { ultimaEsecuzione: string | null }) {
  const [ore, setOre] = useState<number | null>(null);

  useEffect(() => {
    const d = ultimaEsecuzione ? parseTs(ultimaEsecuzione) : null;
    setOre(d ? (Date.now() - d.getTime()) / 3_600_000 : null);
  }, [ultimaEsecuzione]);

  if (ore == null) return null;
  const inRitardo = ore > SOGLIA_ORE;
  const colore = inRitardo ? "#B67B2E" : "#4A6B4F";
  const ritardo = ore < 48 ? `${Math.floor(ore)} ore` : `${Math.floor(ore / 24)} giorni`;

  return (
    <span className="inline-flex items-center gap-2 mr-3 align-middle">
      <span
        aria-hidden
        className={inRitardo ? undefined : "cdc-pulse"}
        style={
          {
            width: 8,
            height: 8,
            borderRadius: 9999,
            backgroundColor: colore,
            display: "inline-block",
            "--cdc-pulse": "74,107,79",
          } as CSSProperties
        }
      />
      <span className="etichetta text-[0.62rem]" style={{ color: colore }}>
        {inRitardo ? `In ritardo · nessun giro da ${ritardo}` : "Sentinella attiva"}
      </span>
    </span>
  );
}
