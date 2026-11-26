"use server";
import { sql, dbMessage } from "@/lib/db";
import { requireRole, setSession } from "@/lib/session";
import { back, str, num } from "@/lib/flash";

// UPDATE appointment status booked → in_progress — SQL: UPDATE appointment SET status='in_progress' (own bookings only)
export async function startAppointment(form: FormData) {
  const s = await requireRole("barber");
  try {
    const rows = await sql(
      `UPDATE appointment SET status = 'in_progress'
       WHERE appointment_id = $1 AND barber_id = $2 AND status = 'booked' RETURNING appointment_id`,
      [num(form, "id"), s.userId]);
    if (!rows.length) throw new Error("Only your booked appointments can be started.");
  } catch (e) { back("/barber", { error: dbMessage(e) }); }
  back("/barber", { ok: "Visit started." });
}

// UPDATE appointment status booked → no_show — SQL: UPDATE appointment SET status='no_show' (only once start_at has passed)
export async function markNoShow(form: FormData) {
  const s = await requireRole("barber");
  try {
    const rows = await sql(
      `UPDATE appointment SET status = 'no_show'
       WHERE appointment_id = $1 AND barber_id = $2 AND status = 'booked' AND start_at <= now() RETURNING appointment_id`,
      [num(form, "id"), s.userId]);
    if (!rows.length) throw new Error("A no-show can only be recorded for a booked appointment whose start time has passed.");
  } catch (e) { back("/barber", { error: dbMessage(e) }); }
  back("/barber", { ok: "Marked as no-show." });
}

// CREATE payment + complete visit — SQL: SELECT checkout_appointment($1,$2,$3,$4::pay_method)
export async function checkout(form: FormData) {
  const s = await requireRole("barber");
  try {
    await sql("SELECT checkout_appointment($1, $2, $3, $4::pay_method)",
      [num(form, "id"), s.userId, num(form, "tip") || 0, str(form, "method")]);
  } catch (e) { back("/barber", { error: dbMessage(e) }); }
  back("/barber", { ok: "Payment recorded, visit completed." });
}

// REPLACE weekly hours — SQL: one statement: upsert the checked days, delete the unchecked ones
export async function saveHours(form: FormData) {
  const s = await requireRole("barber");
  const days: number[] = [], starts: string[] = [], ends: string[] = [];
  for (let d = 0; d < 7; d++) {
    if (form.get(`work_${d}`) !== "on") continue;
    if (!str(form, `start_${d}`) || !str(form, `end_${d}`)) back("/barber/availability", { error: "Enter a start and end time for every working day." });
    days.push(d); starts.push(str(form, `start_${d}`)); ends.push(str(form, `end_${d}`));
  }
  try {
    await sql(
      `WITH up AS (
         INSERT INTO working_hours (barber_id, weekday, start_time, end_time)
         SELECT $1, d, st, en FROM unnest($2::smallint[], $3::time[], $4::time[]) AS t(d, st, en)
         ON CONFLICT (barber_id, weekday) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time
       )
       DELETE FROM working_hours WHERE barber_id = $1 AND weekday <> ALL($2::smallint[])`,
      [s.userId, days, starts, ends]);
  } catch (e) {
    const code = (e as { code?: string }).code;
    back("/barber/availability", { error: code === "23514" ? "End time must be after start time." : dbMessage(e) });
  }
  back("/barber/availability", { ok: "Working hours saved." });
}

// CREATE time off — SQL: INSERT INTO time_off
export async function addTimeOff(form: FormData) {
  const s = await requireRole("barber");
  try {
    await sql("INSERT INTO time_off (barber_id, start_date, end_date, reason) VALUES ($1, $2, $3, NULLIF($4, ''))",
      [s.userId, str(form, "start_date"), str(form, "end_date"), str(form, "reason")]);
  } catch (e) {
    const code = (e as { code?: string }).code;
    back("/barber/availability", { error: code === "23514" ? "End date must be on or after the start date." : dbMessage(e) });
  }
  back("/barber/availability", { ok: "Time off added." });
}

// DELETE time off — SQL: DELETE FROM time_off WHERE time_off_id AND barber_id
export async function deleteTimeOff(form: FormData) {
  const s = await requireRole("barber");
  await sql("DELETE FROM time_off WHERE time_off_id = $1 AND barber_id = $2", [num(form, "id"), s.userId]);
  back("/barber/availability", { ok: "Time off removed." });
}

// UPDATE profile — SQL: UPDATE app_user / barber
export async function updateProfile(form: FormData) {
  const s = await requireRole("barber");
  try {
    await sql("UPDATE app_user SET full_name = $1, phone = NULLIF($2, '') WHERE user_id = $3", [str(form, "full_name"), str(form, "phone"), s.userId]);
    await sql("UPDATE barber SET specialty = NULLIF($1, ''), bio = NULLIF($2, '') WHERE barber_id = $3", [str(form, "specialty"), str(form, "bio"), s.userId]);
  } catch (e) { back("/barber/profile", { error: dbMessage(e) }); }
  await setSession({ ...s, name: str(form, "full_name") });
  back("/barber/profile", { ok: "Profile updated." });
}
