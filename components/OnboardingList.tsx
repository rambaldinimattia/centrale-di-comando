import type { ClienteDerivato } from "@/lib/types";

// Clienti con attivo=FALSE: mostrati in fondo, stile attenuato.
export function OnboardingList({ clienti }: { clienti: ClienteDerivato[] }) {
  return (
    <section className="mb-10 opacity-60">
      <h2 className="etichetta text-taupe mb-4">In onboarding</h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {clienti.map((c) => (
          <div
            key={c.cliente}
            className="bg-card border border-dashed border-bordo px-5 py-4 flex items-center gap-3"
            style={{ borderRadius: 0 }}
          >
            <span
              aria-hidden
              className="inline-block rounded-full"
              style={{ width: 10, height: 10, background: "#B5A992" }}
            />
            <div className="min-w-0">
              <h3 className="cifra text-xl text-taupe leading-tight truncate">
                {c.cliente}
              </h3>
              <p className="etichetta text-taupe-chiaro text-[0.6rem]">
                In attivazione
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
