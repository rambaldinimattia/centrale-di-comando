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
    case "stato_account":
      return critico
        ? "Account pubblicitario bloccato: apri Meta Business e controlla stato account, metodo di pagamento e limite di spesa. Con l'account fermo TUTTE le campagne sono ferme."
        : "Account vicino al limite di spesa: alza o rimuovi il limite prima che le campagne si fermino.";
    case "volume_lead":
      return "Lead Meta in calo: verifica che le campagne siano attive e i form funzionanti. Per i clienti col CRM guarda i lead reali (Meta sottostima).";
    case "ghl_lead":
      return critico
        ? "Nessun lead reale nel CRM: controlla che le inserzioni stiano girando e che form e automazioni GHL siano attivi (vedi il triage «Dove guardare»)."
        : "Lead reali in calo: incrocia con la spesa (triage) per capire se il problema è lato GHL o lato inserzione.";
    case "zero_lead_spesa":
      return "Stai spendendo senza generare lead: probabile problema di tracciamento o form. Verifica pixel/CAPI e che il form raccolga i contatti.";
    case "pixel_capi":
      return critico
        ? "Eventi Pixel/CAPI non arrivano più (o crollati): il tracciamento è rotto. Controlla pixel sulla landing, l'integrazione CAPI e il dataset; finché è così stai ottimizzando alla cieca."
        : "Qualità del tracciamento in calo (match quality bassa o eventi in diminuzione): verifica pixel, parametri CAPI e deduplica eventi.";
    case "erogazione":
      return critico
        ? "L'inserzione non sta erogando (spesa quasi nulla rispetto al budget): campagna in pausa, in revisione o budget esaurito. Controlla su Meta che sia attiva e approvata."
        : "Erogazione sotto l'atteso: l'inserzione spende meno del budget. Verifica stato, approvazione e limiti di budget/offerta su Meta.";
    case "spesa_giorno":
      return "Spesa oltre il tetto giornaliero: controlla il budget delle campagne prima che sfori troppo.";
    case "cpl":
      return "Costo per lead troppo alto: rivedi targeting, creatività e offerta della campagna.";
    case "campagne_issues":
      return "Ci sono campagne in errore su Meta: aprile e risolvi (rifiuti o problemi di approvazione).";
    case "stanchezza":
      return "Creatività sature (frequenza alta / CTR in calo): prepara nuovi visual e copy per le inserzioni segnalate, così abbassi la frequenza e recuperi il CTR.";
    case "ghl_completezza":
      return "Lead arrivati dal form con campi vuoti in GHL: la mappatura form → CRM è probabilmente rotta. Fai una compilazione di prova, controlla in n8n/GHL dove si perde il campo, poi completa a mano i contatti segnalati.";
    case "n8n_errori":
      return "Un'automazione n8n di questo cliente sta fallendo: apri le esecuzioni in errore del workflow indicato, leggi il nodo rosso (spesso credenziali scadute o API che cambiano) e correggi; poi recupera a mano ciò che non è stato fatto.";
    case "ghl_automazioni":
      return "Ci sono automazioni in bozza: se collegate a inserzioni attive, attivale in GoHighLevel per non perdere contatti.";
    default:
      return "Controllo in allarme: apri il dettaglio del cliente per approfondire.";
  }
}
