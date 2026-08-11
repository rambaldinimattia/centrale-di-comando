"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrore(data?.errore ?? "Accesso non riuscito");
        setLoading(false);
      }
    } catch {
      setErrore("Errore di rete. Riprova.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="etichetta text-taupe block mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="w-full border border-bordo bg-avorio px-3 py-2.5 text-inchiostro focus:outline-none focus:border-bordeaux transizione"
          style={{ borderRadius: 4 }}
        />
      </div>

      {errore && <p className="text-sm text-critico">{errore}</p>}

      <button
        type="submit"
        disabled={loading || password.length === 0}
        className="etichetta w-full bg-bordeaux text-card py-2.5 hover:opacity-90 transizione disabled:opacity-50"
        style={{ borderRadius: 4 }}
      >
        {loading ? "Verifico…" : "Entra"}
      </button>
    </form>
  );
}
