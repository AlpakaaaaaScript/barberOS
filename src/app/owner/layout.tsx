import { CalendarRange, LayoutDashboard, Scissors, UsersRound, Contact, Store } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Shell } from "@/components/shell";

export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  const session = await requireRole("owner");
  return (
    <Shell session={session} nav={[
      { href: "/owner", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
      { href: "/owner/appointments", label: "Appointments", icon: <CalendarRange size={17} /> },
      { href: "/owner/barbers", label: "Barbers", icon: <UsersRound size={17} /> },
      { href: "/owner/services", label: "Services", icon: <Scissors size={17} /> },
      { href: "/owner/customers", label: "Customers", icon: <Contact size={17} /> },
      { href: "/owner/shop", label: "Shop settings", icon: <Store size={17} /> },
    ]}>{children}</Shell>
  );
}
