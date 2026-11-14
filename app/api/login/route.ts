import { NextResponse } from "next/server";
import { COOKIE, createToken, passwordOk } from "../../../lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!passwordOk(String(password ?? ""))) {
    await new Promise((r) => setTimeout(r, 600)); // perlambat brute force
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createToken(), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86400,
  });
  return res;
}
