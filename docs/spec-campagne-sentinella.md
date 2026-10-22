# Contratto — check `campagne_issues` (Sentinella → dashboard)

La Centrale di Comando mostra, per ogni cliente, il **numero di campagne con
problemi** (0 = tutto in regola). Il dato arriva dalla riga che la Sentinella
scrive nella tab **`log`** con `check = campagne_issues`.

La Sentinella (workflow `agente-sentinella-core`, nodo `motore-confronto`) **lo
scrive già**. Va aggiornata solo la regola su quali campagne contare (vedi
"Regola: contano SOLO le campagne accese da noi" più sotto).

## Formato della riga (tab `log`)

| colonna | valore |
|---|---|
| `check` | `campagne_issues` |
| `valore` | **`attive/problemi`** (es. `1/0`, `6/2`) — la dashboard usa il **2° numero** (i problemi) |
| `esito` | `OK` se 0 problemi; `WARNING`/`CRITICO` se ci sono problemi (a scelta della Sentinella) |
| `dettaglio` | testo libero (es. `6 campagne attive, 2 con problemi di approvazione`) |
| `alert_inviato` | `TRUE`/`FALSE` |

`cliente`, `timestamp`, `agente` come gli altri check.

> La dashboard è tollerante: se il `valore` fosse un **numero singolo** lo
> interpreta direttamente come conteggio dei problemi.

## Regola: contano SOLO le campagne accese da noi

Una campagna con problemi è un allarme **solo se è attiva**. Se l'abbiamo spenta
noi (o archiviata/eliminata), i suoi problemi non ci riguardano e **non vanno
segnalati**.

Il criterio è lo stato **impostato da noi** (`status`, detto anche
`configured_status`), non lo stato effettivo calcolato da Meta
(`effective_status`):

- `status = ACTIVE` → la campagna è accesa da noi → **si valuta**
- `status = PAUSED` / `ARCHIVED` / `DELETED` → spenta da noi → **si ignora**,
  anche se Meta la segnala con problemi

Fra le campagne accese, è "con problemi" quella con `effective_status` in
`WITH_ISSUES` / `DISAPPROVED`, oppure con `issues_info` non vuoto.

La chiamata Meta deve quindi chiedere anche `status`:

```
GET /v21.0/{ad_account_id}/campaigns
  ?fields=name,status,effective_status,issues_info
```

Logica per il nodo `motore-confronto` (da adattare ai nomi delle variabili del nodo):

```js
const PROBLEMI = ["WITH_ISSUES", "DISAPPROVED"];
const campagne = risposta.data ?? []; // risposta di GET /campaigns

// Solo le campagne lasciate accese da noi
const accese = campagne.filter((c) => (c.status ?? c.configured_status) === "ACTIVE");
const conProblemi = accese.filter(
  (c) => PROBLEMI.includes(c.effective_status) || (c.issues_info?.length ?? 0) > 0
);

const valore = `${accese.length}/${conProblemi.length}`; // attive/problemi
const esito = conProblemi.length === 0 ? "OK" : "CRITICO";
```

Così `attive` = campagne accese da noi e `problemi` = problemi solo su quelle:
una campagna spenta con problemi dà `0/0` → OK, e non colora più il cliente.

## In dashboard

- Card **"Campagne con problemi"** = il numero di problemi (2° valore).
  - `0` → "Nessun problema di delivery"
  - `> 0` → numero in rosso, "Da verificare su Meta"
  - riga assente → "non monitorato · In attesa dalla Sentinella"
- Se `esito` è WARNING/CRITICO, la voce entra anche nella Cronologia alert, va
  al filtro `ce-anomalia` (quindi su Telegram) e concorre al semaforo del cliente.
