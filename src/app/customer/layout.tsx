import { CalendarDays, CalendarPlus, LayoutDashboard, Star, UserRound } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Shell } from "@/components/shell";

export default async function CustomerLayout({ children }: LayoutProps<"/customer">) {
  const session = await requireRole("customer");
  return (
    <Shell session={session} nav={[
      { href: "/customer", label: "Overview", icon: <LayoutDashboard size={17} /> },
      { href: "/customer/book", label: "Book appointment", icon: <CalendarPlus size={17} /> },
      { href: "/customer/appointments", label: "My appointments", icon: <CalendarDays size={17} /> },
      { href: "/customer/reviews", label: "My reviews", icon: <Star size={17} /> },
      { href: "/customer/profile", label: "Profile", icon: <UserRound size={17} /> },
    ]}>{children}</Shell>
  );
}
