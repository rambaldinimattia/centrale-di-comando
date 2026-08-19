# Contratto — check `campagne_issues` (Sentinella → dashboard)

La Centrale di Comando mostra, per ogni cliente, il **numero di campagne con
problemi** (0 = tutto in regola). Il dato arriva dalla riga che la Sentinella
scrive nella tab **`log`** con `check = campagne_issues`.

La Sentinella (workflow `agente-sentinella-core`, nodo `motore-confronto`) **lo
scrive già**: non serve modificare n8n.

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

## In dashboard

- Card **"Campagne con problemi"** = il numero di problemi (2° valore).
  - `0` → "Nessun problema di delivery"
  - `> 0` → numero in rosso, "Da verificare su Meta"
  - riga assente → "non monitorato · In attesa dalla Sentinella"
- Se `esito` è WARNING/CRITICO, la voce entra anche nella Cronologia alert, va
  al filtro `ce-anomalia` (quindi su Telegram) e concorre al semaforo del cliente.
