import { parseTs } from "./derive";
import type { Esito } from "./types";

// ─────────────────────────────────────────────────────────────
// Formattazione italiana per la UI
// ─────────────────────────────────────────────────────────────

export function formatEuro(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumero(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(n);
}

export function formatDecimale(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(n);
}

const MESI = [
  "gen",
  "feb",
  "mar",
  "apr",
  "mag",
  "giu",
  "lug",
  "ago",
  "set",
  "ott",
  "nov",
  "dic",
];

// "11 ago 2026 · 08:00"
export function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = parseTs(ts);
  if (!d) return String(ts);
  const gg = d.getDate();
  const mese = MESI[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${gg} ${mese} ${yyyy} · ${hh}:${min}`;
}

// "11 ago" per assi grafico
export function formatGiornoBreve(giorno: string): string {
  const d = parseTs(giorno);
  if (!d) return giorno.slice(5);
  return `${d.getDate()} ${MESI[d.getMonth()]}`;
}

// Etichette leggibili per i tipi di check
const CHECK_LABEL: Record<string, string> = {
  volume_lead: "Volume lead",
  zero_lead_spesa: "Zero lead con spesa",
  spesa_giorno: "Spesa giornaliera",
  cpl: "Costo per lead",
  campagne_issues: "Stato campagne",
  token: "Token di accesso",
  ghl_lead: "Lead CRM",
  ghl_contatti: "Contatti CRM",
};

export function checkLabel(check: string): string {
  return CHECK_LABEL[check] ?? check.replace(/_/g, " ");
}

// Colori severità (per stili inline dove serve)
export const COLORE_ESITO: Record<Esito, string> = {
  OK: "#4A6B4F",
  WARNING: "#B67B2E",
  CRITICO: "#8E2A3C",
};

export const LABEL_ESITO: Record<Esito, string> = {
  OK: "In salute",
  WARNING: "Da monitorare",
  CRITICO: "Critico",
};
