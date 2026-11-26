import Link from "next/link";
import { register } from "@/app/actions";
import { AuthLayout } from "@/components/auth-layout";
import { Field, Flash } from "@/components/ui";

export default async function Register({ searchParams }: PageProps<"/register">) {
  const { error } = (await searchParams) as { error?: string };
  return (
    <AuthLayout title="Create your account" desc="Book in seconds, earn a loyalty point for every ฿10 you spend.">
      <Flash error={error} />
      <form action={register} className="space-y-4">
        <Field label="Full name"><input name="full_name" required minLength={2} className="input" placeholder="Somchai Jaidee" /></Field>
        <Field label="Email"><input name="email" type="email" required className="input" placeholder="you@example.com" /></Field>
        <Field label="Phone"><input name="phone" type="tel" pattern="[0-9+\- ]{8,20}" className="input" placeholder="081-234-5678" /></Field>
        <Field label="Password" hint="At least 6 characters"><input name="password" type="password" required minLength={6} className="input" /></Field>
        <button className="btn btn-primary w-full py-2.5">Create account</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-ink underline underline-offset-4">Sign in</Link></p>
    </AuthLayout>
  );
}
