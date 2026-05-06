import { Dumbbell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/layout/Container";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUserWithProfile();
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <Container className="flex h-14 items-center justify-between gap-4">
          <Link
            href={session ? "/dashboard" : "/"}
            className="flex items-center gap-2"
          >
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">GymTracker</span>
          </Link>

          {session ? (
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("nav.dashboard")}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("auth.login.submit")}
            </Link>
          )}
        </Container>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
