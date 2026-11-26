"use server";
import { sql, one, dbMessage } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { back, str, num } from "@/lib/flash";

const ids = (f: FormData, k: string) => f.getAll(k).map(Number).filter(Boolean);

// ---------------------------------------------------------------- Barbers
// CREATE barber — SQL: SELECT create_barber(...) + INSERT INTO barber_service
export async function createBarber(form: FormData) {
  await requireRole("owner");
  try {
    const row = await one<{ id: number }>("SELECT create_barber($1,$2,$3,$4,$5,$6,$7) AS id",
      [str(form, "email"), str(form, "password"), str(form, "full_name"), str(form, "phone"),
       str(form, "specialty"), str(form, "bio"), num(form, "commission_rate")]);
    await sql("INSERT INTO barber_service (barber_id, service_id) SELECT $1, unnest($2::int[])", [row!.id, ids(form, "services")]);
  } catch (e) { back("/owner/barbers?new=1", { error: dbMessage(e) }); }
  back("/owner/barbers", { ok: "Barber added. Default schedule: Tuesday to Saturday, 10:00 to 19:00." });
}

// UPDATE barber — SQL: UPDATE app_user, UPDATE barber, replace barber_service rows
export async function updateBarber(form: FormData) {
  await requireRole("owner");
  const id = num(form, "id");
  try {
    await sql("UPDATE app_user SET full_name = $1, phone = NULLIF($2,'') WHERE user_id = $3", [str(form, "full_name"), str(form, "phone"), id]);
    await sql("UPDATE barber SET specialty = $1, bio = $2, commission_rate = $3 WHERE barber_id = $4",
      [str(form, "specialty"), str(form, "bio"), num(form, "commission_rate"), id]);
    await sql("DELETE FROM barber_service WHERE barber_id = $1", [id]);
    await sql("INSERT INTO barber_service (barber_id, service_id) SELECT $1, unnest($2::int[])", [id, ids(form, "services")]);
  } catch (e) { back(`/owner/barbers?edit=${id}`, { error: dbMessage(e) }); }
  back("/owner/barbers", { ok: "Barber updated." });
}

// DELETE (soft) barber — SQL: UPDATE app_user SET is_active = NOT is_active
export async function toggleBarber(form: FormData) {
  await requireRole("owner");
  const r = await one<{ is_active: boolean }>(
    "UPDATE app_user SET is_active = NOT is_active WHERE user_id = $1 AND role = 'barber' RETURNING is_active", [num(form, "id")]);
  back("/owner/barbers", { ok: r?.is_active ? "Barber reactivated." : "Barber deactivated: hidden from booking, history kept." });
}

// ---------------------------------------------------------------- Services
// CREATE / UPDATE service — SQL: INSERT INTO service … / UPDATE service SET …
export async function saveService(form: FormData) {
  await requireRole("owner");
  const id = num(form, "id");
  const vals = [str(form, "name"), str(form, "category"), str(form, "description"), num(form, "duration_min"), num(form, "price")];
  try {
    if (id) await sql("UPDATE service SET name=$1, category=$2, description=$3, duration_min=$4, price=$5 WHERE service_id=$6", [...vals, id]);
    else await sql("INSERT INTO service (name, category, description, duration_min, price) VALUES ($1,$2,$3,$4,$5)", vals);
  } catch (e) { back(`/owner/services?${id ? `edit=${id}` : "new=1"}`, { error: dbMessage(e) }); }
  back("/owner/services", { ok: id ? "Service updated." : "Service added." });
}

// UPDATE service availability — SQL: UPDATE service SET is_active = NOT is_active
export async function toggleService(form: FormData) {
  await requireRole("owner");
  await sql("UPDATE service SET is_active = NOT is_active WHERE service_id = $1", [num(form, "id")]);
  back("/owner/services", { ok: "Service availability changed." });
}

// DELETE service — SQL: DELETE FROM service (fails with FK error if it has appointments)
export async function deleteService(form: FormData) {
  await requireRole("owner");
  try { await sql("DELETE FROM service WHERE service_id = $1", [num(form, "id")]); }
  catch { back("/owner/services", { error: "This service has appointment history, so deactivate it instead." }); }
  back("/owner/services", { ok: "Service deleted." });
}

// ---------------------------------------------------------------- Appointments
// UPDATE appointment status (owner override) — SQL: UPDATE appointment SET status = $1
export async function setAppointmentStatus(form: FormData) {
  await requireRole("owner");
  const ret = str(form, "return") || "/owner/appointments";
  try { await sql("UPDATE appointment SET status = $1::appt_status WHERE appointment_id = $2", [str(form, "status"), num(form, "id")]); }
  catch (e) { back(ret, { error: dbMessage(e) }); }
  back(ret, { ok: `Appointment #${num(form, "id")} marked ${str(form, "status").replace("_", " ")}.` });
}

// ---------------------------------------------------------------- Customers
// UPDATE loyalty points — SQL: UPDATE customer SET loyalty_points = $1
export async function setPoints(form: FormData) {
  await requireRole("owner");
  try { await sql("UPDATE customer SET loyalty_points = $1 WHERE customer_id = $2", [num(form, "points"), num(form, "id")]); }
  catch (e) { back("/owner/customers", { error: dbMessage(e) }); }
  back("/owner/customers", { ok: "Loyalty points updated." });
}

// UPDATE customer account status — SQL: UPDATE app_user SET is_active = NOT is_active
export async function toggleCustomer(form: FormData) {
  await requireRole("owner");
  await sql("UPDATE app_user SET is_active = NOT is_active WHERE user_id = $1 AND role = 'customer'", [num(form, "id")]);
  back("/owner/customers", { ok: "Customer account status changed." });
}

// DELETE customer — SQL: DELETE FROM app_user (cascade)
export async function deleteCustomer(form: FormData) {
  await requireRole("owner");
  await sql("DELETE FROM app_user WHERE user_id = $1 AND role = 'customer'", [num(form, "id")]);
  back("/owner/customers", { ok: "Customer deleted." });
}

// ---------------------------------------------------------------- Shop information
// UPDATE shop info (name, contact, booking rules) — SQL: UPDATE shop_info SET … WHERE shop_id = 1
export async function updateShop(form: FormData) {
  await requireRole("owner");
  try {
    await sql(`UPDATE shop_info SET name = $1, tagline = NULLIF($2, ''), address = $3, phone = $4, email = $5,
                      cancel_window_hours = $6, baht_per_point = $7, updated_at = now() WHERE shop_id = 1`,
      [str(form, "name"), str(form, "tagline"), str(form, "address"), str(form, "phone"), str(form, "email"),
       num(form, "cancel_window_hours"), num(form, "baht_per_point")]);
  } catch (e) { back("/owner/shop", { error: dbMessage(e) }); }
  back("/owner/shop", { ok: "Shop information saved. Customers see it immediately." });
}
