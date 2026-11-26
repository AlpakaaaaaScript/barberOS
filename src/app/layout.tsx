import type { Metadata } from "next";
import { Epilogue, IBM_Plex_Mono, Balsamiq_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const epilogue = Epilogue({ variable: "--font-epilogue", subsets: ["latin"], weight: ["400", "600", "700"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400"] });
const wire = Balsamiq_Sans({ variable: "--font-wire", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "barberOS: barber shop management",
  description: "Online booking, barber scheduling and shop analytics.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const wf = (await cookies()).get("wf")?.value === "1";
  return (
    <html lang="en" className={`${epilogue.variable} ${mono.variable} ${wire.variable} h-full ${wf ? "wf" : ""}`} data-theme={wf ? "wireframe" : undefined}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
