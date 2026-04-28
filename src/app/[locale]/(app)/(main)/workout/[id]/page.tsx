import { notFound } from "next/navigation";

import { redirect } from "@/i18n/navigation";
import { getWorkoutWithExercisesAndSets } from "@/lib/db/workouts";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

import { WorkoutEditor } from "./_components/WorkoutEditor";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function WorkoutPage({ params }: PageProps) {
  const { locale, id } = await params;

  const session = await getCurrentUserWithProfile();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const workout = await getWorkoutWithExercisesAndSets(id);
  if (!workout) notFound();
  if (workout.user_id !== session.userId) notFound();

  // Bitmiş workout doğrudan summary'ye gitsin (kullanıcı edit URL'ini açtıysa)
  if (workout.finished_at) {
    redirect({ href: `/workout/${id}/summary`, locale });
    return null;
  }

  return (
    <WorkoutEditor
      unitPreference={session.profile?.unit_preference === "lb" ? "lb" : "kg"}
      workout={{
        id: workout.id,
        startedAt: workout.started_at,
        bodyWeightKg: workout.body_weight,
        splitDayName: workout.split_day?.name ?? null,
        splitDayId: workout.split_day_id,
        exercises: workout.exercises.map((we) => ({
          id: we.id,
          orderIndex: we.order_index,
          notes: we.notes,
          exercise: {
            id: we.exercise.id,
            name: we.exercise.name,
            equipment: we.exercise.equipment,
          },
          sets: we.sets.map((s) => ({
            id: s.id,
            setNumber: s.set_number,
            weight: s.weight,
            reps: s.reps,
            rpe: s.rpe,
            isWarmup: s.is_warmup,
            notes: s.notes,
          })),
        })),
      }}
    />
  );
}
