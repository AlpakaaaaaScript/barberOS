import "server-only";
import { Pool, types } from "pg";

// Return DATE / TIMESTAMP columns as plain strings (no timezone shifting) and NUMERIC as numbers.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1114, (v) => v);
types.setTypeParser(1700, (v) => Number(v));
types.setTypeParser(20, (v) => Number(v));

const g = globalThis as unknown as { pool?: Pool };
const pool = (g.pool ??= new Pool({ connectionString: process.env.DATABASE_URL }));

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}

export async function one<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | undefined> {
  return (await sql<T>(text, params))[0];
}

/** Turns a Postgres error into a short message suitable for the UI. */
export function dbMessage(e: unknown): string {
  const err = e as { code?: string; message?: string; constraint?: string };
  if (err.code === "23505") return "That record already exists (duplicate value).";
  if (err.code === "23P01") return "That time overlaps another booking.";
  if (err.code === "23514") return "A value is out of the allowed range.";
  if (err.code === "23503") return "This record is still in use by other data.";
  return err.message ?? "Something went wrong.";
}
