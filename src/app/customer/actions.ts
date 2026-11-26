"use server";
import { redirect } from "next/navigation";
import { sql, dbMessage } from "@/lib/db";
import { requireRole, setSession, clearSession } from "@/lib/session";
import { back, str, num } from "@/lib/flash";

// CREATE appointment — SQL: SELECT book_appointment($1,$2,$3,$4,$5)
export async function bookAppointment(form: FormData) {
  const s = await requireRole("customer");
  const ret = `/customer/book?service=${num(form, "service")}&barber=${num(form, "barber")}&date=${str(form, "date")}`;
  try {
    await sql("SELECT book_appointment($1, $2, $3, $4::timestamp, $5)",
      [s.userId, num(form, "barber"), num(form, "service"), str(form, "slot"), str(form, "note")]);
  } catch (e) { back(ret, { error: dbMessage(e) }); }
  redirect("/customer/appointments?ok=Your appointment is booked. See you soon!");
}

// UPDATE appointment status → cancelled — SQL: SELECT cancel_appointment($1,$2)
export async function cancelAppointment(form: FormData) {
  const s = await requireRole("customer");
  try { await sql("SELECT cancel_appointment($1, $2)", [num(form, "id"), s.userId]); }
  catch (e) { back("/customer/appointments", { error: dbMessage(e) }); }
  back("/customer/appointments", { ok: "Appointment cancelled." });
}

// UPDATE appointment time — SQL: SELECT reschedule_appointment($1,$2,$3)
export async function rescheduleAppointment(form: FormData) {
  const s = await requireRole("customer");
  const id = num(form, "id");
  try { await sql("SELECT reschedule_appointment($1, $2, $3::timestamp)", [id, s.userId, str(form, "slot")]); }
  catch (e) { back(`/customer/appointments/${id}/reschedule?date=${str(form, "date")}`, { error: dbMessage(e) }); }
  back("/customer/appointments", { ok: "Appointment rescheduled." });
}

// CREATE / UPDATE review — SQL: INSERT … ON CONFLICT (appointment_id) DO UPDATE
export async function saveReview(form: FormData) {
  const s = await requireRole("customer");
  try {
    const rows = await sql(
      `INSERT INTO review (appointment_id, rating, comment)
       SELECT a.appointment_id, $2, NULLIF($3, '') FROM appointment a WHERE a.appointment_id = $1 AND a.customer_id = $4
       ON CONFLICT (appointment_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
       RETURNING review_id`,
      [num(form, "appointment"), num(form, "rating"), str(form, "comment"), s.userId]);
    if (!rows.length) throw new Error("Appointment not found");
  } catch (e) { back("/customer/reviews", { error: dbMessage(e) }); }
  back("/customer/reviews", { ok: "Thanks! Your review has been saved." });
}

// DELETE review — SQL: DELETE FROM review USING appointment …
export async function deleteReview(form: FormData) {
  const s = await requireRole("customer");
  await sql(`DELETE FROM review r USING appointment a
             WHERE r.review_id = $1 AND a.appointment_id = r.appointment_id AND a.customer_id = $2`, [num(form, "id"), s.userId]);
  back("/customer/reviews", { ok: "Review deleted." });
}

// UPDATE profile — SQL: UPDATE app_user / customer
export async function updateProfile(form: FormData) {
  const s = await requireRole("customer");
  try {
    await sql("UPDATE app_user SET full_name = $1, phone = NULLIF($2, '') WHERE user_id = $3", [str(form, "full_name"), str(form, "phone"), s.userId]);
    await sql("UPDATE customer SET preferences = NULLIF($1, '') WHERE customer_id = $2", [str(form, "preferences"), s.userId]);
  } catch (e) { back("/customer/profile", { error: dbMessage(e) }); }
  await setSession({ ...s, name: str(form, "full_name") });
  back("/customer/profile", { ok: "Profile updated." });
}

// UPDATE password — SQL: UPDATE app_user SET password_hash = crypt(...) WHERE password matches
export async function changePassword(form: FormData) {
  const s = await requireRole("customer");
  if (str(form, "new").length < 6) back("/customer/profile", { error: "New password must be at least 6 characters." });
  const rows = await sql(
    `UPDATE app_user SET password_hash = crypt($1, gen_salt('bf'))
     WHERE user_id = $2 AND password_hash = crypt($3, password_hash) RETURNING user_id`,
    [str(form, "new"), s.userId, str(form, "current")]);
  back("/customer/profile", rows.length ? { ok: "Password changed." } : { error: "Current password is incorrect." });
}

// DELETE account — SQL: DELETE FROM app_user (cascades to customer, appointments, reviews)
export async function deleteAccount() {
  const s = await requireRole("customer");
  await sql("DELETE FROM app_user WHERE user_id = $1 AND role = 'customer'", [s.userId]);
  await clearSession();
  redirect("/login?ok=Your account has been deleted.");
}
