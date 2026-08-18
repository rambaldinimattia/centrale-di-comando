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
| `valore` | **numero di campagne con problemi** (es. `0`, `2`) |
| `esito` | `OK` se 0 problemi, altrimenti `WARNING`/`CRITICO` (a scelta della Sentinella) |
| `dettaglio` | testo libero (es. `2 campagne con problemi di approvazione`) |
| `alert_inviato` | `TRUE`/`FALSE` |

`cliente`, `timestamp`, `agente` come gli altri check.

## In dashboard

- Card **"Campagne con problemi"** = il numero in `valore`.
  - `0` → "Nessun problema di delivery"
  - `> 0` → numero in rosso, "Da verificare su Meta"
  - riga assente → "non monitorato · In attesa dalla Sentinella"
- Se `esito` è WARNING/CRITICO, la voce entra anche nella Cronologia alert e
  concorre al semaforo del cliente.
