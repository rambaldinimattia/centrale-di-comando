import { Nav } from "@/components/Nav";

export const metadata = {
  title: "Leggenda · Centrale di Comando",
};

// ─────────────────────────────────────────────────────────────
// Pagina informativa: spiega ogni elemento della Centrale di
// Comando e come viene calcolato. Solo contenuto statico.
// ─────────────────────────────────────────────────────────────

function Chip({ colore, testo }: { colore: string; testo: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium"
      style={{ color: colore }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: 9999,
          background: colore,
          display: "inline-block",
        }}
      />
      {testo}
    </span>
  );
}

function Sezione({
  titolo,
  intro,
  children,
}: {
  titolo: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="cifra text-bordeaux text-3xl mb-1">{titolo}</h2>
      {intro && <p className="text-sm text-taupe mb-5 max-w-2xl">{intro}</p>}
      <div className="grid gap-px bg-bordo border border-bordo">{children}</div>
    </section>
  );
}

function Voce({
  termine,
  children,
  come,
}: {
  termine: string;
  children: React.ReactNode;
  come?: React.ReactNode;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <p className="etichetta text-inchiostro mb-1.5">{termine}</p>
      <p className="text-[0.9rem] text-taupe leading-relaxed">{children}</p>
      {come && (
        <div className="mt-2.5 pt-2.5 border-t border-bordo flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="etichetta text-taupe-chiaro text-[0.6rem]">Come si valuta</span>
          {come}
        </div>
      )}
    </div>
  );
}

export default function LeggendaPage() {
  return (
    <main className="mx-auto max-w-console px-4 sm:px-6 py-8 sm:py-10">
      <Nav />

      <header className="border-b border-bordo pb-6 mb-9">
        <p className="etichetta text-taupe mb-1">Guida alla lettura</p>
        <h1 className="cifra text-bordeaux text-5xl sm:text-6xl leading-none">
          Leggenda
        </h1>
        <p className="text-sm text-taupe mt-4 max-w-2xl leading-relaxed">
          Cosa significa ogni elemento della Centrale di Comando e come viene
          calcolato. I dati arrivano ogni mattina alle 8:00 dall&apos;Agente
          Sentinella, che controlla gli account Meta di ciascun cliente e scrive
          i risultati. La dashboard li mostra: non modifica mai nulla.
        </p>
      </header>

      {/* Stati */}
      <Sezione
        titolo="Gli stati"
        intro="Ogni cliente ha un semaforo. Lo stato del cliente è sempre il peggiore tra tutti i suoi controlli."
      >
        <Voce termine="In salute">
          Tutti i controlli sono a posto. Nessuna azione richiesta.
          <span className="block mt-2">
            <Chip colore="#4A6B4F" testo="Verde" />
          </span>
        </Voce>
        <Voce termine="Da monitorare (warning)">
          Almeno un controllo è in avviso: qualcosa si sta muovendo nella
          direzione sbagliata, ma non è ancora urgente. Da tenere d&apos;occhio.
          <span className="block mt-2">
            <Chip colore="#B67B2E" testo="Arancione" />
          </span>
        </Voce>
        <Voce termine="Critico">
          Almeno un controllo è critico: richiede un intervento. È lo stato che
          fa scattare anche l&apos;avviso su Telegram.
          <span className="block mt-2">
            <Chip colore="#8E2A3C" testo="Rosso" />
          </span>
        </Voce>
      </Sezione>

      {/* Metriche del dettaglio */}
      <Sezione
        titolo="Le metriche del cliente"
        intro="Nel dettaglio di ogni cliente ci sono quattro riquadri. Con il selettore in alto (24 ore · 7 giorni · 30 giorni) scegli su quale periodo vederli."
      >
        <Voce
          termine="Spesa"
          come={
            <>
              <Chip colore="#B67B2E" testo="Warning se supera il tetto giornaliero" />
            </>
          }
        >
          Quanto è stato speso in pubblicità nel periodo scelto. Il &laquo;Tetto&raquo;
          sotto il numero è la spesa massima giornaliera che hai impostato per
          quel cliente.
        </Voce>
        <Voce termine="Lead">
          Il numero di contatti / richieste raccolti (l&apos;evento &laquo;lead&raquo;
          registrato su Meta) nel periodo scelto. La &laquo;Baseline&raquo; sotto è il
          riferimento di normalità (vedi sotto).
          <span className="block mt-2 text-taupe-chiaro">
            Nota: &laquo;Lead ieri&raquo; (periodo 24 ore) è il{" "}
            <strong>giorno di calendario completo precedente</strong> al controllo
            (00:00–23:59), non le ultime 24 ore dall&apos;esecuzione. Es.: il
            controllo delle 8:00 del 24 conta i lead di tutto il 23.
          </span>
        </Voce>
        <Voce
          termine="CPL — Costo per Lead"
          come={
            <>
              <Chip colore="#B67B2E" testo="Warning se sale molto sopra la media" />
            </>
          }
        >
          Quanto costa ottenere un contatto: <em>spesa ÷ lead</em> nel periodo
          scelto. Se nel periodo non ci sono lead mostra &laquo;n/d&raquo; (non si può
          dividere per zero).
        </Voce>
        <Voce
          termine="Campagne con problemi"
          come={
            <>
              <Chip colore="#8E2A3C" testo="Rosso se ≥ 1 campagna in errore" />
            </>
          }
        >
          Quante campagne attive Meta segnala in errore (rifiutate o con problemi
          di erogazione). <strong>0</strong> = tutto in regola. Se la Sentinella
          non invia ancora questo dato, appare &laquo;non monitorato&raquo;.
        </Voce>
      </Sezione>

      {/* Concetti chiave */}
      <Sezione
        titolo="I concetti chiave"
        intro="Due idee su cui si basano tutti gli allarmi sui lead."
      >
        <Voce termine="Baseline">
          È il &laquo;normale&raquo; di quel cliente: la <strong>media storica dei lead
          al giorno</strong>, calcolata sugli ultimi ~30 giorni. Serve a capire se
          il presente è in linea o in calo. Esempio: baseline 3.7 = di solito quel
          cliente porta circa 3-4 lead al giorno.
        </Voce>
        <Voce termine="Finestra di 7 giorni (perché non &laquo;ieri&raquo;)">
          Gli allarmi sui lead NON guardano il singolo giorno: un giorno a zero è
          normale (oggi 0, domani 20). Si guardano invece gli <strong>ultimi 7
          giorni</strong> confrontati con quanto ti aspetteresti (baseline × 7).
          Così si segnala solo un calo <em>vero e prolungato</em>, non il rumore
          quotidiano.
        </Voce>
      </Sezione>

      {/* I controlli */}
      <Sezione
        titolo="I controlli della Sentinella"
        intro="Ogni mattina la Sentinella esegue questi controlli su ogni cliente. È il peggiore di questi a dare il colore al cliente."
      >
        <Voce
          termine="Volume lead"
          come={
            <>
              <Chip colore="#B67B2E" testo="Warning: calo oltre la soglia warn" />
              <Chip colore="#8E2A3C" testo="Critico: calo oltre la soglia critica" />
            </>
          }
        >
          Confronta i lead degli ultimi 7 giorni con quelli attesi (baseline × 7).
          Se sono sotto le soglie di calo che hai impostato per quel cliente
          (es. −35% avviso, −50% critico), scatta l&apos;allarme.
        </Voce>
        <Voce
          termine="Zero lead con spesa"
          come={<Chip colore="#8E2A3C" testo="Critico" />}
        >
          Scatta solo se in 7 giorni hai <strong>speso ma fatto 0 lead</strong> e
          quel cliente di solito ne farebbe almeno un paio. Segnala un probabile
          problema di <strong>tracciamento o di erogazione</strong> — non una
          semplice giornata di calma.
        </Voce>
        <Voce
          termine="Spesa giornaliera"
          come={<Chip colore="#B67B2E" testo="Warning se supera il tetto" />}
        >
          Controlla che la spesa di ieri non superi il tetto giornaliero
          impostato per quel cliente.
        </Voce>
        <Voce
          termine="CPL fuori controllo"
          come={<Chip colore="#B67B2E" testo="Warning se molto sopra la media" />}
        >
          Segnala quando il costo per lead di ieri schizza ben oltre la media del
          periodo (solo quando i volumi sono abbastanza alti da essere
          significativi).
        </Voce>
        <Voce
          termine="Token di accesso"
          come={
            <>
              <Chip colore="#B67B2E" testo="Warning se sta per scadere" />
              <Chip colore="#8E2A3C" testo="Critico se non valido" />
            </>
          }
        >
          Verifica che la connessione a Meta sia valida. Avvisa in anticipo se il
          token sta per scadere (entro i giorni che hai impostato), così puoi
          rinnovarlo prima che le campagne si fermino.
        </Voce>
      </Sezione>

      {/* Elementi della pagina */}
      <Sezione
        titolo="Come è fatta la pagina"
        intro="Gli elementi visivi della Centrale."
      >
        <Voce termine="Selettore periodo (24 ore · 7 giorni · 30 giorni)">
          Nel dettaglio del cliente, cambia la finestra temporale di Spesa, Lead
          e CPL. &laquo;24 ore&raquo; = ieri; &laquo;7/30 giorni&raquo; = totali del periodo.
        </Voce>
        <Voce termine="Grafico andamento">
          Le <strong>barre bordeaux</strong> sono i lead giorno per giorno; la{" "}
          <strong>linea</strong> è la spesa giorno per giorno. Serve a vedere il
          trend a colpo d&apos;occhio.
        </Voce>
        <Voce termine="Catene (Evanitè, Italian Concept…)">
          I clienti con più sedi sono raccolti in un&apos;unica card. La card
          mostra il semaforo peggiore e un riepilogo (es. &laquo;5 sedi · 2 warning&raquo;);
          &laquo;Apri sedi&raquo; mostra i singoli saloni.
        </Voce>
        <Voce termine="Cronologia alert">
          Lo storico degli eventi non a posto, filtrabile per 7 / 30 giorni o
          tutti. La nota <strong>Telegram</strong> indica che l&apos;avviso è stato
          inviato anche sul canale. Ogni riga si espande per il dettaglio.
        </Voce>
        <Voce termine="In onboarding">
          I clienti non ancora attivi (in fase di preparazione), mostrati in
          fondo in stile attenuato. Diventano card attive quando li imposti su
          &laquo;attivo&raquo; nel foglio.
        </Voce>
        <Voce termine="Ultima esecuzione · Aggiorna">
          Quando la Sentinella ha aggiornato i dati (ogni mattina alle 8:00). I
          dati si aggiornano da soli; il tasto <strong>Aggiorna</strong> forza una
          rilettura immediata del foglio.
        </Voce>
      </Sezione>

      <footer className="mt-14 pt-6 border-t border-bordo text-center">
        <p className="etichetta text-taupe-chiaro">
          One Marketing Consulting · Agente Sentinella
        </p>
      </footer>
    </main>
  );
}
