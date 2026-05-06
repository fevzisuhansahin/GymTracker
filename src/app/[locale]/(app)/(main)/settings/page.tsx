import { getTranslations } from "next-intl/server";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { SettingsClient } from "./_components/SettingsClient";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("settings");
  const session = await getCurrentUserWithProfile();

  if (!session?.profile) redirect(`/${locale}/login`);

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
        <SettingsClient profile={session.profile} />
      </div>
    </Container>
  );
}
