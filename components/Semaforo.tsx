import { COLORE_ESITO } from "@/lib/format";
import type { Esito } from "@/lib/types";

// Pallino semaforo pieno con anello sottile
export function Semaforo({ esito, size = 12 }: { esito: Esito; size?: number }) {
  const colore = COLORE_ESITO[esito];
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundColor: colore,
        boxShadow: `0 0 0 3px ${colore}22`,
        display: "inline-block",
        borderRadius: "9999px",
        flexShrink: 0,
      }}
    />
  );
}
