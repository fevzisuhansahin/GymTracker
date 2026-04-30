import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];
export type WorkoutExerciseRow =
  Database["public"]["Tables"]["workout_exercises"]["Row"];
export type SetRow = Database["public"]["Tables"]["sets"]["Row"];
export type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
export type SplitDayRow = Database["public"]["Tables"]["split_days"]["Row"];
export type CardioSessionRow =
  Database["public"]["Tables"]["cardio_sessions"]["Row"];

export type SetForUI = SetRow;

export interface WorkoutExerciseDeep extends WorkoutExerciseRow {
  exercise: ExerciseRow;
  sets: SetForUI[];
}

export interface WorkoutDeep extends WorkoutRow {
  split_day: SplitDayRow | null;
  exercises: WorkoutExerciseDeep[];
  cardioSessions: CardioSessionRow[];
}

/** Kullanıcının açık (finished_at IS NULL) en yakın workout'u. */
export async function getActiveWorkout(userId: string): Promise<WorkoutRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getActiveWorkout error:", error.message);
    return null;
  }
  return data;
}

export async function getWorkoutWithExercisesAndSets(
  workoutId: string,
): Promise<WorkoutDeep | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      `
      *,
      split_day:split_days(*),
      exercises:workout_exercises(
        *,
        exercise:exercises(*),
        sets(*)
      ),
      cardio_sessions(*)
    `,
    )
    .eq("id", workoutId)
    .maybeSingle();

  if (error) {
    console.error("getWorkoutWithExercisesAndSets error:", error.message);
    return null;
  }
  if (!data) return null;

  const exercises = (data.exercises ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((we) => ({
      ...we,
      sets: (we.sets ?? []).slice().sort((a, b) => a.set_number - b.set_number),
    }));

  const cardioSessions = ((data.cardio_sessions ?? []) as CardioSessionRow[])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  return {
    ...data,
    split_day: data.split_day ?? null,
    exercises,
    cardioSessions,
  } as WorkoutDeep;
}

export async function getRecentWorkouts(
  userId: string,
  limit = 3,
): Promise<
  Array<
    WorkoutRow & {
      split_day: Pick<SplitDayRow, "id" | "name"> | null;
      exercises: Array<{ sets: Array<Pick<SetRow, "weight" | "reps" | "is_warmup">> }>;
      cardio_sessions: Array<{ id: string }>;
    }
  >
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      `
      *,
      split_day:split_days(id, name),
      exercises:workout_exercises(
        sets(weight, reps, is_warmup)
      ),
      cardio_sessions(id)
    `,
    )
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("date", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentWorkouts error:", error.message);
    return [];
  }
  // Cast needed: PostgREST embeds split_day as array-or-single union
  return (data ?? []).map((row) => ({
    ...row,
    split_day: row.split_day ?? null,
    exercises: row.exercises ?? [],
    cardio_sessions: (row.cardio_sessions ?? []) as Array<{ id: string }>,
  })) as Awaited<ReturnType<typeof getRecentWorkouts>>;
}

export interface WorkoutHistoryItem {
  id: string;
  date: string;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number | null;
  splitDayName: string | null;
  bodyWeightKg: number | null;
  totalVolumeKg: number;
  workingSetCount: number;
  cardioTotalSeconds: number;
  cardioTotalDistanceKm: number;
  hasExercises: boolean;
  hasCardio: boolean;
}

export async function getWorkoutHistory(
  userId: string,
  offset = 0,
  limit = 20,
): Promise<WorkoutHistoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      `
      id, date, started_at, finished_at, duration_seconds, body_weight,
      split_day:split_days(name),
      exercises:workout_exercises(
        sets(weight, reps, is_warmup)
      ),
      cardio_sessions(duration_seconds, distance_km)
    `,
    )
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("date", { ascending: false })
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("getWorkoutHistory error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const exercises = (row.exercises ?? []) as Array<{
      sets: Array<{ weight: number; reps: number; is_warmup: boolean }>;
    }>;
    const cardioRows = (row.cardio_sessions ?? []) as Array<{
      duration_seconds: number;
      distance_km: number | null;
    }>;

    let totalVolumeKg = 0;
    let workingSetCount = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (!s.is_warmup) {
          totalVolumeKg += s.weight * s.reps;
          workingSetCount++;
        }
      }
    }

    let cardioTotalSeconds = 0;
    let cardioTotalDistanceKm = 0;
    for (const c of cardioRows) {
      cardioTotalSeconds += c.duration_seconds;
      cardioTotalDistanceKm += c.distance_km ?? 0;
    }

    const splitDay = row.split_day as { name: string } | null;

    return {
      id: row.id,
      date: row.date,
      startedAt: row.started_at,
      finishedAt: row.finished_at as string,
      durationSeconds: row.duration_seconds,
      splitDayName: splitDay?.name ?? null,
      bodyWeightKg: row.body_weight,
      totalVolumeKg,
      workingSetCount,
      cardioTotalSeconds,
      cardioTotalDistanceKm,
      hasExercises: exercises.some((ex) => ex.sets.length > 0),
      hasCardio: cardioRows.length > 0,
    };
  });
}

/** Kullanıcının en son kaydetiği body_weight (workout sırası, finished olsun olmasın). */
export async function getLastBodyWeight(userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("body_weight")
    .eq("user_id", userId)
    .not("body_weight", "is", null)
    .order("date", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLastBodyWeight error:", error.message);
    return null;
  }
  return data?.body_weight ?? null;
}
