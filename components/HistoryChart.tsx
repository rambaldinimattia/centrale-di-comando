"use client";

import { formatEuro, formatGiornoBreve, formatNumero } from "@/lib/format";
import { gsap, useGSAP } from "@/lib/gsap";
import type { PuntoStorico } from "@/lib/types";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

// useLayoutEffect nel browser, useEffect sul server (dove il primo non esiste)
const useLayoutEffectIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ─────────────────────────────────────────────────────────────
// Andamento giornaliero in DUE pannelli allineati sullo stesso asse dei
// giorni: lead (barre) sopra, spesa (linea) sotto, ognuno con la propria
// scala. Niente doppio asse sullo stesso grafico: l'allineamento di due scale
// diverse è arbitrario e suggerisce correlazioni che non ci sono.
// Interattivo: passando sopra (o col tab) a un giorno compare la scheda con
// tutti i valori di quel giorno. Animazioni sobrie, disattivate con
// "riduci movimento"; senza JS il grafico resta completo e leggibile.
// ─────────────────────────────────────────────────────────────

const BORDEAUX = "#5C1A28";
const BORDEAUX_CHIARO = "#7B2C3D"; // cima della barra: leggera profondità
const TAUPE = "#6E6352"; // serie spesa
const INCHIOSTRO = "#2C2420";
const TESTO_TENUE = "#8C7F69";
const GRIGLIA = "#ECE5D7";
const SUPERFICIE = "#FDFBF6";

// Geometria (unità del viewBox). La larghezza è quella reale del contenitore
// (misurata), così i testi restano alla loro dimensione anche su mobile e si
// stringono solo le colonne dei giorni; le altezze sono fisse.
const W_INIZIALE = 720;
const PAD_L = 40; // etichette della scala
const PAD_R = 58; // etichetta del valore finale della spesa
const TOP_LEAD = 30;
const H_LEAD = 150;
const TOP_SPESA = TOP_LEAD + H_LEAD + 50;
const H_SPESA = 86;
const BASE_SPESA = TOP_SPESA + H_SPESA;
const H = BASE_SPESA + 32;
const BASE_LEAD = TOP_LEAD + H_LEAD;

// Massimo "pulito" della scala: 1, 2, 5, 10, 20… (con 2,5 per gli importi)
function scalaPulita(max: number, interi: boolean): number {
  const v = Math.max(1, max * 1.12); // un po' d'aria sopra il valore più alto
  const pot = Math.pow(10, Math.floor(Math.log10(v)));
  const passi = interi ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  for (const p of passi) if (p * pot >= v) return p * pot;
  return 10 * pot;
}

// Barra con la cima arrotondata (4px) e la base squadrata, ancorata alla base
function pathBarra(x: number, y: number, w: number, base: number): string {
  const h = base - y;
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
}

export function HistoryChart({ dati }: { dati: PuntoStorico[] }) {
  const radice = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const idGradiente = `barra-${useId().replace(/:/g, "")}`;
  const [attivo, setAttivo] = useState<number | null>(null);
  const [tabella, setTabella] = useState(false);
  const [W, setW] = useState(W_INIZIALE);
  const [misurato, setMisurato] = useState(false);

  // Misura prima del paint, così la prima animazione parte già alla
  // larghezza vera (altrimenti la linea si "disegnerebbe" sulla geometria
  // iniziale). Poi segue i ridimensionamenti senza rianimare.
  useLayoutEffectIso(() => {
    const el = area.current;
    if (!el) return;
    const misura = () => setW(Math.max(300, Math.round(el.clientWidth)));
    misura();
    setMisurato(true);
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Se il cliente ha il monitoraggio CRM, la barra mostra i lead REALI del CRM;
  // altrimenti i lead tracciati da Meta (unico dato disponibile).
  const hasCrm = (dati ?? []).some((d) => d.leadCrm != null);
  const leadVal = (d: PuntoStorico) => (hasCrm ? d.leadCrm ?? 0 : d.lead);

  // Chiave dei dati: le animazioni ripartono quando cambiano periodo o cliente
  const chiave = (dati ?? []).map((d) => `${d.giorno}:${leadVal(d)}:${d.spesa}`).join("|");

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".cdc-barra", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.7, stagger: 0.025 });
        const linea = radice.current?.querySelector<SVGPathElement>(".cdc-linea");
        if (linea) {
          const lung = linea.getTotalLength();
          tl.fromTo(
            linea,
            { strokeDasharray: lung, strokeDashoffset: lung },
            { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut", clearProps: "strokeDasharray,strokeDashoffset" },
            0.15
          );
        }
        tl.from(".cdc-area", { autoAlpha: 0, duration: 0.6 }, 0.5);
        tl.from(".cdc-etichetta", { autoAlpha: 0, y: 4, duration: 0.4, stagger: 0.05 }, 0.55);
      });
      return () => mm.revert();
    },
    { scope: radice, dependencies: [chiave, misurato], revertOnUpdate: true }
  );

  if (!dati || dati.length === 0) {
    return (
      <p className="text-sm text-taupe italic">Storico non ancora disponibile per questo cliente.</p>
    );
  }

  const n = dati.length;
  const innerW = W - PAD_L - PAD_R;
  const slot = innerW / n;
  const barW = Math.min(24, slot * 0.6);
  const xCentro = (i: number) => PAD_L + slot * i + slot / 2;

  const leadMax = scalaPulita(Math.max(0, ...dati.map(leadVal)), true);
  const spesaMax = scalaPulita(Math.max(0, ...dati.map((d) => d.spesa)), false);
  const yLead = (v: number) => BASE_LEAD - (v / leadMax) * H_LEAD;
  const ySpesa = (v: number) => BASE_SPESA - (v / spesaMax) * H_SPESA;

  // Etichette dirette selettive: solo il picco e l'ultimo giorno
  const iMax = dati.reduce((m, d, i) => (leadVal(d) > leadVal(dati[m]) ? i : m), 0);
  const daEtichettare = new Set([iMax, n - 1].filter((i) => leadVal(dati[i]) > 0));

  // Date sull'asse: una ogni `passoX` giorni, in base allo spazio reale per
  // giorno (~46px a etichetta). L'ultima c'è sempre; la precedente si salta
  // se le finirebbe addosso.
  const passoX = Math.max(1, Math.ceil(46 / slot));
  const mostraData = (i: number) => i === n - 1 || (i % passoX === 0 && n - 1 - i >= passoX);
  const puntiSpesa = dati.map((d, i) => `${xCentro(i)},${ySpesa(d.spesa)}`);
  const lineaSpesa = `M${puntiSpesa.join(" L")}`;
  const areaSpesa = `${lineaSpesa} L${xCentro(n - 1)},${BASE_SPESA} L${xCentro(0)},${BASE_SPESA} Z`;
  const ultimo = dati[n - 1];

  const titoloLead = hasCrm ? "Lead reali (CRM) · al giorno" : "Lead · al giorno";
  const sel = attivo != null ? dati[attivo] : null;

  // Righe della scala: 0, metà, massimo (la metà solo se è un numero intero
  // di lead; per la spesa sempre)
  const righeLead = [0, leadMax / 2, leadMax].filter((v) => Number.isInteger(v));
  const righeSpesa = [0, spesaMax / 2, spesaMax];

  return (
    <div ref={radice}>
      <div className="w-full">
        <div ref={area} className="relative" onMouseLeave={() => setAttivo(null)}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            role="img"
            aria-label={`Andamento di lead e spesa negli ultimi ${n} giorni. Vista tabella disponibile sotto il grafico.`}
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BORDEAUX_CHIARO} />
                <stop offset="100%" stopColor={BORDEAUX} />
              </linearGradient>
            </defs>

            {/* ── Pannello lead ── */}
            <TitoloPannello x={PAD_L} y={TOP_LEAD - 16} testo={titoloLead} />
            {righeLead.map((v) => (
              <RigaScala key={`gl-${v}`} larghezza={W} y={yLead(v)} etichetta={formatNumero(v)} base={v === 0} />
            ))}
            {dati.map((d, i) => {
              const v = leadVal(d);
              const x = xCentro(i) - barW / 2;
              return (
                <path
                  key={`b-${d.giorno}`}
                  className="cdc-barra"
                  d={pathBarra(x, yLead(v), barW, BASE_LEAD)}
                  fill={`url(#${idGradiente})`}
                  style={{ opacity: attivo == null || attivo === i ? 1 : 0.45, transition: "opacity .15s ease" }}
                />
              );
            })}
            {Array.from(daEtichettare).map((i) => (
              <text
                key={`v-${i}`}
                className="cdc-etichetta"
                x={xCentro(i)}
                y={yLead(leadVal(dati[i])) - 7}
                textAnchor="middle"
                fontSize={12}
                fontWeight={500}
                fill={INCHIOSTRO}
                fontFamily="var(--font-jost), sans-serif"
              >
                {formatNumero(leadVal(dati[i]))}
              </text>
            ))}

            {/* ── Pannello spesa ── */}
            <TitoloPannello x={PAD_L} y={TOP_SPESA - 16} testo="Spesa Meta · al giorno" />
            {righeSpesa.map((v) => (
              <RigaScala key={`gs-${v}`} larghezza={W} y={ySpesa(v)} etichetta={formatEuro(v)} base={v === 0} />
            ))}
            <path className="cdc-area" d={areaSpesa} fill={TAUPE} opacity={0.1} />
            <path
              className="cdc-linea"
              d={lineaSpesa}
              fill="none"
              stroke={TAUPE}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle
              className="cdc-etichetta"
              cx={xCentro(n - 1)}
              cy={ySpesa(ultimo.spesa)}
              r={4}
              fill={TAUPE}
              stroke={SUPERFICIE}
              strokeWidth={2}
            />
            <text
              className="cdc-etichetta"
              x={xCentro(n - 1) + 10}
              y={ySpesa(ultimo.spesa) + 4}
              fontSize={12}
              fontWeight={500}
              fill={INCHIOSTRO}
              fontFamily="var(--font-jost), sans-serif"
            >
              {formatEuro(ultimo.spesa)}
            </text>

            {/* ── Asse dei giorni (condiviso) ── */}
            {dati.map((d, i) =>
              mostraData(i) ? (
                <text
                  key={`x-${d.giorno}`}
                  x={xCentro(i)}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={11}
                  fill={attivo === i ? INCHIOSTRO : TESTO_TENUE}
                  fontFamily="var(--font-jost), sans-serif"
                >
                  {formatGiornoBreve(d.giorno)}
                </text>
              ) : null
            )}

            {/* ── Livello interattivo: mirino + punto del giorno attivo ── */}
            {sel && attivo != null && (
              <g pointerEvents="none">
                <line
                  x1={xCentro(attivo)}
                  x2={xCentro(attivo)}
                  y1={TOP_LEAD - 6}
                  y2={BASE_SPESA}
                  stroke="#B9AE9A"
                  strokeWidth={1}
                />
                <circle
                  cx={xCentro(attivo)}
                  cy={ySpesa(sel.spesa)}
                  r={4.5}
                  fill={TAUPE}
                  stroke={SUPERFICIE}
                  strokeWidth={2}
                />
              </g>
            )}
            {/* Zone di aggancio: tutta la colonna del giorno, su entrambi i pannelli */}
            {dati.map((d, i) => (
              <rect
                key={`h-${d.giorno}`}
                x={xCentro(i) - slot / 2}
                y={TOP_LEAD - 10}
                width={slot}
                height={BASE_SPESA - TOP_LEAD + 10}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${formatGiornoBreve(d.giorno)}: ${formatNumero(leadVal(d))} lead, ${formatEuro(d.spesa)} di spesa`}
                style={{ outline: "none", cursor: "default" }}
                onMouseEnter={() => setAttivo(i)}
                onFocus={() => setAttivo(i)}
                onBlur={() => setAttivo(null)}
              />
            ))}
          </svg>

          {/* Scheda del giorno: i valori comandano, l'etichetta segue */}
          {sel && attivo != null && (
            <div
              className="pointer-events-none absolute z-10 bg-card border border-bordo px-3.5 py-2.5"
              style={{
                left: `${Math.min(86, Math.max(14, (xCentro(attivo) / W) * 100))}%`,
                top: 0,
                transform: "translateX(-50%)",
                boxShadow: "0 12px 28px -14px rgba(44,36,32,.35)",
                minWidth: 150,
              }}
            >
              <p className="etichetta text-taupe text-[0.6rem] mb-1.5">{formatGiornoBreve(sel.giorno)}</p>
              <RigaScheda
                chiave={<span style={{ width: 10, height: 10, background: BORDEAUX, display: "inline-block" }} />}
                valore={formatNumero(leadVal(sel))}
                etichetta={hasCrm ? `lead CRM · Meta ${formatNumero(sel.lead)}` : "lead"}
              />
              <RigaScheda
                chiave={<span style={{ width: 12, height: 2, background: TAUPE, display: "inline-block" }} />}
                valore={formatEuro(sel.spesa)}
                etichetta="spesa"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          onClick={() => setTabella((t) => !t)}
          aria-expanded={tabella}
          className="etichetta text-[0.6rem] text-taupe hover:text-bordeaux transizione"
        >
          {tabella ? "Nascondi tabella" : "Vedi i dati in tabella"}
        </button>
      </div>
      {tabella && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[0.75rem] text-inchiostro" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr className="etichetta text-taupe text-[0.6rem] text-left border-b border-bordo">
                <th className="py-1.5 pr-4 font-medium">Giorno</th>
                <th className="py-1.5 pr-4 font-medium text-right">{hasCrm ? "Lead CRM" : "Lead"}</th>
                {hasCrm && <th className="py-1.5 pr-4 font-medium text-right">Lead Meta</th>}
                <th className="py-1.5 font-medium text-right">Spesa</th>
              </tr>
            </thead>
            <tbody>
              {dati.map((d) => (
                <tr key={`t-${d.giorno}`} className="border-b border-bordo/60">
                  <td className="py-1.5 pr-4">{formatGiornoBreve(d.giorno)}</td>
                  <td className="py-1.5 pr-4 text-right">{formatNumero(leadVal(d))}</td>
                  {hasCrm && <td className="py-1.5 pr-4 text-right">{formatNumero(d.lead)}</td>}
                  <td className="py-1.5 text-right">{formatEuro(d.spesa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TitoloPannello({ x, y, testo }: { x: number; y: number; testo: string }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={10}
      letterSpacing={1.5}
      fill={TAUPE}
      fontFamily="var(--font-jost), sans-serif"
      fontWeight={500}
    >
      {testo.toUpperCase()}
    </text>
  );
}

function RigaScala({ larghezza, y, etichetta, base }: { larghezza: number; y: number; etichetta: string; base: boolean }) {
  return (
    <g>
      <line x1={PAD_L} x2={larghezza - PAD_R} y1={y} y2={y} stroke={base ? "#D9D0BF" : GRIGLIA} strokeWidth={1} />
      <text
        x={PAD_L - 8}
        y={y + 3.5}
        textAnchor="end"
        fontSize={10}
        fill={TESTO_TENUE}
        fontFamily="var(--font-jost), sans-serif"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {etichetta}
      </text>
    </g>
  );
}

function RigaScheda({ chiave, valore, etichetta }: { chiave: React.ReactNode; valore: string; etichetta: string }) {
  return (
    <p className="flex items-center gap-2 leading-tight mt-1 first-of-type:mt-0">
      {chiave}
      <span className="cifra text-lg text-inchiostro">{valore}</span>
      <span className="text-[0.68rem] text-taupe">{etichetta}</span>
    </p>
  );
}
