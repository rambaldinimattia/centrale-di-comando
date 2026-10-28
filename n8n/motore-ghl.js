// Codice del nodo Code del workflow n8n `sentinella-ghl` che calcola i lead CRM
// (check ghl_lead) e la completezza dei dati dei lead (check ghl_completezza).
// Copia versionata: la fonte di verità è il nodo in n8n; tienila allineata.
const out = [];
const items = $input.all();

// Nomi leggibili dei campi standard del contatto GHL (per il dettaglio)
const NOMI_CAMPI = { phone: 'telefono', email: 'email', firstName: 'nome', lastName: 'cognome', companyName: 'azienda' };

for (let i = 0; i < items.length; i++) {
    const cfg = $('assegna-token-ghl').all()[i].json;
  const risposta = items[i].json;
  // Robustezza: se il CRM di questo cliente non ha risposto (errore HTTP),
  // saltalo invece di scrivere un falso "0 lead". Gli altri proseguono.
  if (!risposta || !Array.isArray(risposta.contacts)) continue;
  const contatti = risposta.contacts;

  const tagLead = (cfg.ghl_tag_lead || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

  const oggi0 = new Date(); oggi0.setUTCHours(0, 0, 0, 0);
  const fine = oggi0.getTime();
  const g7 = fine - 7 * 86400000;
  const ieri0 = fine - 1 * 86400000;

  let lead7 = 0, lead1 = 0, leadOlder = 0, oldestLeadTs = fine, contatti7 = 0;
  const perGiorno = {};
  for (const c of contatti) {
    const t = new Date(c.dateAdded).getTime();
    const tags = (c.tags || []).map((x) => String(x).trim().toLowerCase());
    const haTag = tagLead.length > 0 && tags.some((tg) => tagLead.includes(tg));
const haTelefono = !!(c.phone && String(c.phone).trim());
const haEmail = !!(c.email && String(c.email).trim());
const isLead = haTag || (haTelefono && haEmail);
    if (t >= g7 && t < fine) contatti7++;
    if (isLead) {
      if (t >= g7 && t < fine) lead7++;
      if (t >= ieri0 && t < fine) lead1++;
      if (t < g7) { leadOlder++; if (t < oldestLeadTs) oldestLeadTs = t; }
      const key = new Date(c.dateAdded).toISOString().slice(0, 10);
      perGiorno[key] = (perGiorno[key] || 0) + 1;
    }
  }
  const serie_crm = Object.entries(perGiorno).map(([g, num]) => `${g}:${num}`).join(',');

  const giorniBase = Math.max(1, (g7 - oldestLeadTs) / 86400000);
  const rate = leadOlder / giorniBase;
  const atteso = rate * 7;

  let esito = 'OK';
  let dettaglio = `${lead7} lead in 7 giorni (${lead1} ieri) · ${contatti7} contatti totali`;
  if (atteso >= 2) {
    if (lead7 === 0) { esito = 'CRITICO'; dettaglio = `0 lead in 7 giorni (di solito ~${atteso.toFixed(1)}): verificare form/campagne`; }
    else { const delta = ((lead7 - atteso) / atteso) * 100; if (delta <= -60) { esito = 'WARNING'; dettaglio = `Lead in calo: ${lead7} in 7gg vs ~${atteso.toFixed(1)} attesi (${delta.toFixed(0)}%)`; } }
  }

  out.push({ json: { timestamp: new Date().toISOString(), agente: 'sentinella-ghl', cliente: cfg.cliente, check: 'ghl_lead', valore: lead7, baseline: rate.toFixed(1), esito, dettaglio, alert_inviato: false, serie_crm } });

  // CHECK completezza: i lead arrivati dal form (quelli col tag lead) devono
  // avere i campi obbligatori. Se mancano, la mappatura form → GHL è rotta.
  // Campi obbligatori dalla colonna di config `ghl_campi_obbligatori`
  // (es. "phone,email"); se vuota, telefono + email. Senza tag lead configurato
  // non si possono riconoscere i lead del form: controllo saltato.
  if (tagLead.length > 0) {
    const obbligatori = String(cfg.ghl_campi_obbligatori || 'phone,email')
      .split(',').map((x) => x.trim()).filter(Boolean);
    const da48 = fine - 2 * 86400000; // ultime 48 ore (fino a mezzanotte)
    const recenti = contatti.filter((c) => {
      const t = new Date(c.dateAdded).getTime();
      const tags = (c.tags || []).map((x) => String(x).trim().toLowerCase());
      return t >= da48 && t < fine && tags.some((tg) => tagLead.includes(tg));
    });
    const mancanti = {}; // campo → quanti lead ne sono privi
    let incompleti = 0;
    for (const c of recenti) {
      const vuoti = obbligatori.filter((campo) => !(c[campo] && String(c[campo]).trim()));
      if (vuoti.length > 0) {
        incompleti++;
        for (const v of vuoti) mancanti[v] = (mancanti[v] || 0) + 1;
      }
    }
    let eC = 'OK';
    let detC = recenti.length === 0
      ? 'Nessun lead dal form nelle ultime 48 ore da verificare'
      : `${recenti.length} lead dal form nelle ultime 48 ore, dati completi`;
    if (incompleti > 0) {
      const quota = incompleti / recenti.length;
      eC = quota >= 0.5 && incompleti >= 2 ? 'CRITICO' : 'WARNING';
      const elenco = Object.entries(mancanti)
        .map(([campo, n]) => `${n} senza ${NOMI_CAMPI[campo] || campo}`).join(', ');
      detC = `${incompleti} lead su ${recenti.length} delle ultime 48 ore con dati mancanti (${elenco}): possibile mappatura del form rotta`;
    }
    out.push({ json: { timestamp: new Date().toISOString(), agente: 'sentinella-ghl', cliente: cfg.cliente, check: 'ghl_completezza', valore: `${incompleti}/${recenti.length}`, baseline: obbligatori.join('+'), esito: eC, dettaglio: detC, alert_inviato: false } });
  }
}

return out;
