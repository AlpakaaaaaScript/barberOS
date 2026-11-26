import "server-only";
import { redirect } from "next/navigation";

/** Redirect back to a page with a one-shot success or error message in the query string. */
export function back(path: string, msg: { ok?: string; error?: string }): never {
  const q = new URLSearchParams(msg as Record<string, string>).toString();
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}

export const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export const num = (f: FormData, k: string) => Number(f.get(k));
