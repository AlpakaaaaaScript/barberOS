import { requireRole } from "@/lib/session";
import { Shell } from "@/components/shell";

export default async function BarberLayout({ children }: LayoutProps<"/barber">) {
  const session = await requireRole("barber");
  return (
    <Shell session={session} nav={[
      { href: "/barber", label: "Today" },
      { href: "/barber/schedule", label: "Schedule" },
      { href: "/barber/availability", label: "Availability" },
      { href: "/barber/earnings", label: "Earnings & reviews" },
      { href: "/barber/profile", label: "Profile" },
    ]}>{children}</Shell>
  );
}
