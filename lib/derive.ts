import type {
  AlertFeedItem,
  CheckDerivato,
  ClienteDerivato,
  ConfigCliente,
  DashboardData,
  Esito,
  PuntoStorico,
  RigaLog,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Logica di derivazione: da (config + log grezzi) → modello UI
// Nessuno stato scritto: pura trasformazione in lettura.
// ─────────────────────────────────────────────────────────────

const RANK: Record<Esito, number> = { OK: 0, WARNING: 1, CRITICO: 2 };

export function peggiore(a: Esito, b: Esito): Esito {
  return RANK[a] >= RANK[b] ? a : b;
}

// Parsing numerico tollerante: "96€" → 96 ; "15,4" → 15.4 ; "" → null
export function parseNum(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  // Normalizza la virgola decimale italiana, poi estrai il primo numero
  const match = String(raw).replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

// Chiave-giorno robusta da un timestamp dello Sheet
export function dayKey(ts: string): string {
  const d = parseTs(ts);
  if (!d) {
    // fallback: prendi i primi 10 caratteri se sembra una data
    return String(ts).slice(0, 10);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseTs(ts: string): Date | null {
  if (!ts) return null;
  // Accetta "2026-08-11 08:00:00", ISO, e con la T
  const normalized = String(ts).trim().replace(" ", "T");
  let d = new Date(normalized);
  if (isNaN(d.getTime())) d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function tsValue(ts: string): number {
  const d = parseTs(ts);
  return d ? d.getTime() : 0;
}

// Ricava il numero di campagne CON PROBLEMI dal valore del check campagne_issues.
// La Sentinella scrive nel formato "attive/problemi" (es. "1/0", "6/2"): il dato
// che ci interessa è il secondo numero. Se arriva un numero singolo, lo si
// interpreta già come conteggio dei problemi.
function problemiDaValore(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const coppia = String(raw).match(/(\d+)\s*[/|-]\s*(\d+)/);
  if (coppia) return Number(coppia[2]);
  const singolo = String(raw).match(/-?\d+/);
  return singolo ? Number(singolo[0]) : null;
}

interface DeriveOptions {
  fonte: "reale" | "mock";
}

export function deriveDashboard(
  config: ConfigCliente[],
  log: RigaLog[],
  opts: DeriveOptions = { fonte: "reale" }
): DashboardData {
  const configByName = new Map<string, ConfigCliente>();
  for (const c of config) configByName.set(c.cliente.trim(), c);

  // Raggruppa il log per cliente
  const logByCliente = new Map<string, RigaLog[]>();
  for (const r of log) {
    const key = r.cliente?.trim();
    if (!key) continue;
    if (!logByCliente.has(key)) logByCliente.set(key, []);
    logByCliente.get(key)!.push(r);
  }

  // Unione dei nomi cliente presenti in config e/o log
  const nomi = new Set<string>([
    ...config.map((c) => c.cliente.trim()),
    ...Array.from(logByCliente.keys()),
  ]);

  const clienti: ClienteDerivato[] = [];

  for (const nome of nomi) {
    const cfg = configByName.get(nome) ?? null;
    const righe = (logByCliente.get(nome) ?? []).slice();

    // Ultima esecuzione = righe del giorno più recente per questo cliente
    let ultimoGiorno: string | null = null;
    let ultimoTs: string | null = null;
    for (const r of righe) {
      const g = dayKey(r.timestamp);
      if (ultimoGiorno === null || g > ultimoGiorno) ultimoGiorno = g;
      if (ultimoTs === null || tsValue(r.timestamp) > tsValue(ultimoTs)) {
        ultimoTs = r.timestamp;
      }
    }

    const righeUltima = righe.filter((r) => dayKey(r.timestamp) === ultimoGiorno);

    const checks: CheckDerivato[] = righeUltima.map((r) => ({
      check: r.check,
      valore: r.valore,
      baseline: r.baseline,
      esito: r.esito,
      dettaglio: r.dettaglio,
      alert_inviato: r.alert_inviato,
      azione_consigliata: r.azione_consigliata,
      timestamp: r.timestamp,
    }));

    // Esito peggiore dell'ultima esecuzione
    let esito: Esito = "OK";
    for (const c of checks) esito = peggiore(esito, c.esito);

    // Check peggiore (per la riga stato nella card)
    let checkPeggiore: CheckDerivato | null = null;
    for (const c of checks) {
      if (!checkPeggiore || RANK[c.esito] > RANK[checkPeggiore.esito]) {
        checkPeggiore = c;
      }
    }
    // Se tutto OK, mostra un check informativo (token o volume)
    if (checkPeggiore && esito === "OK") {
      checkPeggiore =
        checks.find((c) => c.check === "volume_lead") ??
        checks.find((c) => c.check === "campagne_issues") ??
        checkPeggiore;
    }

    // Storico giornaliero (fino a 30 giorni) per grafico e aggregazioni
    const storico = buildStorico(righe);

    // Mini-stat "ieri" (ultime 24h) dall'ultima esecuzione
    const spesaIeri = parseNum(
      righeUltima.find((r) => r.check === "spesa_giorno")?.valore
    );
    const leadIeri = parseNum(
      righeUltima.find((r) => r.check === "volume_lead")?.valore
    );

    // CPL 24h: priorità al check `cpl` se presente; altrimenti spesa÷lead di ieri
    // (le aggregazioni 7g/30g sono calcolate lato UI dal selettore di periodo).
    const cplRiga = righeUltima.find((r) => r.check === "cpl");
    let cpl = parseNum(cplRiga?.valore);
    if (cpl == null && spesaIeri != null && leadIeri && leadIeri > 0) {
      cpl = spesaIeri / leadIeri;
    }

    // Campagne con problemi: dal valore "attive/problemi" si legge il 2° numero.
    const campRiga = righeUltima.find((r) => r.check === "campagne_issues");
    const campagneProblemi = campRiga ? problemiDaValore(campRiga.valore) : null;

    // CRM (GoHighLevel): nuovi contatti ultimi 7gg dal check `ghl_contatti`.
    const ghlRiga = righeUltima.find((r) => r.check === "ghl_contatti");
    const contattiCrm = ghlRiga ? parseNum(ghlRiga.valore) : null;

    clienti.push({
      cliente: nome,
      attivo: cfg ? cfg.attivo : true,
      config: cfg,
      esito,
      ultimoTimestamp: ultimoTs,
      checks,
      checkPeggiore,
      spesaIeri,
      leadIeri,
      cpl,
      campagneProblemi,
      contattiCrm,
      storico,
    });
  }

  // Ordinamento: attivi prima (per gravità desc, poi nome), inattivi in fondo
  clienti.sort((a, b) => {
    if (a.attivo !== b.attivo) return a.attivo ? -1 : 1;
    if (a.attivo) {
      const d = RANK[b.esito] - RANK[a.esito];
      if (d !== 0) return d;
    }
    return a.cliente.localeCompare(b.cliente, "it");
  });

  // Ultima esecuzione globale = timestamp più recente in assoluto
  let ultimaEsecuzione: string | null = null;
  for (const r of log) {
    if (ultimaEsecuzione === null || tsValue(r.timestamp) > tsValue(ultimaEsecuzione)) {
      ultimaEsecuzione = r.timestamp;
    }
  }

  // Contatori (solo clienti attivi)
  let nCritici = 0;
  let nWarning = 0;
  for (const c of clienti) {
    if (!c.attivo) continue;
    if (c.esito === "CRITICO") nCritici++;
    else if (c.esito === "WARNING") nWarning++;
  }

  // Feed alert = righe con esito != OK, timestamp desc.
  // Cap ampio (200) così il selettore di periodo lato UI ha dati da filtrare.
  const feed: AlertFeedItem[] = log
    .filter((r) => r.esito && r.esito !== "OK")
    .sort((a, b) => tsValue(b.timestamp) - tsValue(a.timestamp))
    .slice(0, 200)
    .map((r) => ({
      timestamp: r.timestamp,
      cliente: r.cliente,
      check: r.check,
      esito: r.esito,
      dettaglio: r.dettaglio,
      alert_inviato: r.alert_inviato,
      azione_consigliata: r.azione_consigliata,
    }));

  return {
    clienti,
    ultimaEsecuzione,
    nCritici,
    nWarning,
    feed,
    fonte: opts.fonte,
  };
}

// Costruisce la serie giornaliera (per giorno: lead + spesa), fino a 30 giorni.
// Il selettore di periodo nella UI ne prende poi la fetta 24h/7g/30g.
function buildStorico(righe: RigaLog[]): PuntoStorico[] {
  const perGiorno = new Map<string, { lead: number | null; spesa: number | null }>();

  for (const r of righe) {
    if (r.check !== "volume_lead" && r.check !== "spesa_giorno") continue;
    const g = dayKey(r.timestamp);
    if (!perGiorno.has(g)) perGiorno.set(g, { lead: null, spesa: null });
    const slot = perGiorno.get(g)!;
    if (r.check === "volume_lead") slot.lead = parseNum(r.valore);
    if (r.check === "spesa_giorno") slot.spesa = parseNum(r.valore);
  }

  const giorni = Array.from(perGiorno.keys()).sort(); // asc
  const ultimi30 = giorni.slice(-30);

  return ultimi30.map((g) => {
    const s = perGiorno.get(g)!;
    return { giorno: g, lead: s.lead ?? 0, spesa: s.spesa ?? 0 };
  });
}
