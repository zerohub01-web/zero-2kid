import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/internal/")) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/ops/login") {
    return NextResponse.rewrite(new URL("/login", request.url));
  }

  if (request.nextUrl.pathname === "/ops" || request.nextUrl.pathname.startsWith("/ops/")) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname =
      request.nextUrl.pathname === "/ops"
        ? "/zero-control"
        : `/zero-control${request.nextUrl.pathname.slice("/ops".length)}`;

    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
