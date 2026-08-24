"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Centrale" },
  { href: "/leggenda", label: "Leggenda" },
];

// Navigazione in cima alla console (stile sobrio, coerente col registro boutique).
export function Nav() {
  const path = usePathname();

  return (
    <nav className="flex items-center gap-7 border-b border-bordo mb-8">
      {LINKS.map((l) => {
        const attivo = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className="etichetta transizione -mb-px"
            style={{
              color: attivo ? "#5C1A28" : "#8A7E6D",
              borderBottom: `2px solid ${attivo ? "#5C1A28" : "transparent"}`,
              paddingBottom: 10,
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
