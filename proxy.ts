import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const key = new TextEncoder().encode(process.env.SESSION_SECRET);

const PROTECTED = ["/monitor", "/settings", "/history", "/welcome"];
const AUTH_PAGES = ["/auth/login", "/auth/signup"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Le cookie doit exister ET avoir une signature valide non expirée
  let loggedIn = false;
  const token = req.cookies.get("session")?.value;
  if (token) {
    try {
      await jwtVerify(token, key, { algorithms: ["HS256"] });
      loggedIn = true;
    } catch {
      loggedIn = false;
    }
  }

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // Pas connectée : direction la page de connexion
  if (isProtected && !loggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Déjà connectée : inutile de revoir login/signup
  if (AUTH_PAGES.includes(pathname) && loggedIn) {
    return NextResponse.redirect(new URL("/monitor", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/monitor/:path*",
    "/welcome/:path*",
    "/settings/:path*",
    "/history/:path*",
    "/auth/login",
    "/auth/signup",
  ],
};
