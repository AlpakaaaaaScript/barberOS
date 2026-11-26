import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, MapPin, Scissors } from "lucide-react";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import { money } from "@/lib/format";
import { Logo } from "@/components/shell";
import { getOpeningHours, getShop } from "@/lib/shop";
import { Avatar, Stars } from "@/components/ui";

export default async function Home() {
  const session = await getSession();
  // SQL: list active services and barber ratings for the public landing page
  const services = await sql<{ service_id: number; name: string; category: string; description: string; duration_min: number; price: number }>(
    "SELECT service_id, name, category, description, duration_min, price FROM service WHERE is_active ORDER BY price");
  const barbers = await sql<{ barber_id: number; full_name: string; specialty: string; bio: string; avg_rating: number; review_count: number }>(
    "SELECT barber_id, full_name, specialty, bio, avg_rating, review_count FROM v_barber_stats WHERE is_active ORDER BY barber_id");
  const shop = await getShop();
  const hours = await getOpeningHours();
  const cta = session ? `/${session.role}` : "/register";

  return (
    <div className="bg-bg">
      {/* Hero */}
      <section className="relative overflow-hidden bg-side text-side-ink">
        <div className="wf-hide pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, #a5372a 0 18px, transparent 18px 36px, #e9e2d6 36px 54px, transparent 54px 72px)" }} />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Logo light />
          <nav className="flex items-center gap-2 text-sm">
            <a href="#services" className="hidden rounded-lg px-3 py-2 text-side-muted hover:text-side-ink sm:block">Services</a>
            <a href="#barbers" className="hidden rounded-lg px-3 py-2 text-side-muted hover:text-side-ink sm:block">Barbers</a>
            {session
              ? <Link href={`/${session.role}`} className="btn btn-brand btn-sm">Open my portal</Link>
              : <><Link href="/login" className="rounded-lg px-3 py-2 font-semibold text-side-ink">Sign in</Link>
                 <Link href="/register" className="btn btn-brand btn-sm">Create account</Link></>}
          </nav>
        </header>
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pt-14 pb-24 md:grid-cols-[1.2fr_1fr] md:pt-20 md:pb-32">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-side-muted">
              <Scissors size={13} className="text-brand" /> {shop.name.toUpperCase()}
            </p>
            <h1 className="font-display text-5xl leading-[1.05] font-semibold tracking-tight md:text-7xl">
              {(shop.tagline ?? shop.name).split(". ")[0].replace(/\.$/, "")}.<br /><span className="text-brand">{(shop.tagline ?? "").split(". ").slice(1).join(". ") || "Book online."}</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-side-muted">
              Pick your barber, choose a time that suits you and walk straight into the chair. Real-time availability, every day.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={cta} className="btn btn-brand px-6 py-3 text-base">Book an appointment <ArrowRight size={18} /></Link>
              <a href="#services" className="btn border border-white/20 px-6 py-3 text-base text-side-ink hover:bg-white/5">View prices</a>
            </div>
          </div>
          <div className="card hidden self-end border-white/10 bg-side-active p-6 text-side-ink md:block">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-side-muted">Opening hours</p>
            <ul className="mt-4 space-y-2 text-sm">
              {hours.map((h) => (
                <li key={h.day} className="flex justify-between border-b border-white/10 pb-2 last:border-0"><span className="text-side-muted">{h.day}</span><span className="font-semibold">{h.open ? `${h.open} – ${h.close}` : "Closed"}</span></li>
              ))}
            </ul>
            <div className="mt-5 flex items-center gap-2 text-sm text-side-muted"><MapPin size={15} className="text-brand" /> {shop.address}</div>
            <div className="mt-1 text-sm text-side-muted">{shop.phone} · {shop.email}</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto -mt-12 grid max-w-6xl gap-4 px-6 md:grid-cols-3">
        {[
          [Scissors, "Choose a service", "From a classic cut to a hot towel shave, prices shown upfront."],
          [CalendarCheck, "Pick barber & time", "See live availability. No double bookings, ever."],
          [Clock, "Walk in, sit down", `Reschedule or cancel online up to ${shop.cancel_window_hours} hours before.`],
        ].map(([Icon, t, d], i) => {
          const I = Icon as typeof Scissors;
          return (
            <div key={i} className="card relative p-6">
              <span className="font-display text-sm font-semibold text-brand">0{i + 1}</span>
              <I size={22} className="mt-3" />
              <h3 className="mt-3 font-display text-lg font-semibold">{t as string}</h3>
              <p className="mt-1 text-sm text-muted">{d as string}</p>
            </div>
          );
        })}
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Menu</p>
            <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight">Services & prices</h2>
          </div>
          <Link href={cta} className="btn btn-ghost">Book now <ArrowRight size={16} /></Link>
        </div>
        <div className="mt-10 grid gap-x-12 md:grid-cols-2">
          {services.map((s) => (
            <div key={s.service_id} className="flex items-baseline gap-4 border-b border-line py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">{s.category}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted">{s.description} · {s.duration_min} min</p>
              </div>
              <span className="ml-auto font-display text-xl font-semibold">{money(s.price)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Barbers */}
      <section id="barbers" className="border-t border-line bg-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">The team</p>
          <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight">Meet your barbers</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {barbers.map((b) => (
              <div key={b.barber_id} className="card p-6">
                <Avatar name={b.full_name} size={56} />
                <h3 className="mt-4 font-display text-lg font-semibold">{b.full_name}</h3>
                <p className="text-sm font-medium text-brand">{b.specialty}</p>
                <p className="mt-2 text-sm text-muted">{b.bio}</p>
                <div className="mt-4 flex items-center gap-2 text-sm"><Stars value={b.avg_rating} /> <span className="font-semibold">{b.avg_rating}</span><span className="text-muted">({b.review_count})</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-side text-side-muted">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm">
          <Logo light />
          <p>© 2026 {shop.name} · {shop.address} · {shop.phone}</p>
        </div>
      </footer>
    </div>
  );
}
