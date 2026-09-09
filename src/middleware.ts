import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = pathname === "/";

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 🔹 Debug


  // 1. Public path `/`
  if (isPublicPath) {
    if (token) {
      if (token.flag === "1") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      const roles = (token.roles as string[]) || [];
      const firstAllowed = roles.find((r) => r.startsWith("/dashboard"));

      return NextResponse.redirect(new URL(firstAllowed || "/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 2. Private paths `/dashboard`
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Admin bypass
    if (token.flag === "1") {
      return NextResponse.next();
    }

    const roles = (token.roles as string[]) || [];

    // `/dashboard` root → send to first allowed page
    if (pathname === "/dashboard") {
      const firstAllowed = roles.find((r) => r.startsWith("/dashboard"));
      return NextResponse.redirect(new URL(firstAllowed || "/", request.url));
    }

    // Deliberately NOT doing an exact-path permission check here anymore.
    // It can never work for dynamic routes — /dashboard/customer/profile/4,
    // /dashboard/order-process/invoice/7, /dashboard/tailor/orders/12, and
    // every other detail page contain a specific ID that can never appear
    // in a static permission checkbox, so the old check failed for 100% of
    // these pages regardless of what was actually granted, silently
    // bouncing the user to their first allowed page every time. Page-level
    // and action-level access is already enforced correctly in two other
    // places: the sidebar/hasPermission() checks control what's clickable,
    // and every data-fetching action enforces real ownership (scopeWhere,
    // assertCanModifyRecord) so someone can never see another franchise's
    // data even if they guess a URL.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
