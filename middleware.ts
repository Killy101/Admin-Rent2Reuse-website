import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define paths that should be protected
const protectedPaths = ["/admin"];
const authPaths = ["/auth/signin"];

export function middleware(request: NextRequest) {
  // Get stored admin data
  const adminData = request.cookies.get("adminData")?.value === "true";

  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Check for protected routes access
if (isProtectedPath && !adminData) {
  const redirectUrl = new URL("/auth/signin", request.url);
  redirectUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(redirectUrl);
}


  // Prevent authenticated users from accessing auth pages
  if (isAuthPath && adminData) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    // Protected routes
    "/admin/:path*",
    // Auth routes
    "/auth/signin",
  ],
};
