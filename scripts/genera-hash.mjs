// Genera l'hash SHA-256 di una password, da incollare in PASSWORD_HASH.
// Uso:  node scripts/genera-hash.mjs "la-tua-password"
import { createHash } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/genera-hash.mjs "la-tua-password"');
  process.exit(1);
}

const hash = createHash("sha256").update(password.trim()).digest("hex");
console.log("\nPASSWORD_HASH=" + hash + "\n");
