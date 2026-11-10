import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/welcome", "/login", "/register", "/forgot-password", "/reset-password"];
const SESSION_COOKIE = "tw_session";

/**
 * Sends visitors without a session cookie to the welcome page. The session itself is verified
 * with Appwrite by every server action and API route, so a forged cookie gets nothing.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));
  if (!hasSession && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = path === "/" ? "/welcome" : "/login";
    to.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(to);
  }
  if (hasSession && ["/welcome", "/login", "/register"].includes(path)) {
    const to = request.nextUrl.clone();
    to.pathname = "/";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest|api/|.*\.(?:png|jpg|svg|webp|ico|mp3)$).*)"],
};
