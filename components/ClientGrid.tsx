import type { ClienteDerivato } from "@/lib/types";
import { ClientCard } from "./ClientCard";

interface ClientGridProps {
  clienti: ClienteDerivato[];
  selezionato: string | null;
  onSelect: (nome: string) => void;
}

export function ClientGrid({ clienti, selezionato, onSelect }: ClientGridProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {clienti.map((c) => (
        <ClientCard
          key={c.cliente}
          cliente={c}
          selezionato={selezionato === c.cliente}
          onClick={() => onSelect(c.cliente)}
        />
      ))}
    </div>
  );
}
