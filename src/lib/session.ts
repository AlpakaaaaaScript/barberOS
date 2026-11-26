import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Role = "customer" | "barber" | "owner";
export type Session = { userId: number; role: Role; name: string };

const COOKIE = "bos_session";
const sign = (v: string) => createHmac("sha256", process.env.SESSION_SECRET!).update(v).digest("base64url");

export async function setSession(s: Session) {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  const expected = sign(payload ?? "");
  if (!sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return JSON.parse(Buffer.from(payload, "base64url").toString());
}

/** Use in every page and server action of a role area. */
export async function requireRole(role: Role): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== role) redirect(`/${s.role}`);
  return s;
}
