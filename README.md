# Centrale di Comando · One Marketing Consulting

Dashboard in **sola lettura** che mostra lo stato di salute degli account pubblicitari
Meta dei clienti OMC. È alimentata dal Google Sheet `OMC_Sentinella` che l'**Agente
Sentinella** (workflow n8n) compila ogni mattina alle 8:00.

Colpo d'occhio di 30 secondi: chi sta male, quanto si è speso ieri, quanti lead sono
arrivati, la cronologia degli alert.

## Setup

Guida completa passo-passo (per non sviluppatori): **[SETUP.md](SETUP.md)**.

In sintesi servono tre variabili d'ambiente su Vercel:

- `GOOGLE_SERVICE_ACCOUNT_KEY` — JSON del service account Google (lettura Sheet)
- `SHEET_ID` — ID del Google Sheet `OMC_Sentinella`
- `PASSWORD_HASH` — hash SHA-256 della password d'accesso
  (`node scripts/genera-hash.mjs "password"`)

Senza queste variabili l'app parte con **dati dimostrativi**.

## Stack

- Next.js 14 (App Router) · React · Tailwind CSS
- Google Sheets API via service account (sola lettura)
- Rilettura server-side ogni 5 min (`revalidate 300`) + bottone Aggiorna
- Auth a password unica (SHA-256) + cookie di sessione (middleware)
- PWA installabile · interfaccia in italiano

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:3000 (dati mock senza .env.local)
npm run build    # build di produzione
```

## Struttura

```
app/               pagine (dashboard, login) + API login
components/         Header, ClientCard/Grid, ClientDetail, HistoryChart, AlertFeed, …
lib/
  types.ts         modello dati (config + log dello Sheet)
  sheets.ts        lettura Google Sheets (mappatura per intestazione)
  derive.ts        logica: stati, ordinamento gravità, storico 7gg, feed
  data.ts          orchestratore (Sheet reale ↔ mock di fallback)
  mock.ts          dati dimostrativi
  auth.ts          hashing password + token sessione (Web Crypto)
  format.ts        formattazione italiana
middleware.ts      protezione password delle pagine
public/            manifest PWA + icone
scripts/           genera-hash.mjs
```

## Fuori scope v1

Dati live infragiornalieri, scrittura sullo Sheet, vista white-label cliente,
moduli non-adv, dark mode, multi-utente.
