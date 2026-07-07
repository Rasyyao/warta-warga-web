import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/app/lib/session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/api/dashboard",
  "/api/whatsapp",
  "/api/rag",
  "/api/settings",
  "/api/reports",
];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  const session = await decryptSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/dashboard/:path*",
    "/api/whatsapp/:path*",
    "/api/rag/:path*",
    "/api/settings/:path*",
    "/api/reports/:path*",
  ],
};
