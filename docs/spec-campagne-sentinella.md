# Specifica — Monitoraggio campagne attive (per la Sentinella / n8n)

Obiettivo: far comparire nella Centrale di Comando, per ogni cliente, il numero
di **campagne attive** e di **campagne con problemi**. La dashboard è **già
pronta**: mostra il dato appena la Sentinella scrive, ogni mattina, una riga con
`check = campagne_issues` nella tab **`log`** del foglio `OMC_Sentinella`.

Non serve modificare la dashboard. Serve solo aggiungere un passaggio al workflow
n8n che già gira per ogni cliente.

---

## La riga da aggiungere nella tab `log`

Una riga per cliente, per esecuzione (come gli altri check). Colonne:

| colonna | valore da scrivere |
|---|---|
| `timestamp` | lo stesso dell'esecuzione (es. `2026-08-19 08:00:00`) |
| `agente` | `Sentinella` |
| `cliente` | il nome del cliente **identico** a come è scritto nella tab `config` (es. `OMC`) |
| `check` | `campagne_issues` |
| `valore` | **`ATTIVE/PROBLEMI`** — es. `5/0` (5 attive, 0 con problemi) · `6/2` (6 attive, 2 con problemi) |
| `baseline` | facoltativo (lascia vuoto, oppure il numero di campagne attese) |
| `esito` | `OK` · `WARNING` · `CRITICO` (regole sotto) |
| `dettaglio` | testo leggibile (es. `6 campagne attive, 2 con problemi di approvazione`) |
| `alert_inviato` | `TRUE` se hai mandato l'avviso Telegram, altrimenti `FALSE` |

> Formato di `valore`: **numero attive / numero con problemi**, separatore `/`.
> La dashboard accetta anche solo il numero di attive (es. `5`) se non calcoli i
> problemi, ma il formato consigliato è `attive/problemi`.

---

## Come calcolare "attive" e "problemi" da Meta

Chiamata Graph API (una per cliente, usando l'`ad_account_id` della tab `config`):

```
GET https://graph.facebook.com/v21.0/{ad_account_id}/campaigns
    ?fields=name,effective_status,issues_info
    &limit=200
    &access_token={TOKEN}
```

Conteggi consigliati sui risultati:

- **attive** = campagne con `effective_status` = `ACTIVE`
- **problemi** = campagne che hanno `issues_info` non vuoto, **oppure**
  `effective_status` in { `WITH_ISSUES`, `DISAPPROVED` }

(Le campagne `PAUSED`, `ARCHIVED`, `DELETED` non si contano né tra le attive né
tra i problemi.)

`valore` = `${attive}/${problemi}`

---

## Regole di esito consigliate (personalizzabili)

- **CRITICO** se `attive == 0` → l'account non ha campagne in erogazione
- **WARNING** se `problemi > 0` → almeno una campagna attiva ha problemi
- **OK** altrimenti

Queste regole determinano anche il **semaforo** del cliente in dashboard (viene
preso l'esito peggiore tra tutti i suoi check) e, se imposti `alert_inviato=TRUE`,
la voce compare nella cronologia con la nota "inviato su Telegram".

Se in futuro vuoi una soglia dedicata (es. `min_campagne_attive`), si può
aggiungere una colonna nella tab `config` e leggerla nella logica n8n — la
dashboard non va comunque toccata.

---

## Esempi di riga (già coerenti con la dashboard)

```
2026-08-19 08:00:00 | Sentinella | OMC        | campagne_issues | 5/0 |   | OK       | 5 campagne attive, nessun problema                 | FALSE
2026-08-19 08:00:00 | Sentinella | labi studio| campagne_issues | 6/2 |   | WARNING  | 6 campagne attive, 2 con problemi di approvazione  | TRUE
2026-08-19 08:00:00 | Sentinella | new house  | campagne_issues | 0/0 |   | CRITICO  | Nessuna campagna attiva sull'account               | TRUE
```

---

## Cosa succede in dashboard (a conferma)

- La card **"Campagne"** del cliente mostra `attive / con problemi` (es. `6 / 2`);
  diventa rossa se `problemi > 0`.
- Finché la Sentinella non scrive questa riga, la card mostra **"non monitorato ·
  In attesa dalla Sentinella"** (comportamento voluto, non un errore).
- La voce entra anche nella **Cronologia alert** se l'esito è WARNING o CRITICO.
