// Autentikasi sederhana: satu password bersama (APP_PASSWORD) + cookie bertanda tangan HMAC.
// Memakai Web Crypto sehingga bisa jalan di middleware (Edge) maupun Node.
export const COOKIE = "ia_session";
const enc = new TextEncoder();

function secret() {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || "";
}
export function authEnabled() {
  // Di produksi wajib; di development tanpa APP_PASSWORD, login dimatikan agar mudah dicoba.
  return !!process.env.APP_PASSWORD || process.env.NODE_ENV === "production";
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createToken(days = 7) {
  const exp = Date.now() + days * 86400_000;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function verifyToken(token: string | undefined) {
  if (!token || !secret()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = await hmac(exp);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export function passwordOk(input: string) {
  const pw = process.env.APP_PASSWORD ?? "";
  if (!pw || input.length !== pw.length) return false;
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ input.charCodeAt(i);
  return diff === 0;
}
