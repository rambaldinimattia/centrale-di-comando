import { formatEuro, formatGiornoBreve, formatNumero } from "@/lib/format";
import type { PuntoStorico } from "@/lib/types";

const BORDEAUX = "#5C1A28"; // lead reali dal CRM (o unica serie lead)

// Grafico SVG custom: una sola barra lead per giorno (CRM reali se disponibili,
// altrimenti Meta) + linea spesa. Nessuna dipendenza esterna, palette istituzionale.
export function HistoryChart({ dati }: { dati: PuntoStorico[] }) {
  if (!dati || dati.length === 0) {
    return (
      <p className="text-sm text-taupe italic">
        Storico non ancora disponibile per questo cliente.
      </p>
    );
  }

  // Se il cliente ha il monitoraggio CRM, la barra mostra i lead REALI del CRM;
  // altrimenti mostra i lead tracciati da Meta (unico dato disponibile).
  const hasCrm = dati.some((d) => d.leadCrm != null);
  const leadVal = (d: PuntoStorico) => (hasCrm ? d.leadCrm ?? 0 : d.lead);

  // Geometria. padL/padR lasciano spazio alle etichette di scala: lead a
  // sinistra (bordeaux), spesa a destra (taupe), così entrambe le serie sono
  // leggibili in grandezza anche a 30 giorni, non solo col tooltip.
  const W = 720;
  const H = 260;
  const padL = 30;
  const padR = 42;
  const padTop = 20;
  const padBottom = 34;
  const innerW = W - padL - padR;
  const innerH = H - padTop - padBottom;

  const n = dati.length;
  const slot = innerW / n;
  const barW = Math.min(slot * 0.5, 46);

  const mostraValoriBarre = n <= 8;
  const passoEtichetteX = n <= 8 ? 1 : n <= 16 ? 2 : 5;

  const leadMax = Math.max(1, ...dati.map(leadVal));
  const spesaMax = Math.max(1, ...dati.map((d) => d.spesa));
  const leadTop = leadMax * 1.15;
  const spesaTop = spesaMax * 1.15;

  const xCenter = (i: number) => padL + slot * i + slot / 2;
  const yLead = (v: number) => padTop + innerH - (v / leadTop) * innerH;
  const ySpesa = (v: number) => padTop + innerH - (v / spesaTop) * innerH;
  const baseY = padTop + innerH;

  const linePts = dati.map((d, i) => `${xCenter(i)},${ySpesa(d.spesa)}`).join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Andamento lead e spesa negli ultimi ${n} giorni`}
        style={{ display: "block", minWidth: 360 }}
      >
        {/* Linee guida orizzontali */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={padL}
            x2={W - padR}
            y1={padTop + innerH - innerH * f}
            y2={padTop + innerH - innerH * f}
            stroke="#DDD5C4"
            strokeWidth={1}
            strokeDasharray={f === 1 ? undefined : "2 4"}
          />
        ))}
        <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke="#8C7F69" strokeWidth={1} />

        {/* Etichette di scala: lead (sx, bordeaux) e spesa (dx, taupe) */}
        {[0.5, 1].map((f) => {
          const y = padTop + innerH - innerH * f + 3;
          return (
            <g key={`axis-${f}`}>
              <text
                x={padL - 6}
                y={y}
                textAnchor="end"
                fontSize={10}
                fill={BORDEAUX}
                fontFamily="var(--font-jost), sans-serif"
              >
                {formatNumero(Math.round(leadTop * f))}
              </text>
              <text
                x={W - padR + 6}
                y={y}
                textAnchor="start"
                fontSize={10}
                fill="#6E6352"
                fontFamily="var(--font-jost), sans-serif"
              >
                {formatEuro(Math.round(spesaTop * f))}
              </text>
            </g>
          );
        })}

        {/* Barre lead (bordeaux) */}
        {dati.map((d, i) => {
          const cx = xCenter(i);
          const v = leadVal(d);
          const x = cx - barW / 2;
          const y = yLead(v);
          return (
            <g key={`bar-${i}`}>
              <rect x={x} y={y} width={barW} height={Math.max(0, baseY - y)} fill={BORDEAUX}>
                <title>{`${formatGiornoBreve(d.giorno)} · ${formatNumero(v)} lead`}</title>
              </rect>
              {mostraValoriBarre && v > 0 && (
                <text
                  x={cx}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={13}
                  fill={BORDEAUX}
                  fontFamily="var(--font-cormorant), serif"
                  fontWeight={600}
                >
                  {formatNumero(v)}
                </text>
              )}
            </g>
          );
        })}

        {/* Linea spesa */}
        <polyline
          points={linePts}
          fill="none"
          stroke="#6E6352"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {dati.map((d, i) => (
          <circle key={`pt-${i}`} cx={xCenter(i)} cy={ySpesa(d.spesa)} r={3.5} fill="#F6F1E7" stroke="#6E6352" strokeWidth={2}>
            <title>{`${formatGiornoBreve(d.giorno)} · ${formatEuro(d.spesa)} spesa`}</title>
          </circle>
        ))}

        {/* Etichette asse X (diradate quando i giorni sono molti) */}
        {dati.map((d, i) => {
          const mostra = i % passoEtichetteX === 0 || i === n - 1;
          if (!mostra) return null;
          return (
            <text
              key={`x-${i}`}
              x={xCenter(i)}
              y={H - 12}
              textAnchor="middle"
              fontSize={11}
              fill="#6E6352"
              fontFamily="var(--font-jost), sans-serif"
            >
              {formatGiornoBreve(d.giorno)}
            </text>
          );
        })}
      </svg>

      {/* Legenda */}
      <div className="flex items-center gap-5 mt-3 justify-center flex-wrap">
        <LegendaVoce colore={BORDEAUX} testo={hasCrm ? "Lead CRM (reali)" : "Lead / giorno"} />
        <span className="inline-flex items-center gap-2 text-[0.72rem] text-taupe">
          <span style={{ width: 16, height: 2, background: "#6E6352", display: "inline-block" }} />
          Spesa / giorno
        </span>
      </div>
    </div>
  );
}

function LegendaVoce({ colore, testo }: { colore: string; testo: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.72rem] text-taupe">
      <span style={{ width: 14, height: 10, background: colore, display: "inline-block" }} />
      {testo}
    </span>
  );
}
