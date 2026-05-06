import { redirect } from "@/i18n/navigation";
import { Container } from "@/components/layout/Container";
import { getAllAvailableExercises } from "@/lib/db/exercises";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

import { ExercisesListClient } from "./_components/ExercisesListClient";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ExercisesPage({ params }: PageProps) {
  const { locale } = await params;

  const session = await getCurrentUserWithProfile();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const exercises = await getAllAvailableExercises();

  return (
    <Container className="py-6 pb-24">
      <ExercisesListClient exercises={exercises} />
    </Container>
  );
}
