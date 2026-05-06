import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { redirect } from "@/i18n/navigation";
import { getWorkoutWithExercisesAndSets } from "@/lib/db/workouts";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";
import { createClient } from "@/lib/supabase/server";
import {
  calculateWorkoutVolume,
  countWorkingSets,
} from "@/lib/calculations/volume";

import { WorkoutEditor } from "./_components/WorkoutEditor";
import { WorkoutDetail, type WorkoutDetailData } from "./_components/WorkoutDetail";

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
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    value: r.value,
    exerciseName: (r.exercise as { name: string } | null)?.name ?? "",
  }));
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

  const unitPreference = session.profile?.unit_preference === "lb" ? "lb" : "kg";

  // Active workout — editor view
  if (!workout.finished_at) {
    return (
      <WorkoutEditor
        unitPreference={unitPreference}
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
          cardioSessions: workout.cardioSessions.map((cs) => ({
            id: cs.id,
            machineType: cs.machine_type,
            durationSeconds: cs.duration_seconds,
            distanceKm: cs.distance_km,
            avgSpeed: cs.avg_speed,
            inclinePercent: cs.incline_percent,
            resistanceLevel: cs.resistance_level,
            calories: cs.calories,
            avgHeartRate: cs.avg_heart_rate,
            notes: cs.notes,
            orderIndex: cs.order_index,
          })),
        }}
      />
    );
  }

  // Finished workout — read-only detail view
  const prs = await getPRsForWorkout(id);

  const totalVolumeKg = calculateWorkoutVolume(
    workout.exercises.map((we) => ({
      sets: we.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        is_warmup: s.is_warmup,
      })),
    })),
  );
  const workingSetCount = countWorkingSets(
    workout.exercises.map((we) => ({
      sets: we.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        is_warmup: s.is_warmup,
      })),
    })),
  );

  const detailData: WorkoutDetailData = {
    id: workout.id,
    date: workout.date,
    splitDayName: workout.split_day?.name ?? null,
    durationSeconds: workout.duration_seconds,
    bodyWeightKg: workout.body_weight,
    notes: workout.notes,
    exercises: workout.exercises.map((we) => ({
      id: we.id,
      exerciseId: we.exercise.id,
      exerciseName: we.exercise.name,
      equipment: we.exercise.equipment,
      notes: we.notes,
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
    cardioSessions: workout.cardioSessions.map((cs) => ({
      id: cs.id,
      machineType: cs.machine_type,
      durationSeconds: cs.duration_seconds,
      distanceKm: cs.distance_km,
      avgSpeed: cs.avg_speed,
      inclinePercent: cs.incline_percent,
      resistanceLevel: cs.resistance_level,
      calories: cs.calories,
      notes: cs.notes,
    })),
    prs,
    totalVolumeKg,
    workingSetCount,
  };

  return (
    <Container className="py-6 pb-24">
      <WorkoutDetail data={detailData} unitPreference={unitPreference} />
    </Container>
  );
}
