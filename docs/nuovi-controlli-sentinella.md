# Nuovi controlli Sentinella — specifica per n8n

Questi due controlli nascono nel workflow **n8n** (chiamate a Meta) e scrivono una
riga nella tab **`log`** del Google Sheet `OMC_Sentinella`, esattamente come gli
altri check. La **Centrale di Comando è già pronta a leggerli**: ha i tipi, le
etichette ("Pixel / CAPI", "Erogazione") e i consigli del Consigliere. Appena la
Sentinella inizia a scrivere queste righe, compaiono da sole nel feed, colorano il
cliente (regola della freschezza: conta l'ultimo giro) e, se in allarme, mostrano
l'azione consigliata.

## Formato della riga `log` (promemoria colonne)

| colonna | contenuto |
|---|---|
| `timestamp` | ISO o `YYYY-MM-DD HH:mm:ss` del momento del check |
| `agente` | es. `Sentinella` (Meta) |
| `cliente` | nome cliente, **identico** a quello in `config` |
| `check` | `pixel_capi` oppure `erogazione` (esatti) |
| `valore` | vedi sotto per ciascun check |
| `baseline` | valore atteso/di riferimento |
| `esito` | `OK` · `WARNING` · `CRITICO` |
| `dettaglio` | frase leggibile mostrata su card e feed |
| `alert_inviato` | `true` se hai mandato il Telegram, altrimenti `false` |
| `azione_consigliata` | opzionale: se vuota, la Centrale usa il consiglio di default |

---

## 1) `pixel_capi` — Salute del tracciamento (Pixel / CAPI)

> **Stato: in sospeso, da riprogettare.** La versione descritta qui sotto (volume
> degli eventi lead da `/insights`) è già coperta da `volume_lead` e
> `zero_lead_spesa`: il nodo `motore-confronto` legge già gli eventi
> `onsite_web_lead` / `lead`. Il valore aggiunto vero sarebbe leggere il
> **dataset** (`dataset_id`) per capire *quali* eventi arrivano: PageView sì e
> Lead no → form rotto; nessun evento → pixel rimosso dalla landing.

**Perché**: è la causa tecnica n.1 del vostro alert "zero lead con spesa". Se gli
eventi non arrivano, state ottimizzando alla cieca.

**Fonte dati (Meta Graph API)**

- **Volume eventi** (via già usato `/insights`): conta l'evento di conversione
  configurato (tipicamente `lead` / `offsite_conversion.fct.lead` / `onsite_conversion.lead_grouped`)
  dentro il campo `actions`, con `date_preset=last_3d` (o `time_range` ultimi 3 giorni).
  ```
  GET /v21.0/{ad_account_id}/insights
    ?fields=spend,actions
    &date_preset=last_3d
  ```
  Dalla risposta: `eventi = actions.find(a => a.action_type ∈ {lead, offsite_conversion.fct.lead, ...}).value` (0 se assente).
- **(Opzionale) Event Match Quality / server events**: se accessibile per il
  `dataset_id` del cliente, puoi arricchire con la qualità del match; non è
  obbligatorio per far scattare il controllo.

**Calcolo e soglie**

- `baseline` = media giornaliera eventi su 7 giorni (o `min_eventi_giorno` dal config).
- **CRITICO**: `eventi == 0` **e** `spend > 0` nelle ultime 24–72h → tracciamento rotto.
- **WARNING**: `eventi > 0` ma **calo ≥ 50%** rispetto alla baseline (usa
  `soglia_calo_eventi_warn/crit` dal config se preferisci la stessa logica del volume lead).
- **OK**: eventi in linea con la baseline.

**`valore`**: numero di eventi nel periodo (es. `0`, `12`).

**Esempio riga (CRITICO)**
```
timestamp: 2026-10-22 08:05:00
agente: Sentinella
cliente: Palestra BodyFit Milano
check: pixel_capi
valore: 0
baseline: 6
esito: CRITICO
dettaglio: Nessun evento Pixel/CAPI nelle ultime 72h con spesa attiva: tracciamento interrotto.
alert_inviato: true
```

---

## 2) `erogazione` — Delivery / inserzione ferma (sottospesa)

> **Stato: implementato** come CHECK 9 dentro il nodo `motore-confronto` (stessa
> tecnica del CHECK 8 sullo stato account: chiamata a Meta dal codice, nessun
> nodo nuovo). Codice completo versionato in [`n8n/motore-confronto.js`](../n8n/motore-confronto.js).

**Perché**: l'altra metà di "zero lead con spesa". Oggi avvisate se spendete *sopra*
il tetto, ma non se un'inserzione **ha smesso di erogare** (in pausa, in revisione,
budget esaurito). Spesa quasi nulla = nessun lead, in silenzio.

**Fonte dati (Meta Graph API)**

- **Spesa di ieri** (già disponibile da `/insights`, `spend`, `date_preset=yesterday`).
- **Budget atteso**: somma dei budget giornalieri degli **ad set attivi** (o budget a
  livello campagna se usano CBO):
  ```
  GET /v21.0/{ad_account_id}/adsets
    ?fields=name,effective_status,daily_budget,lifetime_budget
    &effective_status=['ACTIVE']
  ```
  `atteso = somma(daily_budget degli ad set ACTIVE) / 100` (Meta restituisce i budget in centesimi).
  In mancanza di budget giornaliero leggibile, usa come atteso la **media spesa 7 giorni**.

**Calcolo e soglie**

- `erogato% = spesa_ieri / atteso`.
- **CRITICO**: `erogato% < 0.30` (eroga meno del 30% dell'atteso) → di fatto ferma.
- **WARNING**: `0.30 ≤ erogato% < 0.60`.
- **OK**: `erogato% ≥ 0.60`.
- Ignora il controllo se `atteso` ≈ 0 (nessun ad set attivo per scelta).

**`valore`**: percentuale di erogazione come intero, es. `4%` (oppure `spesa/atteso`, es. `3/85`).

**Esempio riga (CRITICO)**
```
timestamp: 2026-10-22 08:05:00
agente: Sentinella
cliente: Studio Dentistico Bianchi
check: erogazione
valore: 4%
baseline: 80
esito: CRITICO
dettaglio: Erogazione al 4% del budget atteso (3€ su 80€): inserzione ferma o in revisione.
alert_inviato: true
```

---

## Come si legano al resto della Centrale

- Entrambi **colorano la card** del cliente e finiscono nel **feed alert**, con il
  consiglio pratico del Consigliere già pronto (vedi `lib/consigliere.ts`).
- Un `pixel_capi` o `erogazione` in allarme **spiega** il punto di rottura
  `Spesa → Lead` che il **Funnel** evidenzia: insieme danno sintomo + causa.
- Valgono le regole esistenti: la riga più recente per tipo di check governa lo
  stato (finestra ~20h), quindi scrivile allo stesso giro del mattino.
