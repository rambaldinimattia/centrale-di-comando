import { formatEuro, formatNumero } from "@/lib/format";
import type { ClienteDerivato, PuntoStorico } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Funnel end-to-end (ultimi 7 giorni): Spesa → Lead → Appuntamenti.
// Mostra i tassi di conversione fra gli stadi ed evidenzia DOVE si rompe
// la catena, con la causa probabile. È la vista diagnostica: invece di
// leggere 10 semafori, vedi subito in quale punto il cliente perde valore.
// Finestra fissa a 7 giorni perché è quella dei dati CRM (lead/appuntamenti).
// ─────────────────────────────────────────────────────────────

const BORDEAUX = "#5C1A28";
const WARNING = "#B67B2E";
const CRITICO = "#8E2A3C";
const OK = "#4A6B4F";

function somma(dati: PuntoStorico[], campo: "lead" | "spesa"): number {
  return dati.reduce((s, p) => s + (p[campo] ?? 0), 0);
}

// Soglie: sotto il 10% lead→appuntamento è un collo di bottiglia da guardare.
const SOGLIA_APPUNT = 0.1;
// Meta che traccia oltre il 20% in più del CRM = possibile perdita in ingresso.
const SOGLIA_TRACCIAMENTO = 1.2;

interface Rottura {
  dove: "spesa-lead" | "lead-appunt";
  causa: string;
  gravita: "WARNING" | "CRITICO";
}

export function Funnel({ cliente }: { cliente: ClienteDerivato }) {
  const storico7 = (cliente.storico ?? []).slice(-7);
  const spesa7 = somma(storico7, "spesa");
  const metaLead7 = somma(storico7, "lead");
  const crmLead7 = cliente.leadCrm; // già su 7 giorni
  const usaCrm = crmLead7 != null;
  const lead7 = usaCrm ? crmLead7! : metaLead7;
  const appunt7 = cliente.appuntamenti?.prenotati7 ?? null;

  // Serve almeno spesa o lead per avere senso
  if (spesa7 <= 0 && lead7 <= 0) return null;

  const cpl = lead7 > 0 ? spesa7 / lead7 : null;
  const convAppunt = appunt7 != null && lead7 > 0 ? appunt7 / lead7 : null;

  // Dove si rompe la catena? (dalla più grave)
  let rottura: Rottura | null = null;
  if (spesa7 > 0 && lead7 === 0) {
    rottura = {
      dove: "spesa-lead",
      gravita: "CRITICO",
      causa:
        "Spesa senza lead: controlla tracciamento (Pixel/CAPI) e form, o l'erogazione delle campagne.",
    };
  } else if (convAppunt != null && convAppunt < SOGLIA_APPUNT && appunt7 === 0) {
    rottura = {
      dove: "lead-appunt",
      gravita: "CRITICO",
      causa:
        "Lead che non diventano appuntamenti: velocità di risposta, nurturing o qualità dei lead.",
    };
  } else if (convAppunt != null && convAppunt < SOGLIA_APPUNT) {
    rottura = {
      dove: "lead-appunt",
      gravita: "WARNING",
      causa: "Pochi appuntamenti sui lead: rivedi follow-up, nurturing e offerta.",
    };
  }

  // Nota tracciamento: Meta vede molti più lead di quelli arrivati nel CRM
  const perditaTracciamento =
    usaCrm && crmLead7! > 0 && metaLead7 > crmLead7! * SOGLIA_TRACCIAMENTO;

  const nodi: NodoProps[] = [
    { label: "Spesa 7g", valore: formatEuro(spesa7), tenue: true },
    {
      label: usaCrm ? "Lead reali · CRM" : "Lead · Meta",
      valore: formatNumero(lead7),
      sub: usaCrm ? `Meta: ${formatNumero(metaLead7)}` : undefined,
    },
  ];
  if (appunt7 != null) {
    nodi.push({ label: "Appuntamenti 7g", valore: formatNumero(appunt7) });
  }

  // Metriche sulle frecce (fra i nodi)
  const frecce: FrecciaProps[] = [
    {
      etichetta: cpl != null ? `CPL ${formatEuro(cpl)}` : "—",
      evidenzia: rottura?.dove === "spesa-lead" ? rottura.gravita : null,
    },
  ];
  if (appunt7 != null) {
    frecce.push({
      etichetta: convAppunt != null ? `${Math.round(convAppunt * 100)}%` : "—",
      evidenzia: rottura?.dove === "lead-appunt" ? rottura.gravita : null,
    });
  }

  return (
    <div className="px-6 py-5 border-t border-bordo">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
        <p className="etichetta text-taupe">Funnel · ultimi 7 giorni</p>
        {!rottura && (
          <span className="etichetta text-[0.6rem]" style={{ color: OK }}>
            Catena in salute
          </span>
        )}
      </div>

      {/* Catena: nodi + frecce. Colonna su mobile, riga su desktop. */}
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-2">
        {nodi.map((n, i) => (
          <div key={n.label} className="contents">
            <Nodo {...n} />
            {i < frecce.length && <Freccia {...frecce[i]} />}
          </div>
        ))}
      </div>

      {perditaTracciamento && (
        <p className="text-[0.72rem] mt-3 leading-relaxed" style={{ color: WARNING }}>
          Meta traccia {formatNumero(metaLead7)} lead ma nel CRM ne risultano{" "}
          {formatNumero(crmLead7!)}: possibile perdita in ingresso (form o integrazione GHL).
        </p>
      )}

      {rottura && (
        <div
          className="mt-3 pl-3 py-2"
          style={{ borderLeft: `2px solid ${rottura.gravita === "CRITICO" ? CRITICO : WARNING}` }}
        >
          <p
            className="etichetta mb-1"
            style={{ color: rottura.gravita === "CRITICO" ? CRITICO : WARNING }}
          >
            Dove si rompe · {rottura.dove === "spesa-lead" ? "Spesa → Lead" : "Lead → Appuntamenti"}
          </p>
          <p className="text-[0.72rem] text-inchiostro leading-relaxed">{rottura.causa}</p>
        </div>
      )}
    </div>
  );
}

interface NodoProps {
  label: string;
  valore: string;
  sub?: string;
  tenue?: boolean;
}

function Nodo({ label, valore, sub, tenue }: NodoProps) {
  return (
    <div
      className="flex-1 min-w-0 bg-panel px-4 py-3 text-center"
      style={{ borderTop: `2px solid ${tenue ? "#DDD5C4" : BORDEAUX}` }}
    >
      <p className="etichetta text-taupe mb-1 text-[0.6rem]">{label}</p>
      <p className="cifra text-2xl" style={{ color: tenue ? "#8A6A52" : BORDEAUX }}>
        {valore}
      </p>
      {sub && <p className="text-[0.62rem] text-taupe-chiaro mt-0.5">{sub}</p>}
    </div>
  );
}

interface FrecciaProps {
  etichetta: string;
  evidenzia: "WARNING" | "CRITICO" | null;
}

function Freccia({ etichetta, evidenzia }: FrecciaProps) {
  const colore = evidenzia === "CRITICO" ? CRITICO : evidenzia === "WARNING" ? WARNING : "#8A7E6D";
  return (
    <div className="flex sm:flex-col items-center justify-center gap-1 px-1 shrink-0">
      {/* Freccia: giù su mobile, destra su desktop */}
      <svg
        className="rotate-90 sm:rotate-0"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={colore}
        strokeWidth="2"
        aria-hidden
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
      <span
        className="etichetta text-[0.58rem] whitespace-nowrap"
        style={{ color: colore, fontWeight: evidenzia ? 600 : 500 }}
      >
        {etichetta}
      </span>
    </div>
  );
}
