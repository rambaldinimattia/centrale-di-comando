import { describe, expect, it } from "vitest";
import {
  dayKey,
  deriveDashboard,
  parseNum,
  parseTs,
  peggiore,
} from "./derive";
import type { ConfigCliente, Esito, RigaLog } from "./types";

// ─────────────────────────────────────────────────────────────
// Helper per costruire righe di config/log con default sensati, così
// ogni test dichiara solo i campi che gli interessano.
// ─────────────────────────────────────────────────────────────

function cfg(cliente: string, over: Partial<ConfigCliente> = {}): ConfigCliente {
  return {
    cliente,
    attivo: true,
    ad_account_id: "",
    dataset_id: "",
    n8n_workflow_ids: "",
    soglia_calo_eventi_warn: null,
    soglia_calo_eventi_crit: null,
    min_eventi_giorno: null,
    giorni_token_warn: null,
    spesa_max_giorno: null,
    telegram_tag: "",
    ...over,
  };
}

function riga(over: Partial<RigaLog> = {}): RigaLog {
  return {
    timestamp: "2026-09-05 08:00:00",
    agente: "sentinella",
    cliente: "ACME",
    check: "spesa_giorno",
    valore: "",
    baseline: "",
    esito: "OK",
    dettaglio: "",
    alert_inviato: false,
    ...over,
  };
}

const IERI = "2026-09-04 08:00:00";
const OGGI = "2026-09-05 08:00:00";
const OGGI_810 = "2026-09-05 08:10:00";

describe("peggiore", () => {
  it("restituisce l'esito di gravità maggiore", () => {
    expect(peggiore("OK", "WARNING")).toBe("WARNING");
    expect(peggiore("CRITICO", "WARNING")).toBe("CRITICO");
    expect(peggiore("OK", "OK")).toBe("OK");
  });
});

describe("parseNum", () => {
  it("accetta la virgola decimale italiana e i simboli", () => {
    expect(parseNum("15,4")).toBe(15.4);
    expect(parseNum("96€")).toBe(96);
    expect(parseNum("1.234")).toBe(1.234);
  });
  it("ritorna null su vuoto o non-numerico", () => {
    expect(parseNum("")).toBeNull();
    expect(parseNum(null)).toBeNull();
    expect(parseNum("n/d")).toBeNull();
  });
});

describe("parseTs / dayKey", () => {
  it("converte il serial di Google Sheets in data", () => {
    // 46000 ≈ 2025-12-22 (giorni dal 1899-12-30), sopra la soglia 30000
    const d = parseTs("46000");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2025);
  });
  it("non tratta i piccoli interi come date", () => {
    expect(parseTs("5")).toBeNull();
  });
  it("estrae la chiave-giorno da un timestamp", () => {
    expect(dayKey("2026-09-05 08:00:00")).toBe("2026-09-05");
  });
});

describe("deriveDashboard · config come fonte di verità", () => {
  it("mostra solo i clienti presenti in config, non quelli solo nel log", () => {
    const config = [cfg("ACME")];
    const log = [
      riga({ cliente: "ACME", check: "spesa_giorno", esito: "OK" }),
      // RIMOSSO: presente nel log ma non più in config
      riga({ cliente: "RIMOSSO", check: "zero_lead_spesa", esito: "CRITICO" }),
    ];
    const d = deriveDashboard(config, log);
    expect(d.clienti.map((c) => c.cliente)).toEqual(["ACME"]);
  });

  it("esclude dal feed gli alert dei clienti non in config", () => {
    const config = [cfg("ACME")];
    const log = [
      riga({ cliente: "ACME", check: "cpl", esito: "WARNING" }),
      riga({ cliente: "RIMOSSO", check: "cpl", esito: "CRITICO" }),
    ];
    const d = deriveDashboard(config, log);
    expect(d.feed.every((f) => f.cliente === "ACME")).toBe(true);
  });
});

describe("deriveDashboard · freschezza (solo l'ultimo giro colora)", () => {
  it("un CRITICO del giorno prima non resta acceso se oggi c'è solo un WARNING", () => {
    const config = [cfg("ACME")];
    const log = [
      riga({ cliente: "ACME", check: "volume_lead", esito: "WARNING", timestamp: OGGI }),
      riga({ cliente: "ACME", check: "zero_lead_spesa", esito: "CRITICO", timestamp: IERI }),
    ];
    const d = deriveDashboard(config, log);
    expect(d.clienti[0].esito).toBe("WARNING");
    expect(d.nCritici).toBe(0);
    expect(d.nWarning).toBe(1);
  });

  it("tiene insieme i due workflow del mattino (8:00 e 8:10)", () => {
    const config = [cfg("ACME")];
    const log = [
      riga({ cliente: "ACME", check: "spesa_giorno", esito: "WARNING", timestamp: OGGI }),
      riga({ cliente: "ACME", check: "ghl_lead", esito: "CRITICO", timestamp: OGGI_810 }),
    ];
    const d = deriveDashboard(config, log);
    // entrambi freschi → vince il critico
    expect(d.clienti[0].esito).toBe("CRITICO");
  });

  it("un CRITICO fresco di oggi resta rosso", () => {
    const config = [cfg("ACME")];
    const log = [
      riga({ cliente: "ACME", check: "zero_lead_spesa", esito: "CRITICO", timestamp: OGGI }),
    ];
    const d = deriveDashboard(config, log);
    expect(d.clienti[0].esito).toBe("CRITICO");
  });
});

describe("deriveDashboard · volume_lead informativo con CRM", () => {
  it("col CRM, un volume_lead Meta in allarme non colora il cliente", () => {
    const config = [cfg("ACME", { ghl_tag_lead: "lead" })];
    const log = [
      riga({ cliente: "ACME", check: "volume_lead", esito: "CRITICO", timestamp: OGGI }),
      riga({ cliente: "ACME", check: "ghl_lead", esito: "OK", valore: "5", timestamp: OGGI }),
    ];
    const d = deriveDashboard(config, log);
    expect(d.clienti[0].esito).toBe("OK");
  });
});

describe("deriveDashboard · CPL 24h", () => {
  it("calcola il CPL come spesa ieri / lead ieri", () => {
    const config = [cfg("ACME")];
    const log = [
      riga({ cliente: "ACME", check: "spesa_giorno", valore: "100", timestamp: OGGI }),
      riga({ cliente: "ACME", check: "volume_lead", valore: "4", timestamp: OGGI }),
    ];
    const d = deriveDashboard(config, log);
    expect(d.clienti[0].cpl).toBe(25);
  });

  it("CPL null se non ci sono lead", () => {
    const config = [cfg("ACME")];
    const log = [
      riga({ cliente: "ACME", check: "spesa_giorno", valore: "100", timestamp: OGGI }),
      riga({ cliente: "ACME", check: "volume_lead", valore: "0", timestamp: OGGI }),
    ];
    const d = deriveDashboard(config, log);
    expect(d.clienti[0].cpl).toBeNull();
  });
});

describe("deriveDashboard · campagne con problemi", () => {
  it("legge il secondo numero del formato attive/problemi", () => {
    const config = [cfg("ACME")];
    const log = [
      riga({ cliente: "ACME", check: "campagne_issues", valore: "6/2", timestamp: OGGI }),
    ];
    const d = deriveDashboard(config, log);
    expect(d.clienti[0].campagneProblemi).toBe(2);
  });
});

describe("deriveDashboard · da quanti giorni in allarme", () => {
  const G = (giorno: string) => `2026-09-${giorno} 08:00:00`;

  it("cliente in salute: nessuna durata", () => {
    const d = deriveDashboard([cfg("ACME")], [
      riga({ check: "spesa_giorno", esito: "OK", timestamp: G("05") }),
    ]);
    expect(d.clienti[0].giorniAllarme).toBeNull();
  });

  it("critico solo oggi → 0 (da oggi)", () => {
    const d = deriveDashboard([cfg("ACME")], [
      riga({ check: "token", esito: "OK", timestamp: G("04") }),
      riga({ check: "token", esito: "CRITICO", timestamp: G("05") }),
    ]);
    expect(d.clienti[0].giorniAllarme).toBe(0);
  });

  it("critico da tre giorni di fila → 2, interrotto da un giorno OK prima", () => {
    const d = deriveDashboard([cfg("ACME")], [
      riga({ check: "token", esito: "OK", timestamp: G("02") }),
      riga({ check: "token", esito: "CRITICO", timestamp: G("03") }),
      riga({ check: "token", esito: "CRITICO", timestamp: G("04") }),
      riga({ check: "token", esito: "CRITICO", timestamp: G("05") }),
    ]);
    expect(d.clienti[0].giorniAllarme).toBe(2);
  });

  it("warning ieri, critico oggi → critico da oggi", () => {
    const d = deriveDashboard([cfg("ACME")], [
      riga({ check: "cpl", esito: "WARNING", timestamp: G("04") }),
      riga({ check: "cpl", esito: "CRITICO", timestamp: G("05") }),
    ]);
    expect(d.clienti[0].esito).toBe("CRITICO");
    expect(d.clienti[0].giorniAllarme).toBe(0);
  });

  it("critico ieri, warning oggi → warning da ieri (in allarme da 2 giorni)", () => {
    const d = deriveDashboard([cfg("ACME")], [
      riga({ check: "cpl", esito: "CRITICO", timestamp: G("04") }),
      riga({ check: "cpl", esito: "WARNING", timestamp: G("05") }),
    ]);
    expect(d.clienti[0].esito).toBe("WARNING");
    expect(d.clienti[0].giorniAllarme).toBe(1);
  });

  it("un giorno senza esecuzione non interrompe la serie (conta il calendario)", () => {
    const d = deriveDashboard([cfg("ACME")], [
      riga({ check: "token", esito: "CRITICO", timestamp: G("03") }),
      // il 4 la Sentinella non ha girato
      riga({ check: "token", esito: "CRITICO", timestamp: G("05") }),
    ]);
    expect(d.clienti[0].giorniAllarme).toBe(2);
  });

  it("un check che scrive solo quando scatta, assente in un giorno eseguito, interrompe la serie", () => {
    const d = deriveDashboard([cfg("ACME")], [
      riga({ check: "zero_lead_spesa", esito: "CRITICO", timestamp: G("03") }),
      riga({ check: "spesa_giorno", esito: "OK", timestamp: G("04") }), // eseguito, nessun zero_lead
      riga({ check: "spesa_giorno", esito: "OK", timestamp: G("05") }),
      riga({ check: "zero_lead_spesa", esito: "CRITICO", timestamp: G("05") }),
    ]);
    expect(d.clienti[0].giorniAllarme).toBe(0);
  });

  it("nel feed la durata va solo sulla riga più recente dell'alert aperto", () => {
    const d = deriveDashboard([cfg("ACME")], [
      riga({ check: "token", esito: "CRITICO", timestamp: G("04") }),
      riga({ check: "token", esito: "CRITICO", timestamp: G("05") }),
      riga({ check: "cpl", esito: "WARNING", timestamp: G("02") }), // alert chiuso
      riga({ check: "cpl", esito: "OK", timestamp: G("05") }),
    ]);
    const token = d.feed.filter((f) => f.check === "token");
    expect(token[0].timestamp).toBe(G("05"));
    expect(token[0].giorniAllarme).toBe(1);
    expect(token[1].giorniAllarme).toBeUndefined();
    expect(d.feed.find((f) => f.check === "cpl")!.giorniAllarme).toBeUndefined();
  });
});

describe("deriveDashboard · ordinamento e contatori", () => {
  it("ordina i clienti attivi per gravità decrescente", () => {
    const config = [cfg("ALFA"), cfg("BETA"), cfg("GAMMA")];
    const log = [
      riga({ cliente: "ALFA", check: "spesa_giorno", esito: "OK", timestamp: OGGI }),
      riga({ cliente: "BETA", check: "zero_lead_spesa", esito: "CRITICO", timestamp: OGGI }),
      riga({ cliente: "GAMMA", check: "cpl", esito: "WARNING", timestamp: OGGI }),
    ];
    const d = deriveDashboard(config, log);
    expect(d.clienti.map((c) => c.cliente)).toEqual(["BETA", "GAMMA", "ALFA"]);
    expect(d.nCritici).toBe(1);
    expect(d.nWarning).toBe(1);
  });

  it("i contatori ignorano i clienti non attivi", () => {
    const config = [cfg("ALFA", { attivo: false })];
    const log = [
      riga({ cliente: "ALFA", check: "zero_lead_spesa", esito: "CRITICO", timestamp: OGGI }),
    ];
    const d = deriveDashboard(config, log);
    expect(d.nCritici).toBe(0);
  });
});
