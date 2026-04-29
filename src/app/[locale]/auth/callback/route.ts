import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSiteUrl } from "@/lib/auth/site-url";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const errorDescription = url.searchParams.get("error_description");

  if (errorDescription) {
    const baseUrl = await getSiteUrl();
    return NextResponse.redirect(new URL(`/${locale}/login?error=oauth`, baseUrl));
  }

  const redirectPath = type === "recovery" ? `/${locale}/reset-password` : `/${locale}/dashboard`;
  const siteUrl = await getSiteUrl();
  const response = NextResponse.redirect(new URL(redirectPath, siteUrl));

  if (code) {
    // Cookie'leri doğrudan redirect response'una yaz; createClient() farklı bir
    // response nesnesi kullandığından session cookie'leri taşınmıyor.
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const baseUrl = await getSiteUrl();
      return NextResponse.redirect(new URL(`/${locale}/login?error=oauth`, baseUrl));
    }
  }

  return response;
}
