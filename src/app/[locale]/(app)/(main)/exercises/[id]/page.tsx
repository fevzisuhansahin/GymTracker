import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { redirect } from "@/i18n/navigation";
import { getExerciseById, getExerciseHistory } from "@/lib/db/exercises";
import { getPRsForExercise } from "@/lib/db/prs";
import { calculateProgressMetrics } from "@/lib/calculations/one-rep-max";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

import { ExerciseDetailClient } from "./_components/ExerciseDetailClient";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ExerciseDetailPage({ params }: PageProps) {
  const { locale, id } = await params;

  const session = await getCurrentUserWithProfile();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const exercise = await getExerciseById(id);
  if (!exercise) notFound();

  const unitPreference = session.profile?.unit_preference === "lb" ? "lb" : "kg";

  const [history, prs] = await Promise.all([
    getExerciseHistory(session.userId, id),
    getPRsForExercise(session.userId, id),
  ]);

  console.log(
    `[exercise-detail] id=${id} history=${history.length} prs=${prs.length}`,
  );

  const progressData = calculateProgressMetrics(history);

  return (
    <Container className="py-6 pb-24">
      <ExerciseDetailClient
        exercise={exercise}
        history={history}
        prs={prs}
        progressData={progressData}
        unitPreference={unitPreference}
        locale={locale}
      />
    </Container>
  );
}
