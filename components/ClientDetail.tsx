"use client";

import {
  COLORE_ESITO,
  LABEL_ESITO,
  formatDecimale,
  formatEuro,
  formatNumero,
} from "@/lib/format";
import type { ClienteDerivato, PuntoStorico } from "@/lib/types";
import { useState } from "react";
import { HistoryChart } from "./HistoryChart";
import { Semaforo } from "./Semaforo";

type Periodo = "24h" | "7g" | "30g";

const PERIODI: { k: Periodo; label: string }[] = [
  { k: "24h", label: "24 ore" },
  { k: "7g", label: "7 giorni" },
  { k: "30g", label: "30 giorni" },
];

function somma(dati: PuntoStorico[], campo: "lead" | "spesa"): number {
  return dati.reduce((s, p) => s + (p[campo] ?? 0), 0);
}

// Baseline lead (attesi/giorno) da stringa dello Sheet: "0,7" → 0.7
function parseBaseline(raw: string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Formatta la baseline: intero senza decimali, altrimenti una cifra decimale
function fmtBaseline(n: number): string {
  return n % 1 === 0 ? formatNumero(n) : formatDecimale(n);
}

export function ClientDetail({ cliente }: { cliente: ClienteDerivato }) {
  const [periodo, setPeriodo] = useState<Periodo>("24h");

  const colore = COLORE_ESITO[cliente.esito];
  const tetto = cliente.config?.spesa_max_giorno ?? null;
  const baselineLead = cliente.checks.find((c) => c.check === "volume_lead")?.baseline;

  const storico = cliente.storico ?? [];
  // Finestra per grafico e aggregazioni: 30g mostra 30 punti, 24h/7g mostrano 7
  const finestraGrafico = periodo === "30g" ? storico.slice(-30) : storico.slice(-7);

  // Metriche in base al periodo scelto
  let spesa: number | null;
  let lead: number | null;
  let cpl: number | null;
  if (periodo === "24h") {
    spesa = cliente.spesaIeri;
    lead = cliente.leadIeri;
    cpl = cliente.cpl;
  } else {
    const w = periodo === "30g" ? storico.slice(-30) : storico.slice(-7);
    spesa = somma(w, "spesa");
    lead = somma(w, "lead");
    cpl = lead > 0 ? spesa / lead : null;
  }

  const spesaOltre = periodo === "24h" && tetto != null && spesa != null && spesa > tetto;

  const suffisso = periodo === "24h" ? "ieri" : periodo === "7g" ? "7 giorni" : "30 giorni";
  const giorniGrafico = periodo === "30g" ? 30 : 7;
  const giorniPeriodo = periodo === "24h" ? 1 : periodo === "7g" ? 7 : 30;

  // Baseline lead scalata sul periodo: la Sentinella scrive gli attesi/giorno,
  // qui li moltiplichiamo per i giorni del periodo così sono confrontabili col totale.
  const baselineLeadNum = parseBaseline(baselineLead);
  const baselinePeriodo =
    baselineLeadNum != null ? Math.round(baselineLeadNum * giorniPeriodo * 10) / 10 : null;
  const baselineLabel =
    baselinePeriodo == null
      ? "Baseline non disponibile"
      : periodo === "24h"
        ? `Baseline ${fmtBaseline(baselinePeriodo)}`
        : `Baseline ~${fmtBaseline(baselinePeriodo)} (${giorniPeriodo} gg)`;

  return (
    <section className="bg-card border border-bordo" style={{ borderRadius: 0 }}>
      {/* Intestazione dettaglio */}
      <div
        className="flex items-center gap-3 px-6 py-5 border-b border-bordo"
        style={{ borderLeft: `3px solid ${colore}` }}
      >
        <Semaforo esito={cliente.esito} size={14} />
        <div>
          <h2 className="cifra text-3xl text-inchiostro leading-none">{cliente.cliente}</h2>
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

      {/* Selettore periodo */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-bordo flex-wrap">
        <span className="etichetta text-taupe-chiaro">Periodo</span>
        <SelettorePeriodo valore={periodo} onChange={setPeriodo} />
      </div>

      {/* 4 metric card */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-bordo">
        <MetricCard
          label={`Spesa ${suffisso}`}
          valore={formatEuro(spesa)}
          sotto={
            periodo === "24h"
              ? tetto != null
                ? `Tetto ${formatEuro(tetto)}`
                : "Nessun tetto impostato"
              : "Totale periodo"
          }
          allarme={spesaOltre}
        />
        <MetricCard label={`Lead ${suffisso}`} valore={formatNumero(lead)} sotto={baselineLabel} />
        <MetricCard
          label={`CPL ${suffisso}`}
          valore={cpl != null ? formatEuro(cpl) : "n/d"}
          sotto={
            cpl != null
              ? periodo === "24h"
                ? "Costo per lead"
                : "Media del periodo"
              : "Nessun lead nel periodo"
          }
          na={cpl == null}
        />
        <MetricCard
          label="Campagne con problemi"
          valore={
            cliente.campagneProblemi != null
              ? formatNumero(cliente.campagneProblemi)
              : "non monitorato"
          }
          sotto={
            cliente.campagneProblemi == null
              ? "In attesa dalla Sentinella"
              : cliente.campagneProblemi > 0
                ? "Da verificare su Meta"
                : "Nessun problema di delivery"
          }
          allarme={(cliente.campagneProblemi ?? 0) > 0}
          na={cliente.campagneProblemi == null}
        />
      </div>

      {/* CRM (GoHighLevel) — lead reali dal tag; segue il periodo scelto */}
      {cliente.leadCrm != null &&
        (() => {
          // Senza tag lead configurato il conteggio è sempre 0: mostrarlo come
          // "0 lead" sarebbe fuorviante. Meglio segnalare che va impostato il tag.
          const tagConfigurato = Boolean(cliente.config?.ghl_tag_lead?.trim());
          if (!tagConfigurato) {
            const metaLead7 = somma(storico.slice(-7), "lead");
            return (
              <div className="px-6 py-4 border-t border-bordo bg-panel/40">
                <p className="etichetta text-taupe mb-2">Lead reali · CRM (GoHighLevel)</p>
                <p className="text-[0.8rem] text-taupe leading-relaxed">
                  Tag lead non ancora configurato per questo cliente: i lead reali
                  compariranno quando imposti il tag nella colonna{" "}
                  <code className="text-inchiostro">ghl_tag_lead</code> del config.
                  {metaLead7 > 0 && (
                    <> Intanto Meta ne traccia {formatNumero(metaLead7)} negli ultimi 7 giorni.</>
                  )}
                </p>
              </div>
            );
          }
          const e = cliente.leadCrmEsito;
          const allarme = e === "CRITICO" || e === "WARNING";
          const colore = allarme ? COLORE_ESITO[e!] : "#5C1A28";
          const stato =
            e === "CRITICO"
              ? "nessun lead · verificare form/campagne"
              : e === "WARNING"
                ? "lead in calo"
                : "in linea";
          // Finestra CRM allineata al periodo: 24h = ultimo giorno, 7g/30g = somma finestra
          const wCrm =
            periodo === "30g"
              ? storico.slice(-30)
              : periodo === "7g"
                ? storico.slice(-7)
                : storico.slice(-1);
          const lead = wCrm.reduce((s, p) => s + (p.leadCrm ?? 0), 0);
          const metaLead = somma(wCrm, "lead"); // lead tracciati da Meta, stessa finestra
          const sottostima = lead > 0 && metaLead < lead;
          const suff =
            periodo === "24h" ? "ieri" : periodo === "7g" ? "ultimi 7 giorni" : "ultimi 30 giorni";
          const stessoP =
            periodo === "24h"
              ? "ieri"
              : periodo === "7g"
                ? "negli stessi 7 giorni"
                : "negli stessi 30 giorni";
          // Triage: quando i lead calano, da che parte guardare (GHL o Meta)?
          // Incrocia spesa Meta (7gg) + contatti CRM + eventuali automazioni in bozza.
          const spesa7 = somma(storico.slice(-7), "spesa");
          const auto = cliente.automazioni;
          const triage = !allarme
            ? null
            : auto && auto.bozze > 0
              ? {
                  lato: "GHL" as const,
                  testo: `C'è ${
                    auto.bozze === 1 ? "un'automazione" : `${auto.bozze} automazioni`
                  } in bozza${
                    auto.nomiBozze ? ` (${auto.nomiBozze})` : ""
                  }: probabile causa. Attivala in GHL.`,
                }
              : spesa7 <= 0.5
                ? {
                    lato: "Meta" as const,
                    testo:
                      "L'inserzione non sta girando (spesa quasi nulla negli ultimi 7 giorni). Controlla la campagna su Meta.",
                  }
                : {
                    lato: "GHL" as const,
                    testo: `Stai spendendo ${formatEuro(
                      spesa7
                    )} negli ultimi 7 giorni ma i lead non entrano nel CRM. Controlla automazioni e integrazione in GHL.`,
                  };
          return (
            <div className="px-6 py-4 border-t border-bordo bg-panel/40">
              <p className="etichetta text-taupe mb-3">Lead reali · CRM (GoHighLevel)</p>
              <div className="flex items-end gap-3">
                <p className="cifra text-3xl leading-none" style={{ color: colore }}>
                  {formatNumero(lead)}
                </p>
                <p
                  className="text-[0.72rem] mb-0.5"
                  style={{ color: allarme ? colore : "#8A7E6D" }}
                >
                  lead nel CRM · {suff}
                  {periodo === "7g" ? ` · ${stato}` : ""}
                </p>
              </div>
              <p className="text-[0.72rem] text-taupe mt-2 leading-relaxed">
                Meta ne ha tracciati{" "}
                <strong className="text-inchiostro">{formatNumero(metaLead)}</strong> {stessoP}.
                {sottostima && (
                  <span className="text-bordeaux">
                    {" "}
                    Meta ne perde qualcuno: i lead veri sono {formatNumero(lead)} (il CRM è la
                    fonte affidabile).
                  </span>
                )}
              </p>
              {triage && (
                <div
                  className="mt-3 pl-3 py-2"
                  style={{
                    borderLeft: `2px solid ${triage.lato === "GHL" ? "#B67B2E" : "#5C1A28"}`,
                  }}
                >
                  <p
                    className="etichetta mb-1"
                    style={{ color: triage.lato === "GHL" ? "#B67B2E" : "#5C1A28" }}
                  >
                    Dove guardare · {triage.lato}
                  </p>
                  <p className="text-[0.72rem] text-inchiostro leading-relaxed">{triage.testo}</p>
                </div>
              )}
            </div>
          );
        })()}

      {/* Salute tecnica GHL — stato automazioni (attivo/bozza) */}
      {cliente.automazioni && (
        <div className="px-6 py-4 border-t border-bordo">
          <p className="etichetta text-taupe mb-2">Salute tecnica · GHL</p>
          <p className="text-sm text-inchiostro">
            <strong>{formatNumero(cliente.automazioni.attivi)}</strong> automazioni attive
            {cliente.automazioni.bozze > 0 ? (
              <span style={{ color: "#B67B2E" }}>
                {" "}
                · {formatNumero(cliente.automazioni.bozze)} in bozza
              </span>
            ) : (
              <span className="text-taupe"> · nessuna in bozza</span>
            )}
          </p>
          {cliente.automazioni.bozze > 0 && cliente.automazioni.nomiBozze && (
            <p className="text-[0.72rem] mt-1" style={{ color: "#B67B2E" }}>
              In bozza: {cliente.automazioni.nomiBozze} — attivale se collegate a inserzioni
              attive.
            </p>
          )}
        </div>
      )}

      {/* Opportunità / pipeline dal CRM */}
      {cliente.opportunita && (
        <div className="px-6 py-4 border-t border-bordo">
          <p className="etichetta text-taupe mb-3">Opportunità · CRM (pipeline)</p>
          <div className="flex items-end gap-3 flex-wrap">
            <p className="cifra text-3xl leading-none text-bordeaux">
              {formatNumero(cliente.opportunita.aperte)}
            </p>
            <p className="text-[0.72rem] text-taupe mb-0.5">
              trattative aperte · {formatEuro(cliente.opportunita.pipeline)} in pipeline
            </p>
          </div>
          <p className="text-[0.72rem] text-taupe mt-2 leading-relaxed">
            <span className="text-ok">{formatNumero(cliente.opportunita.vinte)} vinte</span> ·{" "}
            {formatNumero(cliente.opportunita.perse)} perse (totali)
          </p>
        </div>
      )}

      {/* Appuntamenti dai calendari GHL — solo se c'è attività */}
      {cliente.appuntamenti &&
        (cliente.appuntamenti.prossimi > 0 ||
          cliente.appuntamenti.prenotati7 > 0 ||
          cliente.appuntamenti.noshow7 > 0) && (
          <div className="px-6 py-4 border-t border-bordo">
            <p className="etichetta text-taupe mb-3">Appuntamenti · CRM</p>
            <div className="flex items-end gap-3 flex-wrap">
              <p className="cifra text-3xl leading-none text-bordeaux">
                {formatNumero(cliente.appuntamenti.prossimi)}
              </p>
              <p className="text-[0.72rem] text-taupe mb-0.5">in agenda (prossimi)</p>
            </div>
            <p className="text-[0.72rem] text-taupe mt-2 leading-relaxed">
              {formatNumero(cliente.appuntamenti.prenotati7)} prenotati negli ultimi 7 giorni
              {cliente.appuntamenti.noshow7 > 0 && (
                <span style={{ color: "#B67B2E" }}>
                  {" "}
                  · {formatNumero(cliente.appuntamenti.noshow7)} no-show (7gg)
                </span>
              )}
            </p>
          </div>
        )}

      {/* Grafico storico */}
      <div className="px-6 py-6 border-t border-bordo">
        <p className="etichetta text-taupe mb-4">
          Andamento · ultimi {giorniGrafico} giorni
        </p>
        <HistoryChart dati={finestraGrafico} />
      </div>
    </section>
  );
}

function SelettorePeriodo({
  valore,
  onChange,
}: {
  valore: Periodo;
  onChange: (p: Periodo) => void;
}) {
  return (
    <div className="inline-flex border border-bordo" style={{ borderRadius: 2 }}>
      {PERIODI.map((p, i) => {
        const attivo = p.k === valore;
        return (
          <button
            key={p.k}
            onClick={() => onChange(p.k)}
            aria-pressed={attivo}
            className="etichetta px-3 py-1.5 transizione"
            style={{
              backgroundColor: attivo ? "#5C1A28" : "transparent",
              color: attivo ? "#FDFBF6" : "#8A7E6D",
              borderLeft: i > 0 ? "1px solid #DDD5C4" : "none",
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
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
        <p className="mb-1.5 text-lg text-taupe-chiaro italic leading-none py-2">{valore}</p>
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
