import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/Container";
import { redirect } from "@/i18n/navigation";
import { getActiveSplit } from "@/lib/db/splits";
import { getActiveWorkout, getLastBodyWeight } from "@/lib/db/workouts";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

import { StartWorkoutClient } from "./_components/StartWorkoutClient";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewWorkoutPage({ params }: PageProps) {
  const { locale } = await params;

  const session = await getCurrentUserWithProfile();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [active, split, lastBw] = await Promise.all([
    getActiveWorkout(session.userId),
    getActiveSplit(session.userId),
    getLastBodyWeight(session.userId),
  ]);

  return (
    <Container className="py-6 pb-32">
      <NewWorkoutHeader />
      <div className="mt-6">
        <StartWorkoutClient
          unitPreference={session.profile?.unit_preference === "lb" ? "lb" : "kg"}
          activeWorkoutId={active?.id ?? null}
          activeSplit={
            split
              ? {
                  id: split.id,
                  name: split.name,
                  days: split.days.map((d) => ({ id: d.id, name: d.name })),
                }
              : null
          }
          lastBodyWeightKg={lastBw}
        />
      </div>
    </Container>
  );
}

function NewWorkoutHeader() {
  const t = useTranslations("workouts.start");
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
    </header>
  );
}
