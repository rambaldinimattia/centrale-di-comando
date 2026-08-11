/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Il controllo tipi resta attivo; l'ESLint non blocca il build su Vercel
  // (evita stop del deploy per warning stilistici). Lint locale: `npm run lint`.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
