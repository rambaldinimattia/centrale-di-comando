"use client";

import { parseTs } from "@/lib/derive";
import { checkLabel, formatTimestamp } from "@/lib/format";
import type { AlertFeedItem } from "@/lib/types";
import { useMemo, useState } from "react";

type Finestra = "7g" | "30g" | "tutti";

const FINESTRE: { k: Finestra; label: string; giorni: number | null }[] = [
  { k: "7g", label: "7 giorni", giorni: 7 },
  { k: "30g", label: "30 giorni", giorni: 30 },
  { k: "tutti", label: "Tutti", giorni: null },
];

// Colori e testo dei badge severità (RISOLTO predisposto per il futuro)
function badgeStyle(esito: string): { bg: string; fg: string; label: string } {
  const s = esito.toUpperCase();
  if (s === "CRITICO") return { bg: "#8E2A3C", fg: "#FDFBF6", label: "Critico" };
  if (s === "WARNING") return { bg: "#B67B2E", fg: "#FDFBF6", label: "Warning" };
  if (s === "RISOLTO" || s === "OK")
    return { bg: "#4A6B4F", fg: "#FDFBF6", label: "Risolto" };
  return { bg: "#8A7E6D", fg: "#FDFBF6", label: esito };
}

// Divide una stringa "1. ... 2. ... 3. ..." in passi numerati
function parsePassi(testo: string): string[] {
  const parts = testo
    .split(/\s*\d+\.\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [testo];
}

export function AlertFeed({ feed }: { feed: AlertFeedItem[] }) {
  const [finestra, setFinestra] = useState<Finestra>("7g");

  // Riferimento temporale = alert più recente (evita dipendere dall'orologio server)
  const refMs = useMemo(() => {
    let m = 0;
    for (const it of feed) {
      const d = parseTs(it.timestamp);
      if (d) m = Math.max(m, d.getTime());
    }
    return m;
  }, [feed]);

  const filtrati = useMemo(() => {
    const giorni = FINESTRE.find((f) => f.k === finestra)?.giorni ?? null;
    if (giorni == null || !refMs) return feed;
    const cutoff = refMs - giorni * 86_400_000;
    return feed.filter((it) => {
      const d = parseTs(it.timestamp);
      return d ? d.getTime() >= cutoff : false;
    });
  }, [feed, finestra, refMs]);

  const conScroll = filtrati.length > 10;

  return (
    <section>
      {/* Intestazione con titolo, conteggio e selettore periodo */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h2 className="etichetta text-taupe">Cronologia alert</h2>
          {feed.length > 0 && (
            <span className="text-[0.7rem] text-taupe-chiaro">
              {filtrati.length} nel periodo
            </span>
          )}
        </div>
        <SelettoreFinestra valore={finestra} onChange={setFinestra} />
      </div>

      {filtrati.length === 0 ? (
        <p className="text-sm text-taupe italic px-1">
          {feed.length === 0
            ? "Nessun alert registrato. Tutti gli account risultano in salute."
            : "Nessun alert nel periodo selezionato."}
        </p>
      ) : (
        <div
          className={conScroll ? "max-h-[560px] overflow-y-auto border border-bordo" : ""}
        >
          <ul
            className={`divide-y divide-bordo bg-card ${conScroll ? "" : "border border-bordo"}`}
            style={{ borderRadius: 0 }}
          >
            {filtrati.map((item, i) => (
              <AlertRow key={`${item.cliente}-${item.timestamp}-${i}`} item={item} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SelettoreFinestra({
  valore,
  onChange,
}: {
  valore: Finestra;
  onChange: (f: Finestra) => void;
}) {
  return (
    <div className="inline-flex border border-bordo" style={{ borderRadius: 2 }}>
      {FINESTRE.map((f, i) => {
        const attivo = f.k === valore;
        return (
          <button
            key={f.k}
            onClick={() => onChange(f.k)}
            aria-pressed={attivo}
            className="etichetta px-3 py-1.5 transizione"
            style={{
              backgroundColor: attivo ? "#5C1A28" : "transparent",
              color: attivo ? "#FDFBF6" : "#8A7E6D",
              borderLeft: i > 0 ? "1px solid #DDD5C4" : "none",
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function AlertRow({ item }: { item: AlertFeedItem }) {
  const [aperto, setAperto] = useState(false);
  const badge = badgeStyle(item.esito);
  const haDiagnosi = Boolean(item.azione_consigliata && item.azione_consigliata.trim());

  return (
    <li>
      <button
        onClick={() => setAperto((v) => !v)}
        className="w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3 hover:bg-panel/50 transizione focus:outline-none focus-visible:ring-2 focus-visible:ring-bordeaux"
      >
        <span
          className="etichetta shrink-0 px-2 py-1 text-[0.6rem] mt-0.5"
          style={{ backgroundColor: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="cifra text-lg text-inchiostro leading-none">
              {item.cliente}
            </span>
            <span className="text-[0.7rem] text-taupe-chiaro uppercase tracking-label">
              {checkLabel(item.check)}
            </span>
          </div>
          <p className="text-sm text-taupe mt-1 leading-snug">{item.dettaglio}</p>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1 pl-2">
          <span className="text-[0.7rem] text-taupe-chiaro whitespace-nowrap">
            {formatTimestamp(item.timestamp)}
          </span>
          {item.alert_inviato && (
            <span className="inline-flex items-center gap-1 text-[0.62rem] text-ok uppercase tracking-label">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M22 2 11 13" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M22 2 15 22l-4-9-9-4 20-7z" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              Telegram
            </span>
          )}
          <span
            className="text-taupe-chiaro transizione"
            style={{ transform: aperto ? "rotate(180deg)" : "none" }}
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </div>
      </button>

      {aperto && (
        <div className="px-4 sm:px-5 pb-5 -mt-1">
          <div className="border-t border-bordo pt-4 bg-panel/40 -mx-4 sm:-mx-5 px-4 sm:px-5 pb-1">
            <p className="text-sm text-inchiostro leading-relaxed">{item.dettaglio}</p>

            {haDiagnosi && (
              <div className="mt-4">
                <p className="etichetta text-bordeaux mb-2">Diagnosi del Consigliere</p>
                <ol className="space-y-1.5">
                  {parsePassi(item.azione_consigliata!).map((passo, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-inchiostro">
                      <span className="cifra text-bordeaux text-base leading-tight shrink-0 w-5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{passo}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
