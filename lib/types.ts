// ─────────────────────────────────────────────────────────────
// Modello dati Centrale di Comando
// Rispecchia le due tab del Google Sheet OMC_Sentinella
// ─────────────────────────────────────────────────────────────

export type Esito = "OK" | "WARNING" | "CRITICO";

export type CheckTipo =
  | "volume_lead"
  | "zero_lead_spesa"
  | "spesa_giorno"
  | "cpl"
  | "campagne_issues"
  | "token";

// Riga della tab `config` — una per cliente
export interface ConfigCliente {
  cliente: string;
  attivo: boolean;
  ad_account_id: string;
  dataset_id: string;
  n8n_workflow_ids: string;
  soglia_calo_eventi_warn: number | null;
  soglia_calo_eventi_crit: number | null;
  min_eventi_giorno: number | null;
  giorni_token_warn: number | null;
  spesa_max_giorno: number | null;
  telegram_tag: string;
  // Colonna facoltativa: raggruppa i clienti (es. catene con più sedi).
  // Vuoto = cliente singolo.
  gruppo?: string;
  // Tag lead del CRM (uno o più, separati da virgola). Vuoto = CRM lead non
  // ancora configurato per questo cliente.
  ghl_tag_lead?: string;
}

// Riga della tab `log` — append giornaliero dalla Sentinella
export interface RigaLog {
  timestamp: string; // ISO o formato Sheet
  agente: string;
  cliente: string;
  check: CheckTipo | string;
  valore: string; // grezzo dallo Sheet, interpretato a valle
  baseline: string;
  esito: Esito;
  dettaglio: string;
  alert_inviato: boolean;
  // Colonna futura (predisposta): diagnosi del Consigliere
  azione_consigliata?: string;
  // Serie giornaliera dei lead CRM (dal check ghl_lead), es. "2026-08-19:0,2026-08-20:1"
  serie_crm?: string;
}

// ─────────────────────────────────────────────────────────────
// Modello derivato per la UI
// ─────────────────────────────────────────────────────────────

export interface CheckDerivato {
  check: string;
  valore: string;
  baseline: string;
  esito: Esito;
  dettaglio: string;
  alert_inviato: boolean;
  azione_consigliata?: string;
  timestamp: string;
}

export interface PuntoStorico {
  giorno: string; // YYYY-MM-DD
  lead: number; // lead tracciati da Meta quel giorno
  spesa: number;
  leadCrm?: number; // lead reali dal CRM quel giorno (se disponibili)
}

// Salute tecnica delle automazioni GHL (dal check ghl_automazioni)
export interface Automazioni {
  attivi: number;
  bozze: number;
  nomiBozze: string; // nomi delle automazioni in bozza, separati da virgola
}

// Opportunità / pipeline dal CRM (dal check ghl_opportunita) — conteggi esatti
export interface Opportunita {
  aperte: number; // trattative aperte (esatto, via meta.total)
  pipeline: number; // valore € delle aperte (somma su tutte le pagine)
  vinte: number; // trattative vinte totali (esatto)
  perse: number; // trattative perse/abbandonate totali (esatto)
}

// Appuntamenti dai calendari GHL (dal check ghl_appuntamenti)
export interface Appuntamenti {
  prossimi: number; // appuntamenti in agenda (startTime futuro, non annullati)
  prenotati7: number; // prenotati negli ultimi 7 giorni (per data di prenotazione)
  noshow7: number; // no-show negli ultimi 7 giorni
}

export interface ClienteDerivato {
  cliente: string;
  attivo: boolean;
  config: ConfigCliente | null;
  esito: Esito; // esito peggiore dell'ultima esecuzione
  ultimoTimestamp: string | null;
  checks: CheckDerivato[]; // check dell'ultima esecuzione
  checkPeggiore: CheckDerivato | null;
  // Mini-stat "ieri"
  spesaIeri: number | null;
  leadIeri: number | null;
  cpl: number | null;
  // Numero di campagne con problemi (0 = nessun problema; null = non monitorato)
  campagneProblemi: number | null;
  // CRM (GoHighLevel): lead reali negli ultimi 7 giorni (tag lead) — null = non monitorato
  leadCrm: number | null;
  leadCrmEsito: Esito | null;
  // Salute tecnica delle automazioni GHL — null = non monitorato
  automazioni: Automazioni | null;
  // Opportunità / pipeline dal CRM — null = non monitorato
  opportunita: Opportunita | null;
  // Appuntamenti dai calendari GHL — null = non monitorato
  appuntamenti: Appuntamenti | null;
  storico: PuntoStorico[]; // serie giornaliera, fino a 30 giorni (asc)
}

export interface AlertFeedItem {
  timestamp: string;
  cliente: string;
  check: string;
  esito: Esito;
  dettaglio: string;
  alert_inviato: boolean;
  azione_consigliata?: string;
}

export interface DashboardData {
  clienti: ClienteDerivato[];
  ultimaEsecuzione: string | null;
  nCritici: number;
  nWarning: number;
  feed: AlertFeedItem[];
  fonte: "reale" | "mock";
}
