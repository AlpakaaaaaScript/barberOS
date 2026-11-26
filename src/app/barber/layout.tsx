import { CalendarDays, Clock, LayoutDashboard, TrendingUp, UserRound } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Shell } from "@/components/shell";

export default async function BarberLayout({ children }: LayoutProps<"/barber">) {
  const session = await requireRole("barber");
  return (
    <Shell session={session} nav={[
      { href: "/barber", label: "Today", icon: <LayoutDashboard size={17} /> },
      { href: "/barber/schedule", label: "Schedule", icon: <CalendarDays size={17} /> },
      { href: "/barber/availability", label: "Availability", icon: <Clock size={17} /> },
      { href: "/barber/earnings", label: "Earnings & reviews", icon: <TrendingUp size={17} /> },
      { href: "/barber/profile", label: "Profile", icon: <UserRound size={17} /> },
    ]}>{children}</Shell>
  );
}
