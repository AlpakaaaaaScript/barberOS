import { NextResponse, type NextRequest } from "next/server";

// /wireframe?on=1&next=/owner  → turns the greyscale wireframe presentation style on (on=0 turns it off)
export function GET(req: NextRequest) {
  const on = req.nextUrl.searchParams.get("on") !== "0";
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const res = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", req.url));
  res.cookies.set("wf", on ? "1" : "0", { path: "/" });
  return res;
}
