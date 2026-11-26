"use server";
import { redirect } from "next/navigation";
import { one, dbMessage } from "@/lib/db";
import { setSession, clearSession, type Role } from "@/lib/session";
import { back, str } from "@/lib/flash";

// SQL: SELECT * FROM authenticate($1, $2)  — Login screen
export async function login(form: FormData) {
  const user = await one<{ user_id: number; full_name: string; role: Role }>(
    "SELECT * FROM authenticate($1, $2)", [str(form, "email"), str(form, "password")]);
  if (!user) back("/login", { error: "Incorrect email or password." });
  await setSession({ userId: user.user_id, role: user.role, name: user.full_name });
  redirect(`/${user.role}`);
}

// SQL: SELECT register_customer($1, $2, $3, $4)  — Register screen
export async function register(form: FormData) {
  let id: number;
  try {
    const row = await one<{ id: number }>("SELECT register_customer($1, $2, $3, $4) AS id",
      [str(form, "email"), str(form, "password"), str(form, "full_name"), str(form, "phone")]);
    id = row!.id;
  } catch (e) {
    back("/register", { error: dbMessage(e).replace("That record already exists", "An account with this email already exists") });
  }
  await setSession({ userId: id, role: "customer", name: str(form, "full_name") });
  redirect("/customer?ok=Welcome to barberOS! Book your first visit.");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
