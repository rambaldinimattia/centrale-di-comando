// Codice del nodo Code `motore-confronto` (workflow n8n `agente-sentinella-core`).
// Copia versionata: la fonte di verità è il nodo in n8n; tienila allineata.
const out = [];
const items = $input.all();

for (let i = 0; i < items.length; i++) {
  const cfg = $('assegna-token').all()[i].json;
  const insights = $('volume-eventi').all()[i]?.json.data || [];
  const tok = $('check-token').all()[i]?.json.data || {};
  const campagne = items[i].json.data || [];

  // Insights per INSERZIONE (ultimi 7 giorni)
  const adRaw = $('insights-ad').all()[i]?.json.data || [];
  const perAd = adRaw.map(a => {
    const l = (a.actions || []).find(x => x.action_type === 'onsite_web_lead' || x.action_type === 'lead');
    return {
      ad: a.ad_name || 's.n.', camp: a.campaign_name || 's.n.',
      spend: Number(a.spend || 0), lead: l ? Number(l.value) : 0,
      impr: Number(a.impressions || 0), ctr: Number(a.ctr || 0),
      freq: Number(a.frequency || 0), cpm: Number(a.cpm || 0),
    };
  });
  const sprechi = perAd.filter(a => a.spend > 0 && a.lead === 0).sort((x, y) => y.spend - x.spend);
  const produttive = perAd.filter(a => a.lead > 0).sort((x, y) => y.lead - x.lead);
  const perCpl = perAd.filter(a => a.lead > 0).map(a => ({ ...a, cpl: a.spend / a.lead })).sort((x, y) => y.cpl - x.cpl);
  const nome = a => `«${a.camp}» / «${a.ad}»`;

  const righe = [];

  // --- Dati lead/spesa per giorno ---
  const giorni = insights.map(g => {
    const a = (g.actions || []).find(x => x.action_type === 'onsite_web_lead' || x.action_type === 'lead');
    return { date: g.date_start, lead: a ? Number(a.value) : 0, spend: Number(g.spend || 0) };
  });
  const ieri = giorni[giorni.length - 1] || { lead: 0, spend: 0 };
  const prec = giorni.slice(0, -1);

  // --- Valutazione su FINESTRA di 7 giorni ---
  const FIN = 7;
  const recentDays = giorni.slice(-FIN);
  const baseDays = giorni.length > FIN ? giorni.slice(0, giorni.length - FIN) : giorni;
  const rate = baseDays.length ? baseDays.reduce((s, g) => s + g.lead, 0) / baseDays.length : 0;
  const nGiorni = recentDays.length;
  const leadWin = recentDays.reduce((s, g) => s + g.lead, 0);
  const spesaWin = recentDays.reduce((s, g) => s + g.spend, 0);
  const atteso = rate * nGiorni;

  // CHECK 1: volume lead
  let e1 = 'OK';
  let det1 = `Lead ieri: ${ieri.lead} · ultimi ${nGiorni}gg: ${leadWin}`;
  if (leadWin > 0 && atteso >= 1) {
    const deltaW = ((leadWin - atteso) / atteso) * 100;
    if (deltaW <= Number(cfg.soglia_calo_eventi_crit)) e1 = 'CRITICO';
    else if (deltaW <= Number(cfg.soglia_calo_eventi_warn)) e1 = 'WARNING';
    det1 = `Lead ultimi ${nGiorni}gg: ${leadWin} vs ~${atteso.toFixed(1)} attesi (${deltaW.toFixed(0)}%)`;
  }
  if (e1 !== 'OK') {
    const parti = [];
    if (produttive[0]) parti.push(`i lead arrivano da ${nome(produttive[0])} (${produttive[0].lead})`);
    if (sprechi[0]) parti.push(`spende senza produrre ${nome(sprechi[0])} (${sprechi[0].spend.toFixed(0)}€)`);
    if (parti.length) det1 += ` · ${parti.join('; ')}`;
  }
  righe.push({ check: 'volume_lead', valore: ieri.lead, baseline: rate.toFixed(1), esito: e1, dettaglio: det1 });

  // CHECK 2: spesa senza lead sulla finestra
  if (spesaWin > 5 && leadWin === 0 && atteso >= 2) {
    let det2 = `${nGiorni} giorni, ${spesaWin.toFixed(0)}€ spesi e ZERO lead (di solito ~${atteso.toFixed(1)}): verificare tracking e delivery`;
    if (sprechi[0]) det2 += ` · principale: ${nome(sprechi[0])} (${sprechi[0].spend.toFixed(0)}€)`;
    righe.push({ check: 'zero_lead_spesa', valore: 0, baseline: spesaWin.toFixed(0) + '€', esito: 'CRITICO', dettaglio: det2 });
  }

  // CHECK 3: spesa vs tetto
  righe.push({ check: 'spesa_giorno', valore: ieri.spend, baseline: cfg.spesa_max_giorno,
    esito: ieri.spend > Number(cfg.spesa_max_giorno) ? 'WARNING' : 'OK',
    dettaglio: `Spesa ieri: ${ieri.spend}€ vs tetto ${cfg.spesa_max_giorno}€` });

  // CHECK 4: CPL fuori controllo
  const cplIeri = ieri.lead > 0 ? ieri.spend / ieri.lead : null;
  const spesaPrec = prec.reduce((s, g) => s + g.spend, 0);
  const leadPrec = prec.reduce((s, g) => s + g.lead, 0);
  const cplMedio = leadPrec > 0 ? spesaPrec / leadPrec : null;
  if (cplIeri && cplMedio && leadPrec >= 3) {
    const dCpl = ((cplIeri - cplMedio) / cplMedio) * 100;
    let det4 = `CPL ieri: ${cplIeri.toFixed(2)}€ vs media ${cplMedio.toFixed(2)}€ (${dCpl.toFixed(0)}%)`;
    if (dCpl >= 80 && perCpl[0]) det4 += ` · peggiore: ${nome(perCpl[0])} (${perCpl[0].cpl.toFixed(2)}€)`;
    righe.push({ check: 'cpl', valore: cplIeri.toFixed(2), baseline: cplMedio.toFixed(2),
      esito: dCpl >= 80 ? 'WARNING' : 'OK', dettaglio: det4 });
  }

  // CHECK 5: stato campagne e problemi delivery
  // Contano solo le campagne ACCESE (ACTIVE, o accese ma con problemi WITH_ISSUES).
  // Quelle spente da noi (PAUSED) si ignorano, anche se Meta le segnala con problemi.
  const accese = campagne.filter(c => c.effective_status === 'ACTIVE' || c.effective_status === 'WITH_ISSUES');
  const conProblemi = accese.filter(c => c.effective_status === 'WITH_ISSUES' || (c.issues_info || []).length > 0);
  const valoreCamp = accese.length + '/' + conProblemi.length;
  if (accese.length === 0) {
    righe.push({ check: 'campagne_issues', valore: valoreCamp, baseline: 0, esito: 'CRITICO', dettaglio: 'Nessuna campagna attiva sull\'account' });
  } else if (conProblemi.length > 0) {
    righe.push({ check: 'campagne_issues', valore: valoreCamp, baseline: 0, esito: 'CRITICO',
      dettaglio: `Campagne con problemi: ${conProblemi.map(c => c.name + ' (' + ((c.issues_info || [])[0]?.error_summary || 'issue') + ')').join('; ')}` });
  } else {
    righe.push({ check: 'campagne_issues', valore: valoreCamp, baseline: 0, esito: 'OK', dettaglio: `${accese.length} campagne attive, nessun problema di delivery` });
  }

  // CHECK 7: stanchezza creatività (frequenza alta / CTR sotto la media dell'account)
  const spenders = perAd.filter(a => a.spend > 5 && a.impr > 0);
  const imprTot = spenders.reduce((s, a) => s + a.impr, 0);
  const ctrMedio = imprTot > 0 ? spenders.reduce((s, a) => s + a.ctr * a.impr, 0) / imprTot : 0;
  const stanche = spenders.filter(a => a.freq >= 4 || (a.freq >= 3 && ctrMedio > 0 && a.ctr < ctrMedio * 0.6));
  if (stanche.length > 0) {
    const lista = stanche.sort((x, y) => y.freq - x.freq).slice(0, 3)
      .map(a => `${nome(a)} (freq ${a.freq.toFixed(1)}, CTR ${a.ctr.toFixed(2)}%)`).join('; ');
    righe.push({ check: 'stanchezza', valore: stanche.length, baseline: ctrMedio.toFixed(2) + '%', esito: 'WARNING',
      dettaglio: `Creatività da rinnovare (frequenza alta/CTR in calo): ${lista}` });
  }

  // CHECK 6: token
  if (!tok.is_valid) righe.push({ check: 'token', valore: 'invalid', baseline: '-', esito: 'CRITICO', dettaglio: 'Token NON valido' });
  else if (Number(tok.expires_at) === 0) righe.push({ check: 'token', valore: 'valido', baseline: 'mai', esito: 'OK', dettaglio: 'Token valido, nessuna scadenza' });
  else {
    const gg = Math.floor((tok.expires_at * 1000 - Date.now()) / 86400000);
    righe.push({ check: 'token', valore: 'valido', baseline: gg + 'gg', esito: gg < Number(cfg.giorni_token_warn) ? 'WARNING' : 'OK', dettaglio: `Token valido, scade tra ${gg} giorni` });
  }

  // CHECK 8: stato account pubblicitario (disabilitato / pagamento / limite spesa)
  try {
    const acc = await this.helpers.httpRequest({
      method: 'GET',
      url: `https://graph.facebook.com/v21.0/${cfg.ad_account_id}`,
      qs: { fields: 'account_status,disable_reason,spend_cap,amount_spent', access_token: cfg.meta_token },
      json: true,
    });
    const STATUS = {1:'attivo',2:'DISABILITATO',3:'NON SALDATO',7:'in revisione rischio',8:'in attesa pagamento',9:'periodo di grazia',100:'in chiusura',101:'CHIUSO'};
    const DISABLE = {1:'violazione policy',2:'revisione IP',3:'problema di pagamento',4:'account chiuso',5:'revisione AFC',7:'chiusura permanente'};
    const st = Number(acc.account_status);
    const cap = Number(acc.spend_cap || 0);
    const spent = Number(acc.amount_spent || 0);
    let e8 = 'OK', det8 = 'Account attivo';
    if (st !== 1) {
      const motivo = DISABLE[Number(acc.disable_reason)] ? ` (${DISABLE[Number(acc.disable_reason)]})` : '';
      e8 = 'CRITICO';
      det8 = `Account ${STATUS[st] || st}${motivo}: campagne a rischio stop`;
    } else if (cap > 0 && spent >= cap) {
      e8 = 'CRITICO';
      det8 = 'Limite di spesa dell\'account raggiunto: le campagne si fermano';
    } else if (cap > 0 && spent >= cap * 0.9) {
      e8 = 'WARNING';
      det8 = `Vicino al limite di spesa (${Math.round(spent / cap * 100)}%)`;
    }
    righe.push({ check: 'stato_account', valore: STATUS[st] || String(st), baseline: '', esito: e8, dettaglio: det8 });
  } catch (err) {}

  // CHECK 9: erogazione — l'inserzione spende il budget o si è fermata?
  // Confronta la spesa di ieri con il budget giornaliero degli ad set ACCESI.
  // Se il budget non è leggibile (budget a vita), usa la spesa media dei 7 giorni prima.
  try {
    const res = await this.helpers.httpRequest({
      method: 'GET',
      url: `https://graph.facebook.com/v21.0/${cfg.ad_account_id}/adsets`,
      qs: {
        fields: 'name,daily_budget,campaign{id,daily_budget}',
        filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]),
        limit: 200,
        access_token: cfg.meta_token,
      },
      json: true,
    });
    const adsets = res.data || [];
    // Budget dell'ad set; se usa il budget di campagna (CBO) conta quello della campagna, una volta sola
    let budget = 0;
    const campagneCbo = new Set();
    for (const s of adsets) {
      if (Number(s.daily_budget) > 0) {
        budget += Number(s.daily_budget) / 100; // Meta restituisce i budget in centesimi
      } else if (s.campaign && Number(s.campaign.daily_budget) > 0 && !campagneCbo.has(s.campaign.id)) {
        campagneCbo.add(s.campaign.id);
        budget += Number(s.campaign.daily_budget) / 100;
      }
    }
    const prec7 = prec.slice(-7);
    const mediaSpesa = prec7.length ? prec7.reduce((s, g) => s + g.spend, 0) / prec7.length : 0;
    const previsto = budget > 0 ? budget : mediaSpesa;
    const fonte = budget > 0 ? 'budget giornaliero' : 'media spesa 7gg';
    // Nessun ad set acceso (cliente in pausa per scelta) o importi trascurabili: niente controllo
    if (adsets.length > 0 && previsto >= 5) {
      const quota = ieri.spend / previsto;
      const pct = Math.round(quota * 100);
      const e9 = quota < 0.3 ? 'CRITICO' : quota < 0.6 ? 'WARNING' : 'OK';
      let det9 = `Erogazione ieri al ${pct}% del previsto: ${ieri.spend.toFixed(0)}€ su ${previsto.toFixed(0)}€ (${fonte})`;
      if (e9 !== 'OK') det9 += ' · inserzioni ferme, in revisione o con budget esaurito';
      righe.push({ check: 'erogazione', valore: pct + '%', baseline: previsto.toFixed(0), esito: e9, dettaglio: det9 });
    }
  } catch (err) {}

  for (const o of righe) {
    out.push({ json: { timestamp: new Date().toISOString(), agente: 'sentinella', cliente: cfg.cliente, ...o, alert_inviato: false } });
  }
}

return out;
