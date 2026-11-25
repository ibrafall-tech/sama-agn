import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, sessionSecret, verifySession } from "./lib/session";

export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(COOKIE)?.value, sessionSecret());
  if (session) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Session expirée, reconnectez-vous." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|offline|api/session|_next/|icons/|manifest.webmanifest|sw.js|favicon.ico|icon|apple-icon).*)"],
};
