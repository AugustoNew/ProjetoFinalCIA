import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((request) => {
  const isLoggedIn = Boolean(request.auth?.user);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (request.nextUrl.pathname.startsWith("/painel") && !isLoggedIn) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/painel", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/painel/:path*", "/login"],
};
