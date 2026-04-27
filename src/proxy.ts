import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/workout",
  "/history",
  "/exercises",
  "/splits",
  "/settings",
  "/onboarding",
];

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

function stripLocale(pathname: string): { locale: string | null; rest: string } {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return { locale, rest: "/" };
    if (pathname.startsWith(`/${locale}/`)) {
      return { locale, rest: pathname.slice(`/${locale}`.length) };
    }
  }
  return { locale: null, rest: pathname };
}

function detectLocale(request: NextRequest): string {
  const { locale } = stripLocale(request.nextUrl.pathname);
  if (locale) return locale;
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && routing.locales.includes(cookieLocale as "tr" | "en")) {
    return cookieLocale;
  }
  return routing.defaultLocale;
}

export default async function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");

  let response: NextResponse;
  if (isApi) {
    response = NextResponse.next();
  } else {
    const intlResponse = intlMiddleware(request);
    if (intlResponse.headers.get("location")) {
      return intlResponse;
    }
    response = intlResponse instanceof NextResponse ? intlResponse : NextResponse.next();
  }

  // Expose pathname to server components/layouts.
  response.headers.set("x-pathname", request.nextUrl.pathname);

  const { isAuthenticated } = await updateSession(request, response);

  const { rest } = stripLocale(request.nextUrl.pathname);
  const locale = detectLocale(request);

  const isProtected = PROTECTED_PREFIXES.some((p) => rest === p || rest.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => rest === p || rest.startsWith(`${p}/`));

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
