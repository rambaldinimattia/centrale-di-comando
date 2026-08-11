import { formatEuro, formatGiornoBreve, formatNumero } from "@/lib/format";
import type { PuntoStorico } from "@/lib/types";

// Grafico SVG custom: barre = lead (asse sx), linea = spesa (asse dx).
// Nessuna dipendenza esterna, angoli vivi, palette istituzionale.
export function HistoryChart({ dati }: { dati: PuntoStorico[] }) {
  if (!dati || dati.length === 0) {
    return (
      <p className="text-sm text-taupe italic">
        Storico non ancora disponibile per questo cliente.
      </p>
    );
  }

  // Geometria
  const W = 720;
  const H = 260;
  const padL = 8;
  const padR = 8;
  const padTop = 20;
  const padBottom = 34;
  const innerW = W - padL - padR;
  const innerH = H - padTop - padBottom;

  const n = dati.length;
  const slot = innerW / n;
  const barW = Math.min(slot * 0.5, 46);

  const leadMax = Math.max(1, ...dati.map((d) => d.lead));
  const spesaMax = Math.max(1, ...dati.map((d) => d.spesa));

  // "Testa" i massimi con un po' di margine
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
        aria-label="Andamento lead e spesa negli ultimi 7 giorni"
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
        {/* Asse base */}
        <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke="#B5A992" strokeWidth={1} />

        {/* Barre lead */}
        {dati.map((d, i) => {
          const x = xCenter(i) - barW / 2;
          const y = yLead(d.lead);
          const h = baseY - y;
          return (
            <g key={`bar-${i}`}>
              <rect x={x} y={y} width={barW} height={Math.max(0, h)} fill="#5C1A28">
                <title>{`${formatGiornoBreve(d.giorno)} · ${formatNumero(d.lead)} lead`}</title>
              </rect>
              {d.lead > 0 && (
                <text
                  x={xCenter(i)}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={13}
                  fill="#5C1A28"
                  fontFamily="var(--font-cormorant), serif"
                  fontWeight={600}
                >
                  {formatNumero(d.lead)}
                </text>
              )}
            </g>
          );
        })}

        {/* Linea spesa */}
        <polyline
          points={linePts}
          fill="none"
          stroke="#8A7E6D"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {dati.map((d, i) => (
          <g key={`pt-${i}`}>
            <circle cx={xCenter(i)} cy={ySpesa(d.spesa)} r={3.5} fill="#F6F1E7" stroke="#8A7E6D" strokeWidth={2}>
              <title>{`${formatGiornoBreve(d.giorno)} · ${formatEuro(d.spesa)} spesa`}</title>
            </circle>
          </g>
        ))}

        {/* Etichette asse X */}
        {dati.map((d, i) => (
          <text
            key={`x-${i}`}
            x={xCenter(i)}
            y={H - 12}
            textAnchor="middle"
            fontSize={11}
            fill="#8A7E6D"
            fontFamily="var(--font-jost), sans-serif"
          >
            {formatGiornoBreve(d.giorno)}
          </text>
        ))}
      </svg>

      {/* Legenda */}
      <div className="flex items-center gap-6 mt-3 justify-center">
        <span className="inline-flex items-center gap-2 text-[0.72rem] text-taupe">
          <span style={{ width: 14, height: 10, background: "#5C1A28", display: "inline-block" }} />
          Lead / giorno
        </span>
        <span className="inline-flex items-center gap-2 text-[0.72rem] text-taupe">
          <span style={{ width: 16, height: 2, background: "#8A7E6D", display: "inline-block" }} />
          Spesa / giorno
        </span>
      </div>
    </div>
  );
}
