import type { Metadata } from "next";
import { Fraunces, Manrope, Balsamiq_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"], weight: ["500", "600", "700"] });
const ui = Manrope({ variable: "--font-ui", subsets: ["latin"] });
const wire = Balsamiq_Sans({ variable: "--font-wire", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "barberOS: barber shop management",
  description: "Online booking, barber scheduling and shop analytics.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const wf = (await cookies()).get("wf")?.value === "1";
  return (
    <html lang="en" className={`${serif.variable} ${ui.variable} ${wire.variable} h-full antialiased ${wf ? "wf" : ""}`} data-theme={wf ? "wireframe" : undefined}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
