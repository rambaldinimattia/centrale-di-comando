// ─────────────────────────────────────────────────────────────
// Autenticazione a password unica (hash SHA-256) + cookie sessione.
// Usa Web Crypto → funziona sia in middleware (edge) sia nei route
// handler (node). Se PASSWORD_HASH non è impostata, l'auth è
// disattivata (utile in locale con dati mock).
// ─────────────────────────────────────────────────────────────

export const COOKIE_NAME = "cdc_session";

export function authAbilitata(): boolean {
  return Boolean(process.env.PASSWORD_HASH && process.env.PASSWORD_HASH.trim());
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Hash della password digitata dall'utente
export async function hashPassword(password: string): Promise<string> {
  return sha256Hex(password.trim());
}

// Valore atteso del cookie di sessione (derivato dall'hash, non è l'hash stesso)
export async function tokenSessione(): Promise<string> {
  const hash = process.env.PASSWORD_HASH?.trim() ?? "";
  return sha256Hex(`${hash}:cdc-sentinella-session`);
}

// Verifica: la password digitata corrisponde all'hash configurato?
export async function passwordCorretta(password: string): Promise<boolean> {
  const atteso = process.env.PASSWORD_HASH?.trim();
  if (!atteso) return false;
  const calcolato = await hashPassword(password);
  return timingSafeEqual(calcolato.toLowerCase(), atteso.toLowerCase());
}

// Il cookie presentato è valido?
export async function cookieValido(valore: string | undefined): Promise<boolean> {
  if (!valore) return false;
  const atteso = await tokenSessione();
  return timingSafeEqual(valore, atteso);
}

// Confronto a tempo costante (evita timing attack sul confronto stringhe)
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
