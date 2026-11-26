import { requireRole } from "@/lib/session";
import { Shell } from "@/components/shell";

export default async function CustomerLayout({ children }: LayoutProps<"/customer">) {
  const session = await requireRole("customer");
  return (
    <Shell session={session} nav={[
      { href: "/customer", label: "Overview" },
      { href: "/customer/book", label: "Book appointment" },
      { href: "/customer/appointments", label: "My appointments" },
      { href: "/customer/reviews", label: "My reviews" },
      { href: "/customer/profile", label: "Profile" },
    ]}>{children}</Shell>
  );
}
