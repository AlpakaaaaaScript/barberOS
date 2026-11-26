// Timestamps come from Postgres as "YYYY-MM-DD HH:MM:SS" local strings (see db.ts).
const toDate = (v: string) => new Date(v.replace(" ", "T"));

export const money = (n: number | null | undefined) =>
  `฿${Number(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const fmtDate = (v: string) =>
  toDate(v).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export const fmtDateLong = (v: string) =>
  toDate(v).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const fmtTime = (v: string) =>
  toDate(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Local YYYY-MM-DD for <input type="date"> values. */
export const SHOP_TZ = "Asia/Bangkok";
export const isoDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ }).format(d); // YYYY-MM-DD

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

/** Local YYYY-MM-DD `n` days from today. */
export const dayOffset = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return isoDay(d); };
