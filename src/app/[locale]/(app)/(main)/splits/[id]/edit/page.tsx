import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { redirect } from "@/i18n/navigation";
import { getSplitWithDays } from "@/lib/db/splits";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";
import type { MuscleGroup } from "@/lib/schemas/split";

import { SplitFormClient } from "../../_components/SplitFormClient";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditSplitPage({ params }: PageProps) {
  const { locale, id } = await params;

  const session = await getCurrentUserWithProfile();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const split = await getSplitWithDays(id);
  if (!split) notFound();
  // Sistem şablonları (user_id=null) kullanıcıya ait değildir; doğrudan
  // edit'lenemez. Kullanıcı önce kopyalamalı.
  if (split.user_id !== session.userId) notFound();

  return (
    <Container className="py-6 pb-32">
      <EditSplitHeader />
      <div className="mt-6">
        <SplitFormClient
          mode="edit"
          initial={{
            splitId: split.id,
            name: split.name,
            description: split.description ?? "",
            days: split.days.map((d) => ({
              id: d.id,
              name: d.name,
              targetMuscleGroups: (d.target_muscle_groups ?? []) as MuscleGroup[],
            })),
          }}
        />
      </div>
    </Container>
  );
}

function EditSplitHeader() {
  const t = useTranslations("splits");
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight">{t("form.editTitle")}</h1>
    </header>
  );
}
