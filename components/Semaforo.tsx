import { COLORE_ESITO } from "@/lib/format";
import type { Esito } from "@/lib/types";
import type { CSSProperties } from "react";

// Terne RGB dei colori di stato, per il "respiro" del pallino (vedi .cdc-pulse)
const RGB: Record<Esito, string> = { OK: "74,107,79", WARNING: "182,123,46", CRITICO: "142,42,60" };

// Pallino semaforo pieno con anello sottile. I critici "respirano" piano,
// così si notano per primi senza bisogno di altro testo.
export function Semaforo({ esito, size = 12 }: { esito: Esito; size?: number }) {
  const colore = COLORE_ESITO[esito];
  return (
    <span
      aria-hidden
      className={esito === "CRITICO" ? "cdc-pulse" : undefined}
      style={
        {
          width: size,
          height: size,
          backgroundColor: colore,
          boxShadow: `0 0 0 3px ${colore}22`,
          display: "inline-block",
          borderRadius: "9999px",
          flexShrink: 0,
          "--cdc-pulse": RGB[esito],
        } as CSSProperties
      }
    />
  );
}
