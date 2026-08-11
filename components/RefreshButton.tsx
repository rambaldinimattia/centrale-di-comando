"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Bottone refresh manuale: forza il re-fetch server-side (revalidate).
export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function aggiorna() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      onClick={aggiorna}
      disabled={isPending}
      className="etichetta inline-flex items-center gap-2 border border-bordo bg-card px-4 py-2 text-taupe hover:border-bordeaux hover:text-bordeaux transizione disabled:opacity-60"
      style={{ borderRadius: 4 }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{ animation: isPending ? "cdc-spin 0.8s linear infinite" : undefined }}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      {isPending ? "Aggiorno…" : "Aggiorna"}
      <style>{`@keyframes cdc-spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
