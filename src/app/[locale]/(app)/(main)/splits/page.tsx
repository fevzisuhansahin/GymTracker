import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/Container";
import { buttonVariants } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";
import { getTemplateSplits, getUserSplits } from "@/lib/db/splits";

import { SplitsListClient } from "./_components/SplitsListClient";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SplitsPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await getCurrentUserWithProfile();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [userSplits, templates] = await Promise.all([
    getUserSplits(session.userId),
    getTemplateSplits(),
  ]);

  return (
    <Container className="py-6 pb-24">
      <SplitsHeader />
      <div className="mt-6">
        <SplitsListClient
          userSplits={userSplits.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            isActive: s.is_active,
            dayCount: s.days.length,
          }))}
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            dayCount: t.days.length,
          }))}
        />
      </div>
    </Container>
  );
}

function SplitsHeader() {
  const t = useTranslations("splits");
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Link href="/splits/new" className={buttonVariants({ size: "sm" })}>
        <Plus className="h-4 w-4" />
        {t("newSplit")}
      </Link>
    </header>
  );
}
