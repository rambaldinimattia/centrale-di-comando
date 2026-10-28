// Codice del nodo Code del workflow n8n `sentinella-ghl` che calcola i lead CRM
// (check ghl_lead) e la completezza dei dati dei lead (check ghl_completezza).
// Copia versionata: la fonte di verità è il nodo in n8n; tienila allineata.
const out = [];
const items = $input.all();

// Campi standard del contatto GHL, con il nome leggibile per il dettaglio.
// Tutto il resto in `ghl_campi_obbligatori` è un campo personalizzato.
const NOMI_CAMPI = {
  phone: 'telefono', email: 'email', firstName: 'nome', lastName: 'cognome',
  companyName: 'azienda', address1: 'indirizzo', city: 'città', postalCode: 'CAP',
  country: 'paese', source: 'fonte', dateOfBirth: 'data di nascita', website: 'sito',
};

// Nome o chiave di un campo, normalizzato per il confronto:
// "{{ contact.Pirnar_Showroom }}" → "pirnar_showroom"
const normalizza = (s) => String(s || '').toLowerCase().replace(/[{}]/g, '').trim().replace(/^contact\./, '');

// I contatti riportano i campi personalizzati solo per id: le definizioni
// (id → nome/chiave) si leggono da GHL una volta per location. null = non
// leggibili (manca token o location id, oppure GHL ha risposto errore).
const cacheCampi = {};
async function campiPersonalizzati(ctx, cfg) {
  const location = cfg.ghl_location_id;
  const token = cfg.ghl_token || cfg.ghl_api_key || cfg.ghl_access_token || cfg.token;
  if (!location || !token) return null;
  if (!(location in cacheCampi)) {
    try {
      const res = await ctx.helpers.httpRequest({
        method: 'GET',
        url: `https://services.leadconnectorhq.com/locations/${location}/customFields`,
        headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', Accept: 'application/json' },
        json: true,
      });
      cacheCampi[location] = res.customFields || [];
    } catch (err) {
      cacheCampi[location] = null;
    }
  }
  return cacheCampi[location];
}

// Il campo personalizzato `id` ha un valore nel contatto?
function campoPieno(c, id) {
  const lista = c.customFields || c.customField || [];
  const f = lista.find((x) => x.id === id);
  const v = f ? (f.value !== undefined ? f.value : f.field_value) : undefined;
  if (Array.isArray(v)) return v.length > 0;
  return v != null && String(v).trim() !== '';
}

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
  // avere i campi obbligatori, sia quelli compilati nel form sia quelli di
  // tracciamento scritti in automatico (ip, user_agent, consensi…). Se mancano,
  // la mappatura form → n8n → GHL è rotta da qualche parte.
  // Campi dalla colonna di config `ghl_campi_obbligatori`, separati da virgola:
  // standard (phone, email, firstName…) o personalizzati per chiave o nome
  // (es. "phone,email,ip,user_agent,consenso_privacy,pirnar_showroom").
  // Se vuota: telefono + email. Senza tag lead configurato non si possono
  // riconoscere i lead del form: controllo saltato.
  if (tagLead.length > 0) {
    const obbligatori = String(cfg.ghl_campi_obbligatori || 'phone,email')
      .split(',').map((x) => x.trim()).filter(Boolean);
    const da48 = fine - 2 * 86400000; // ultime 48 ore (fino a mezzanotte)
    const recenti = contatti.filter((c) => {
      const t = new Date(c.dateAdded).getTime();
      const tags = (c.tags || []).map((x) => String(x).trim().toLowerCase());
      return t >= da48 && t < fine && tags.some((tg) => tagLead.includes(tg));
    });

    // Risolve ogni campo richiesto: standard, oppure personalizzato → id GHL
    const note = [];
    const standardKey = (nome) => Object.keys(NOMI_CAMPI).find((k) => k.toLowerCase() === nome.toLowerCase());
    const richiesti = [];
    const personalizzati = obbligatori.filter((n) => !standardKey(n));
    let definizioni = [];
    if (personalizzati.length > 0) {
      definizioni = await campiPersonalizzati(this, cfg);
      if (definizioni === null) {
        note.push('campi personalizzati non verificati: impossibile leggerli da GHL (controlla token, location id e permessi)');
        definizioni = [];
      }
    }
    // Se la risposta dei contatti non porta i campi personalizzati, non si
    // possono verificare: meglio dirlo che segnalarli tutti come vuoti.
    const rispostaHaCampi = recenti.some((c) => Array.isArray(c.customFields) || Array.isArray(c.customField));
    const nonTrovati = [];
    for (const nome of obbligatori) {
      const std = standardKey(nome);
      if (std) { richiesti.push({ nome: NOMI_CAMPI[std], pieno: (c) => !!(c[std] && String(c[std]).trim()) }); continue; }
      if (definizioni.length === 0) continue; // già segnalato nelle note
      const def = definizioni.find((d) => normalizza(d.fieldKey) === normalizza(nome) || normalizza(d.name) === normalizza(nome));
      if (!def) { nonTrovati.push(nome); continue; }
      if (recenti.length > 0 && !rispostaHaCampi) continue;
      richiesti.push({ nome: def.name || nome, pieno: (c) => campoPieno(c, def.id) });
    }
    if (nonTrovati.length > 0) note.push(`campi non trovati in GHL: ${nonTrovati.join(', ')} (controlla i nomi in ghl_campi_obbligatori)`);
    if (recenti.length > 0 && !rispostaHaCampi && definizioni.length > 0) {
      note.push('la risposta GHL dei contatti non include i campi personalizzati: verificati solo i campi standard');
    }

    const mancanti = {}; // nome campo → quanti lead ne sono privi
    let incompleti = 0;
    for (const c of recenti) {
      const vuoti = richiesti.filter((r) => !r.pieno(c));
      if (vuoti.length > 0) {
        incompleti++;
        for (const r of vuoti) mancanti[r.nome] = (mancanti[r.nome] || 0) + 1;
      }
    }
    let eC = 'OK';
    let detC = recenti.length === 0
      ? 'Nessun lead dal form nelle ultime 48 ore da verificare'
      : `${recenti.length} lead dal form nelle ultime 48 ore, dati completi`;
    if (incompleti > 0) {
      const quota = incompleti / recenti.length;
      eC = quota >= 0.5 && incompleti >= 2 ? 'CRITICO' : 'WARNING';
      const elenco = Object.entries(mancanti).map(([campo, n]) => `${n} senza ${campo}`).join(', ');
      detC = `${incompleti} lead su ${recenti.length} delle ultime 48 ore con dati mancanti (${elenco}): possibile mappatura del form rotta`;
    }
    // Configurazione da sistemare: almeno un warning, così non resta invisibile
    if (note.length > 0) {
      if (eC === 'OK') eC = 'WARNING';
      detC += ` · ${note.join(' · ')}`;
    }
    out.push({ json: { timestamp: new Date().toISOString(), agente: 'sentinella-ghl', cliente: cfg.cliente, check: 'ghl_completezza', valore: `${incompleti}/${recenti.length}`, baseline: obbligatori.join('+'), esito: eC, dettaglio: detC, alert_inviato: false } });
  }
}

return out;
