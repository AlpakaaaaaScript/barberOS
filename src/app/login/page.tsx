import Link from "next/link";
import { login } from "@/app/actions";
import { AuthLayout } from "@/components/auth-layout";
import { Field, Flash } from "@/components/ui";

const DEMO = [
  ["Customer", "customer@barberos.com"],
  ["Barber", "barber@barberos.com"],
  ["Owner", "owner@barberos.com"],
];

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, ok } = (await searchParams) as { error?: string; ok?: string };
  return (
    <AuthLayout title="Welcome back" desc="Sign in to book, manage your chair or run the shop.">
      <Flash error={error} ok={ok} />
      <form action={login} className="space-y-4">
        <Field label="Email"><input name="email" type="email" required className="input" placeholder="you@example.com" autoComplete="email" /></Field>
        <Field label="Password"><input name="password" type="password" required className="input" placeholder="••••••••" autoComplete="current-password" /></Field>
        <button className="btn btn-primary w-full py-2.5">Sign in</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">New here? <Link href="/register" className="font-semibold text-ink underline underline-offset-4">Create a customer account</Link></p>

      <div className="mt-10 rounded-xl border border-dashed border-line p-4">
        <p className="text-sm font-semibold text-muted">Demo accounts (password: password123)</p>
        <div className="mt-3 grid gap-2">
          {DEMO.map(([role, email]) => (
            <form key={role} action={login}>
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="password" value="password123" />
              <button className="flex min-h-11 w-full items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-left text-sm hover:bg-brand-soft">
                <span className="font-semibold">{role}</span><span className="text-muted">{email}</span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
