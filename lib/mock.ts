import type { ConfigCliente, RigaLog } from "./types";

// ─────────────────────────────────────────────────────────────
// Dati mock — identici per struttura al Google Sheet reale.
// Servono per Fase 1 (UI statica) e come fallback quando le
// variabili d'ambiente Google non sono configurate.
// ─────────────────────────────────────────────────────────────

// Genera i timestamp degli ultimi 7 giorni (esecuzione delle 08:00)
function giornoFa(n: number, ora = "08:00:00"): string {
  // Base fissa per determinismo (evita Date.now nei build cache)
  const base = new Date("2026-08-11T08:00:00");
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${ora}`;
}

export const MOCK_CONFIG: ConfigCliente[] = [
  {
    cliente: "Villa Aurora Ricevimenti",
    attivo: true,
    ad_account_id: "act_112233445566",
    dataset_id: "ds_9001",
    n8n_workflow_ids: "wf_101,wf_102",
    soglia_calo_eventi_warn: 25,
    soglia_calo_eventi_crit: 50,
    min_eventi_giorno: 3,
    giorni_token_warn: 7,
    spesa_max_giorno: 120,
    telegram_tag: "@marco_omc",
  },
  {
    cliente: "Studio Dentistico Bianchi",
    attivo: true,
    ad_account_id: "act_223344556677",
    dataset_id: "ds_9002",
    n8n_workflow_ids: "wf_201",
    soglia_calo_eventi_warn: 30,
    soglia_calo_eventi_crit: 55,
    min_eventi_giorno: 2,
    giorni_token_warn: 7,
    spesa_max_giorno: 80,
    telegram_tag: "@marco_omc",
  },
  {
    cliente: "AutoSalone Ferrari Motors",
    attivo: true,
    ad_account_id: "act_334455667788",
    dataset_id: "ds_9003",
    n8n_workflow_ids: "wf_301,wf_302",
    soglia_calo_eventi_warn: 20,
    soglia_calo_eventi_crit: 45,
    min_eventi_giorno: 4,
    giorni_token_warn: 10,
    spesa_max_giorno: 250,
    telegram_tag: "@marco_omc",
  },
  {
    cliente: "Palestra BodyFit Milano",
    attivo: true,
    ad_account_id: "act_445566778899",
    dataset_id: "ds_9004",
    n8n_workflow_ids: "wf_401",
    soglia_calo_eventi_warn: 25,
    soglia_calo_eventi_crit: 50,
    min_eventi_giorno: 3,
    giorni_token_warn: 7,
    spesa_max_giorno: 100,
    telegram_tag: "@marco_omc",
  },
  {
    cliente: "Immobiliare Costa Blu",
    attivo: false,
    ad_account_id: "act_556677889900",
    dataset_id: "ds_9005",
    n8n_workflow_ids: "",
    soglia_calo_eventi_warn: null,
    soglia_calo_eventi_crit: null,
    min_eventi_giorno: null,
    giorni_token_warn: null,
    spesa_max_giorno: null,
    telegram_tag: "@marco_omc",
  },
];

// Serie storica 7gg per cliente attivo: [lead, spesa] per giorno (0 = oggi)
const SERIE: Record<string, Array<[number, number]>> = {
  // giorno 6..0 (piu vecchio -> piu recente)
  "Villa Aurora Ricevimenti": [
    [8, 95],
    [7, 102],
    [9, 110],
    [6, 98],
    [7, 105],
    [8, 112],
    [7, 108],
  ],
  "Studio Dentistico Bianchi": [
    [5, 62],
    [6, 70],
    [4, 58],
    [5, 65],
    [3, 60],
    [3, 72],
    [2, 78],
  ],
  "AutoSalone Ferrari Motors": [
    [12, 210],
    [14, 225],
    [11, 205],
    [13, 240],
    [10, 235],
    [6, 248],
    [4, 262],
  ],
  "Palestra BodyFit Milano": [
    [6, 78],
    [7, 82],
    [5, 75],
    [6, 88],
    [7, 90],
    [0, 95],
    [0, 96],
  ],
};

function serieToStorico(cliente: string): RigaLog[] {
  const serie = SERIE[cliente] ?? [];
  const righe: RigaLog[] = [];
  serie.forEach((coppia, idx) => {
    const giorniIndietro = serie.length - 1 - idx;
    const ts = giornoFa(giorniIndietro);
    const [lead, spesa] = coppia;
    righe.push({
      timestamp: ts,
      agente: "Sentinella",
      cliente,
      check: "volume_lead",
      valore: String(lead),
      baseline: "7",
      esito: "OK",
      dettaglio: `Volume lead giornaliero: ${lead}`,
      alert_inviato: false,
    });
    righe.push({
      timestamp: ts,
      agente: "Sentinella",
      cliente,
      check: "spesa_giorno",
      valore: String(spesa),
      baseline: "100",
      esito: "OK",
      dettaglio: `Spesa giornaliera: ${spesa}€`,
      alert_inviato: false,
    });
  });
  return righe;
}

// Ultima esecuzione (oggi 08:00): i check che determinano lo stato
const OGGI = giornoFa(0);

const ULTIMA_ESECUZIONE: RigaLog[] = [
  // Villa Aurora — tutto OK
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "Villa Aurora Ricevimenti",
    check: "campagne_issues",
    valore: "5/0",
    baseline: "5",
    esito: "OK",
    dettaglio: "5 campagne attive, nessun problema rilevato",
    alert_inviato: false,
  },
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "Villa Aurora Ricevimenti",
    check: "cpl",
    valore: "15.4",
    baseline: "16",
    esito: "OK",
    dettaglio: "CPL nella norma",
    alert_inviato: false,
  },
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "Villa Aurora Ricevimenti",
    check: "token",
    valore: "42",
    baseline: "7",
    esito: "OK",
    dettaglio: "Token valido per 42 giorni",
    alert_inviato: false,
  },

  // Studio Dentistico Bianchi — WARNING (calo volume lead)
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "Studio Dentistico Bianchi",
    check: "volume_lead",
    valore: "2",
    baseline: "5",
    esito: "WARNING",
    dettaglio: "Calo lead del 40% rispetto alla baseline (2 vs 5)",
    alert_inviato: true,
  },
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "Studio Dentistico Bianchi",
    check: "cpl",
    valore: "39.0",
    baseline: "22",
    esito: "WARNING",
    dettaglio: "CPL in aumento: 39€ contro baseline 22€",
    alert_inviato: false,
  },
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "Studio Dentistico Bianchi",
    check: "token",
    valore: "12",
    baseline: "7",
    esito: "OK",
    dettaglio: "Token valido per 12 giorni",
    alert_inviato: false,
  },

  // AutoSalone Ferrari Motors — CRITICO (token in scadenza + calo forte)
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "AutoSalone Ferrari Motors",
    check: "token",
    valore: "3",
    baseline: "10",
    esito: "CRITICO",
    dettaglio: "Token in scadenza tra 3 giorni: rischio blocco campagne",
    alert_inviato: true,
    azione_consigliata:
      "1. Accedi a Meta Business Settings entro 48h. 2. Rigenera il token di sistema per l'account act_334455667788. 3. Aggiorna la credenziale nel workflow n8n wf_301. 4. Verifica che le campagne restino attive dopo il rinnovo.",
  },
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "AutoSalone Ferrari Motors",
    check: "volume_lead",
    valore: "4",
    baseline: "12",
    esito: "CRITICO",
    dettaglio: "Calo lead del 67% rispetto alla baseline (4 vs 12)",
    alert_inviato: true,
  },
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "AutoSalone Ferrari Motors",
    check: "spesa_giorno",
    valore: "262",
    baseline: "250",
    esito: "WARNING",
    dettaglio: "Spesa oltre il tetto giornaliero: 262€ contro 250€",
    alert_inviato: false,
  },
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "AutoSalone Ferrari Motors",
    check: "campagne_issues",
    valore: "6/2",
    baseline: "6",
    esito: "WARNING",
    dettaglio: "2 campagne su 6 con problemi di approvazione",
    alert_inviato: false,
  },

  // Palestra BodyFit Milano — CRITICO (zero lead con spesa)
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "Palestra BodyFit Milano",
    check: "zero_lead_spesa",
    valore: "0",
    baseline: "6",
    esito: "CRITICO",
    dettaglio: "Zero lead nonostante 96€ di spesa nelle ultime 24h",
    alert_inviato: true,
    azione_consigliata:
      "1. Controlla il pixel/dataset ds_9004: eventi lead non tracciati. 2. Verifica il modulo del form sulla landing page. 3. Testa una conversione manuale. 4. Se il tracciamento è ok, controlla il targeting: possibile audience esaurita.",
  },
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "Palestra BodyFit Milano",
    check: "spesa_giorno",
    valore: "96",
    baseline: "90",
    esito: "OK",
    dettaglio: "Spesa giornaliera: 96€",
    alert_inviato: false,
  },
  {
    timestamp: OGGI,
    agente: "Sentinella",
    cliente: "Palestra BodyFit Milano",
    check: "token",
    valore: "28",
    baseline: "7",
    esito: "OK",
    dettaglio: "Token valido per 28 giorni",
    alert_inviato: false,
  },
];

// Alert storici aggiuntivi (giorni precedenti) per popolare il feed
const ALERT_STORICI: RigaLog[] = [
  {
    timestamp: giornoFa(1),
    agente: "Sentinella",
    cliente: "AutoSalone Ferrari Motors",
    check: "volume_lead",
    valore: "6",
    baseline: "12",
    esito: "WARNING",
    dettaglio: "Calo lead del 50% rispetto alla baseline (6 vs 12)",
    alert_inviato: true,
  },
  {
    timestamp: giornoFa(1),
    agente: "Sentinella",
    cliente: "Palestra BodyFit Milano",
    check: "zero_lead_spesa",
    valore: "0",
    baseline: "6",
    esito: "CRITICO",
    dettaglio: "Zero lead nonostante 95€ di spesa nelle ultime 24h",
    alert_inviato: true,
  },
  {
    timestamp: giornoFa(2),
    agente: "Sentinella",
    cliente: "Studio Dentistico Bianchi",
    check: "cpl",
    valore: "35.0",
    baseline: "22",
    esito: "WARNING",
    dettaglio: "CPL in aumento: 35€ contro baseline 22€",
    alert_inviato: false,
  },
  {
    timestamp: giornoFa(3),
    agente: "Sentinella",
    cliente: "Villa Aurora Ricevimenti",
    check: "spesa_giorno",
    valore: "125",
    baseline: "120",
    esito: "WARNING",
    dettaglio: "Spesa lievemente oltre il tetto: 125€ contro 120€",
    alert_inviato: false,
  },
];

export function getMockLog(): RigaLog[] {
  const storico = Object.keys(SERIE).flatMap((c) => serieToStorico(c));
  return [...storico, ...ULTIMA_ESECUZIONE, ...ALERT_STORICI];
}

export function getMockConfig(): ConfigCliente[] {
  return MOCK_CONFIG;
}
