import type { Esito } from "./types";

// ─────────────────────────────────────────────────────────────
// Il Consigliere: per ogni check in allarme suggerisce la mossa
// pratica da fare. Usato come fallback quando la Sentinella non ha
// già scritto un'azione consigliata nel log.
// ─────────────────────────────────────────────────────────────

export function consiglioPer(check: string, esito: Esito): string {
  const critico = esito === "CRITICO";
  switch (check) {
    case "token":
      return critico
        ? "Il token Meta non è più valido: rigeneralo subito e aggiornalo, le campagne rischiano il blocco."
        : "Il token Meta sta per scadere: rigeneralo a breve per non fermare le campagne.";
    case "volume_lead":
      return "Lead Meta in calo: verifica che le campagne siano attive e i form funzionanti. Per i clienti col CRM guarda i lead reali (Meta sottostima).";
    case "ghl_lead":
      return critico
        ? "Nessun lead reale nel CRM: controlla che le inserzioni stiano girando e che form e automazioni GHL siano attivi (vedi il triage «Dove guardare»)."
        : "Lead reali in calo: incrocia con la spesa (triage) per capire se il problema è lato GHL o lato inserzione.";
    case "zero_lead_spesa":
      return "Stai spendendo senza generare lead: probabile problema di tracciamento o form. Verifica pixel/CAPI e che il form raccolga i contatti.";
    case "spesa_giorno":
      return "Spesa oltre il tetto giornaliero: controlla il budget delle campagne prima che sfori troppo.";
    case "cpl":
      return "Costo per lead troppo alto: rivedi targeting, creatività e offerta della campagna.";
    case "campagne_issues":
      return "Ci sono campagne in errore su Meta: aprile e risolvi (rifiuti o problemi di approvazione).";
    case "ghl_automazioni":
      return "Ci sono automazioni in bozza: se collegate a inserzioni attive, attivale in GoHighLevel per non perdere contatti.";
    default:
      return "Controllo in allarme: apri il dettaglio del cliente per approfondire.";
  }
}
