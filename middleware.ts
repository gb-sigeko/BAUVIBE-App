import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { AppRole } from "@/types/roles";

const PUBLIC_PREFIXES = ["/login", "/api/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const GF_ROLES = new Set<AppRole>(["GF", "ADMIN"]);
const EXPORT_ROLES = new Set<AppRole>(["BUERO", "ADMIN", "GF"]);
const COMM_WRITE_ROLES = new Set<AppRole>(["BUERO", "ADMIN", "SIKOGO"]);

function jsonForbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const method = req.method;

  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req, secret });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = token.role as AppRole | undefined;
  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/gf" || pathname.startsWith("/api/gf/")) {
    if (!GF_ROLES.has(role)) {
      if (pathname.startsWith("/api/")) return jsonForbidden();
      return NextResponse.redirect(new URL("/fee", req.url));
    }
  }

  if (pathname === "/api/export" || pathname.startsWith("/api/export/")) {
    if (!EXPORT_ROLES.has(role)) {
      return jsonForbidden();
    }
  }

  if (pathname === "/api/communication" || pathname.startsWith("/api/communication/")) {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(method) && !COMM_WRITE_ROLES.has(role)) {
      return jsonForbidden();
    }
  }

  if (pathname.startsWith("/eigene-planung") && role !== "EXTERN") {
    return NextResponse.redirect(new URL("/fee", req.url));
  }

  if (role === "EXTERN") {
    const isVorort = /^\/api\/planung\/entries\/[^/]+\/vorort\/?$/.test(pathname);
    const isPlanungOwnGet = method === "GET" && pathname === "/api/planung" && req.nextUrl.searchParams.get("filter") === "own";
    const allowed =
      pathname.startsWith("/eigene-planung") ||
      pathname.startsWith("/api/me/") ||
      pathname.startsWith("/api/availability") ||
      isVorort ||
      isPlanungOwnGet;

    if (!allowed) {
      if (pathname.startsWith("/api/")) return jsonForbidden();
      const url = req.nextUrl.clone();
      url.pathname = "/eigene-planung";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
