import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

// ─────────────────────────────────────────────────────────────
// Registrazione unica di GSAP + useGSAP per tutta la Centrale.
// I componenti importano sempre da "@/lib/gsap" (mai da "gsap" diretto),
// così la registrazione avviene una sola volta. Le animazioni sono
// volutamente sobrie e rispettano sempre `prefers-reduced-motion`.
// ─────────────────────────────────────────────────────────────

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };
