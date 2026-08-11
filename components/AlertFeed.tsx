"use client";

import { checkLabel, formatTimestamp } from "@/lib/format";
import type { AlertFeedItem } from "@/lib/types";
import { useState } from "react";

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
  if (!feed || feed.length === 0) {
    return (
      <p className="text-sm text-taupe italic px-1">
        Nessun alert registrato. Tutti gli account risultano in salute.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-bordo border border-bordo bg-card" style={{ borderRadius: 0 }}>
      {feed.map((item, i) => (
        <AlertRow key={`${item.cliente}-${item.timestamp}-${i}`} item={item} />
      ))}
    </ul>
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
