import { deriveDashboard } from "./derive";
import { getMockConfig, getMockLog } from "./mock";
import { fetchConfig, fetchLog, isSheetsConfigured } from "./sheets";
import type { DashboardData } from "./types";

// ─────────────────────────────────────────────────────────────
// Orchestratore dati: usa Google Sheets se configurato,
// altrimenti ricade sui dati mock (Fase 1 / ambiente locale).
// ─────────────────────────────────────────────────────────────

export interface DashboardResult extends DashboardData {
  errore: string | null;
}

export async function getDashboardData(): Promise<DashboardResult> {
  if (!isSheetsConfigured()) {
    const derived = deriveDashboard(getMockConfig(), getMockLog(), { fonte: "mock" });
    return { ...derived, errore: null };
  }

  try {
    const [config, log] = await Promise.all([fetchConfig(), fetchLog()]);
    const derived = deriveDashboard(config, log, { fonte: "reale" });
    return { ...derived, errore: null };
  } catch (err) {
    // In caso di errore Google, ricadi sui mock ma segnala il problema
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    const derived = deriveDashboard(getMockConfig(), getMockLog(), { fonte: "mock" });
    return { ...derived, errore: message };
  }
}
