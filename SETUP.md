# Centrale di Comando — Guida al setup (passo passo)

Questa guida è pensata per chi **non è uno sviluppatore**. Segui i blocchi in ordine.
Alla fine avrai la dashboard online, protetta da password, che legge i dati veri
dal Google Sheet della Sentinella.

Tempo stimato: **30–40 minuti**, una volta sola.

---

## Panoramica: cosa collega cosa

```
  Agente Sentinella (n8n)  ──scrive ogni mattina──▶  Google Sheet "OMC_Sentinella"
                                                              │
                                                     legge (sola lettura)
                                                              ▼
                                            Centrale di Comando (questa app, su Vercel)
                                                              │
                                                        apri con password
                                                              ▼
                                                        Il tuo browser / telefono
```

L'app **non scrive mai** sullo Sheet: lo legge soltanto.

---

## PARTE A — Preparare il Google Sheet

Se lo Sheet `OMC_Sentinella` esiste già (creato dalla Sentinella), **salta alla Parte B**.
Le due tab devono avere queste intestazioni **esatte** nella **prima riga**:

**Tab `config`** (una riga per cliente):

| cliente | attivo | ad_account_id | dataset_id | n8n_workflow_ids | soglia_calo_eventi_warn | soglia_calo_eventi_crit | min_eventi_giorno | giorni_token_warn | spesa_max_giorno | telegram_tag |
|---------|--------|---------------|------------|------------------|-------------------------|-------------------------|-------------------|-------------------|------------------|--------------|

- `attivo`: scrivi `TRUE` o `FALSE`. I `FALSE` finiscono in fondo come "in onboarding".

**Tab `log`** (una riga per ogni check, aggiunta ogni giorno dalla Sentinella):

| timestamp | agente | cliente | check | valore | baseline | esito | dettaglio | alert_inviato |
|-----------|--------|---------|-------|--------|----------|-------|-----------|---------------|

- `check`: uno tra `volume_lead`, `zero_lead_spesa`, `spesa_giorno`, `cpl`, `campagne_issues`, `token`
- `esito`: uno tra `OK`, `WARNING`, `CRITICO`
- `alert_inviato`: `TRUE` o `FALSE`
- Colonna **futura** (opzionale): `azione_consigliata` — se la aggiungi, l'app la mostra
  automaticamente come "Diagnosi del Consigliere". Non serve toccare il codice.

> L'app mappa le colonne **per nome di intestazione**: puoi riordinarle o aggiungerne
> di nuove senza rompere nulla.

---

## PARTE B — Creare il Service Account Google (l'app che legge lo Sheet)

Un "service account" è un utente-robot che legge lo Sheet al posto tuo.

1. Vai su **https://console.cloud.google.com/** e accedi con l'account Google
   che possiede (o può accedere a) lo Sheet.
2. In alto, apri il selettore progetti → **Nuovo progetto**. Nome: `Centrale di Comando`. Crea.
   Assicurati che sia selezionato in alto.
3. Attiva l'API dei fogli:
   - Menu ☰ → **API e servizi** → **Libreria**.
   - Cerca **Google Sheets API** → aprila → **Abilita**.
4. Crea il service account:
   - Menu ☰ → **API e servizi** → **Credenziali**.
   - **+ Crea credenziali** → **Account di servizio**.
   - Nome: `sentinella-lettore`. **Crea e continua**. Ruoli: lascia vuoto → **Fine**.
5. Genera la chiave JSON:
   - Nella lista **Account di servizio**, clicca su quello appena creato.
   - Scheda **CHIAVI** → **Aggiungi chiave** → **Crea nuova chiave** → tipo **JSON** → **Crea**.
   - Si scarica un file `.json`. **Conservalo con cura, non condividerlo con nessuno.**
6. Copia l'**email** del service account (finisce con
   `...@....iam.gserviceaccount.com`): la trovi nella pagina del service account.
   Ti serve al passo successivo.

---

## PARTE C — Condividere lo Sheet con il Service Account

1. Apri il Google Sheet `OMC_Sentinella`.
2. In alto a destra: **Condividi**.
3. Incolla l'**email del service account** (quella `...gserviceaccount.com`).
4. Permesso: **Visualizzatore** (sola lettura). Togli la spunta "Notifica". **Invia**.

Ora il robot può leggere lo Sheet.

Copia anche l'**ID dello Sheet**: nell'URL del foglio è la parte tra `/d/` e `/edit`:
`https://docs.google.com/spreadsheets/d/`**`QUESTO_È_L_ID`**`/edit`

---

## PARTE D — Scegliere la password d'accesso

L'app non salva la password in chiaro, ma il suo "hash" SHA-256.

Dalla cartella del progetto, in un terminale:

```bash
node scripts/genera-hash.mjs "la-tua-password-scelta"
```

Copia la riga che stampa, es. `PASSWORD_HASH=fff0905a...`. Ti serve tra poco.

---

## PARTE E — Pubblicare su Vercel

1. Crea un account gratuito su **https://vercel.com** (accedi con GitHub è comodo).
2. Metti questo progetto in un repository GitHub (oppure usa "Deploy" da cartella con la CLI Vercel).
   - Modo semplice: crea un repo su GitHub, carica questi file, poi su Vercel
     **Add New… → Project → Import** il repo.
3. Prima di premere **Deploy**, apri **Environment Variables** e aggiungi **tre** variabili:

   | Nome | Valore |
   |------|--------|
   | `GOOGLE_SERVICE_ACCOUNT_KEY` | Incolla **tutto** il contenuto del file `.json` scaricato (dalla `{` alla `}`). |
   | `SHEET_ID` | L'ID dello Sheet copiato nella Parte C. |
   | `PASSWORD_HASH` | Il valore generato nella Parte D (solo la parte dopo `=`). |

   > `GOOGLE_SERVICE_ACCOUNT_KEY` è un JSON lungo con virgolette e `\n`: incollalo
   > così com'è, per intero. L'app gestisce da sola gli a-capo della chiave privata.

4. **Deploy**. Dopo 1–2 minuti avrai un URL tipo `https://centrale-di-comando.vercel.app`.
5. Aprilo: comparirà la schermata **Accesso**. Inserisci la password scelta nella Parte D.

Fatto. La dashboard mostra i dati veri dello Sheet.

---

## PARTE F — Installarla come app (desktop e telefono)

- **Desktop (Chrome/Edge)**: apri l'URL → icona "installa" nella barra indirizzi
  (o menu ⋮ → "Installa Centrale di Comando"). Si apre in finestra propria.
- **iPhone (Safari)**: Condividi → "Aggiungi a Home".
- **Android (Chrome)**: menu ⋮ → "Aggiungi a schermata Home".

---

## Uso quotidiano

- I dati si aggiornano da soli (rilettura dello Sheet ogni 5 minuti).
- Il bottone **Aggiorna** in alto forza una rilettura immediata.
- Colori: 🟢 in salute · 🟠 da monitorare · 🔴 critico.
- Le card sono ordinate dal più critico. Clicca una card per vederne il dettaglio.

---

## Se qualcosa non va

- **Vedo "DATI DIMOSTRATIVI"** → le variabili d'ambiente non sono impostate (o l'app
  non le vede). Controlla `GOOGLE_SERVICE_ACCOUNT_KEY` e `SHEET_ID` su Vercel, poi
  ridistribuisci (Deployments → … → Redeploy).
- **Banner giallo "Impossibile leggere il Google Sheet"** → di solito lo Sheet non è
  stato condiviso con l'email del service account, oppure l'ID è sbagliato, oppure la
  Google Sheets API non è abilitata. Il testo tecnico nel banner aiuta a capire.
- **Non ricordo la password** → rigenera un hash nuovo (Parte D), aggiorna
  `PASSWORD_HASH` su Vercel e ridistribuisci.

---

## Girare l'app in locale (facoltativo)

```bash
npm install
npm run dev
```

Apri http://localhost:3000. Senza il file `.env.local` compilato, l'app parte con i
**dati dimostrativi** (utile per vedere subito com'è fatta). Per collegarla ai dati veri
in locale, copia `.env.local.example` in `.env.local` e compila i tre valori.
