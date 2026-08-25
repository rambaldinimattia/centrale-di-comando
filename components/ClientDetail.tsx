"use client";

import { COLORE_ESITO, LABEL_ESITO, formatEuro, formatNumero } from "@/lib/format";
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
        <MetricCard
          label={`Lead ${suffisso}`}
          valore={formatNumero(lead)}
          sotto={
            periodo === "24h"
              ? baselineLead
                ? `Baseline ${baselineLead}`
                : "Baseline non disponibile"
              : "Totale periodo"
          }
        />
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

      {/* CRM (GoHighLevel) — mostrato solo se il cliente è monitorato su GHL */}
      {cliente.contattiCrm != null &&
        (() => {
          const e = cliente.contattiCrmEsito;
          const allarme = e === "CRITICO" || e === "WARNING";
          const colore = allarme ? COLORE_ESITO[e!] : "#5C1A28";
          const stato =
            e === "CRITICO"
              ? "CRM fermo · verificare form/integrazione"
              : e === "WARNING"
                ? "contatti in calo"
                : "in linea";
          const crm = cliente.contattiCrm ?? 0;
          const metaLead7 = somma(storico.slice(-7), "lead"); // lead tracciati da Meta, 7gg
          const sottostima = crm >= 3 && metaLead7 < crm * 0.6;
          return (
            <div className="px-6 py-4 border-t border-bordo bg-panel/40">
              <p className="etichetta text-taupe mb-3">CRM · GoHighLevel</p>
              <div className="flex items-end gap-3">
                <p className="cifra text-3xl leading-none" style={{ color: colore }}>
                  {formatNumero(crm)}
                </p>
                <p
                  className="text-[0.72rem] mb-0.5"
                  style={{ color: allarme ? colore : "#8A7E6D" }}
                >
                  contatti nel CRM · ultimi 7 giorni · {stato}
                </p>
              </div>
              <p className="text-[0.72rem] text-taupe mt-2 leading-relaxed">
                Meta ne ha tracciati{" "}
                <strong className="text-inchiostro">{formatNumero(metaLead7)}</strong> come
                lead negli stessi 7 giorni.
                {sottostima && (
                  <span className="text-bordeaux">
                    {" "}
                    Meta ne conta molto meno del CRM: probabile evento Lead non rimandato a
                    Meta (pixel/CAPI) — il numero reale è quello del CRM.
                  </span>
                )}
              </p>
            </div>
          );
        })()}

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
