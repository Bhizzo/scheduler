import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/", "/login", "/signup"];
const ADMIN_PREFIX = "/admin";
const USER_ONLY = ["/dashboard", "/book"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never interfere with API routes — they handle their own auth and
  // return JSON 401s rather than HTML redirects. This includes
  // /api/auth/* (NextAuth), /api/signup, /api/meetings, etc.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    /\.(svg|png|jpg|jpeg|webp|ico|gif|txt|xml|js|css)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // If logged in and visiting /, /login, /signup — route to the right dashboard
  if (token && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
    const target = token.role === "ASSISTANT" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  // Anything else requires a session
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin area — assistants only
  if (pathname.startsWith(ADMIN_PREFIX) && token.role !== "ASSISTANT") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // User area — redirect assistants to admin to avoid confusion
  if (USER_ONLY.some((p) => pathname.startsWith(p)) && token.role === "ASSISTANT") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
