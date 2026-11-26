import { requireRole } from "@/lib/session";
import { Shell } from "@/components/shell";

export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  const session = await requireRole("owner");
  return (
    <Shell session={session} nav={[
      { href: "/owner", label: "Dashboard" },
      { href: "/owner/appointments", label: "Appointments" },
      { href: "/owner/barbers", label: "Barbers" },
      { href: "/owner/services", label: "Services" },
      { href: "/owner/customers", label: "Customers" },
      { href: "/owner/shop", label: "Shop settings" },
    ]}>{children}</Shell>
  );
}
