import { COOKIE_NAME, passwordCorretta, tokenSessione } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, errore: "Richiesta non valida" }, { status: 400 });
  }

  const ok = await passwordCorretta(password);
  if (!ok) {
    return NextResponse.json({ ok: false, errore: "Password errata" }, { status: 401 });
  }

  const token = await tokenSessione();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 giorni
  });
  return res;
}
