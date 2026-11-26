import "server-only";
import { one, sql } from "@/lib/db";
import { WEEKDAYS } from "@/lib/format";

export type Shop = { name: string; tagline: string | null; address: string; phone: string; email: string;
  cancel_window_hours: number; baht_per_point: number; updated_at: string };

// SQL: SELECT the single shop_info row
export const getShop = async () => (await one<Shop>("SELECT * FROM shop_info WHERE shop_id = 1"))!;

/** Opening hours per weekday = earliest start / latest end of any active barber that day. */
export async function getOpeningHours() {
  // SQL: opening hours derived from working_hours of active barbers (GROUP BY weekday)
  const rows = await sql<{ weekday: number; open: string; close: string; barbers: number }>(`
    SELECT w.weekday, to_char(min(w.start_time), 'HH24:MI') AS open, to_char(max(w.end_time), 'HH24:MI') AS close, count(*) AS barbers
    FROM working_hours w JOIN app_user u ON u.user_id = w.barber_id AND u.is_active
    GROUP BY w.weekday`);
  return [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: WEEKDAYS[d], ...rows.find((r) => r.weekday === d) }));
}
