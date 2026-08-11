import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, authAbilitata, cookieValido } from "@/lib/auth";

// Protegge tutte le pagine tranne login/asset. Se l'auth non è
// configurata (PASSWORD_HASH assente), lascia passare tutto.
export async function middleware(req: NextRequest) {
  if (!authAbilitata()) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const ok = await cookieValido(cookie);

  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Esclude: login, api/login, asset statici, manifest e icone
  matcher: [
    "/((?!login|api/login|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|icon-192.png|icon-512.png|apple-touch-icon.png|robots.txt).*)",
  ],
};
