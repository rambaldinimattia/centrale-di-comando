"use client";

import { gsap, useGSAP } from "@/lib/gsap";
import { useRef } from "react";

// Conteggio animato da 0 al valore, riformattando a ogni frame col `format`
// passato (euro, numero…). Rispetta `prefers-reduced-motion`: con riduzione
// attiva mostra subito il valore finale, senza animazione. Il render iniziale
// è già il valore finale (coerenza SSR/idratazione); l'animazione, che parte
// nel layout-effect prima del paint, lo riporta a 0 e lo fa salire — niente
// lampeggio del valore finale.
export function CountUp({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const stato = { v: 0 };
        gsap.to(stato, {
          v: value,
          duration: 0.7,
          ease: "power1.out",
          onUpdate: () => {
            el.textContent = format(stato.v);
          },
        });
      });
      return () => mm.revert();
    },
    { dependencies: [value], scope: ref }
  );

  return <span ref={ref}>{format(value)}</span>;
}
