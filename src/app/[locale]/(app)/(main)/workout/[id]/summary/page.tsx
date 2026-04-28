import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutWithExercisesAndSets } from "@/lib/db/workouts";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";
import {
  calculateWorkoutVolume,
  countWorkingSets,
} from "@/lib/calculations/volume";

import { SummaryClient } from "./_components/SummaryClient";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

interface PRRow {
  id: string;
  value: number;
  exerciseName: string;
}

async function getPRsForWorkout(workoutId: string): Promise<PRRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personal_records")
    .select("id, value, exercise:exercises(name)")
    .eq("workout_id", workoutId);
  if (error) {
    console.error("getPRsForWorkout:", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    value: r.value,
    exerciseName: (r.exercise as { name: string } | null)?.name ?? "",
  }));
}

export default async function SummaryPage({ params }: PageProps) {
  const { locale, id } = await params;

  const session = await getCurrentUserWithProfile();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const workout = await getWorkoutWithExercisesAndSets(id);
  if (!workout) notFound();
  if (workout.user_id !== session.userId) notFound();

  const prs = await getPRsForWorkout(id);

  const volume = calculateWorkoutVolume(
    workout.exercises.map((we) => ({
      sets: we.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        is_warmup: s.is_warmup,
      })),
    })),
  );
  const workingSets = countWorkingSets(
    workout.exercises.map((we) => ({
      sets: we.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        is_warmup: s.is_warmup,
      })),
    })),
  );

  return (
    <Container className="py-6 pb-24">
      <SummaryClient
        workoutId={workout.id}
        unitPreference={session.profile?.unit_preference === "lb" ? "lb" : "kg"}
        volumeKg={volume}
        workingSets={workingSets}
        durationSeconds={workout.duration_seconds ?? 0}
        prs={prs}
        initialNotes={workout.notes ?? ""}
      />
    </Container>
  );
}
