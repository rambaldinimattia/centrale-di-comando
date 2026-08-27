import { google } from "googleapis";
import type { ConfigCliente, Esito, RigaLog } from "./types";

// ─────────────────────────────────────────────────────────────
// Lettura Google Sheets via service account (sola lettura).
// Mappatura per intestazione: robusta a riordino colonne e a
// nuove colonne future (es. azione_consigliata).
// ─────────────────────────────────────────────────────────────

export const SHEET_NAME = "OMC_Sentinella";
const TAB_CONFIG = "config";
const TAB_LOG = "log";

export function isSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.SHEET_ID
  );
}

function parseBool(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return ["true", "vero", "si", "sì", "1", "x", "attivo"].includes(s);
}

function parseNumOrNull(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeEsito(v: string | undefined): Esito {
  const s = (v ?? "").trim().toUpperCase();
  if (s === "CRITICO" || s === "CRITICAL") return "CRITICO";
  if (s === "WARNING" || s === "WARN") return "WARNING";
  return "OK";
}

// Costruisce il client Sheets dal JSON del service account
function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY non impostata");

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY non è un JSON valido. Incolla l'intero contenuto del file .json."
    );
  }

  // Le newline della private_key possono arrivare come \\n dalle env var
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

// Trasforma una matrice (con riga d'intestazione) in oggetti mappati per header
function rowsToObjects(values: string[][]): Record<string, string>[] {
  if (!values || values.length < 2) return [];
  const headers = values[0].map((h) => (h ?? "").trim().toLowerCase());
  return values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] ?? "").toString();
    });
    return obj;
  });
}

async function readTab(sheetId: string, tab: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tab}!A1:Z10000`,
    valueRenderOption: "UNFORMATTED_VALUE",
    // SERIAL_NUMBER (non FORMATTED_STRING): se Google Sheets auto-formatta una
    // cella numerica come data (es. il valore 1 di volume_lead diventa "31/12"),
    // vogliamo il numero serial grezzo — che coincide col numero originale — non
    // la stringa-data, che parseNum leggerebbe come giorno del mese (1 → 31).
    // Il timestamp è testo ISO ("...T...Z"), non tipo-data: resta invariato.
    dateTimeRenderOption: "SERIAL_NUMBER",
  });
  return (res.data.values as string[][]) ?? [];
}

export async function fetchConfig(): Promise<ConfigCliente[]> {
  const sheetId = process.env.SHEET_ID!;
  const values = await readTab(sheetId, TAB_CONFIG);
  const objs = rowsToObjects(values);
  return objs
    .filter((o) => (o["cliente"] ?? "").trim() !== "")
    .map((o) => ({
      cliente: (o["cliente"] ?? "").trim(),
      attivo: parseBool(o["attivo"]),
      ad_account_id: o["ad_account_id"] ?? "",
      dataset_id: o["dataset_id"] ?? "",
      n8n_workflow_ids: o["n8n_workflow_ids"] ?? "",
      soglia_calo_eventi_warn: parseNumOrNull(o["soglia_calo_eventi_warn"]),
      soglia_calo_eventi_crit: parseNumOrNull(o["soglia_calo_eventi_crit"]),
      min_eventi_giorno: parseNumOrNull(o["min_eventi_giorno"]),
      giorni_token_warn: parseNumOrNull(o["giorni_token_warn"]),
      spesa_max_giorno: parseNumOrNull(o["spesa_max_giorno"]),
      telegram_tag: o["telegram_tag"] ?? "",
      gruppo: (o["gruppo"] ?? "").trim(),
      ghl_tag_lead: (o["ghl_tag_lead"] ?? "").trim(),
    }));
}

export async function fetchLog(): Promise<RigaLog[]> {
  const sheetId = process.env.SHEET_ID!;
  const values = await readTab(sheetId, TAB_LOG);
  const objs = rowsToObjects(values);
  return objs
    .filter((o) => (o["cliente"] ?? "").trim() !== "" && (o["timestamp"] ?? "").trim() !== "")
    .map((o) => ({
      timestamp: (o["timestamp"] ?? "").trim(),
      agente: o["agente"] ?? "",
      cliente: (o["cliente"] ?? "").trim(),
      check: (o["check"] ?? "").trim(),
      valore: o["valore"] ?? "",
      baseline: o["baseline"] ?? "",
      esito: normalizeEsito(o["esito"]),
      dettaglio: o["dettaglio"] ?? "",
      alert_inviato: parseBool(o["alert_inviato"]),
      // Colonna futura: presente solo se lo Sheet la aggiunge
      azione_consigliata:
        (o["azione_consigliata"] ?? "").trim() !== ""
          ? o["azione_consigliata"]
          : undefined,
      serie_crm:
        (o["serie_crm"] ?? "").trim() !== "" ? o["serie_crm"] : undefined,
    }));
}
