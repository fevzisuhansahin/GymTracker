import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];
export type WorkoutExerciseRow =
  Database["public"]["Tables"]["workout_exercises"]["Row"];
export type SetRow = Database["public"]["Tables"]["sets"]["Row"];
export type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
export type SplitDayRow = Database["public"]["Tables"]["split_days"]["Row"];

export type SetForUI = SetRow;

export interface WorkoutExerciseDeep extends WorkoutExerciseRow {
  exercise: ExerciseRow;
  sets: SetForUI[];
}

export interface WorkoutDeep extends WorkoutRow {
  split_day: SplitDayRow | null;
  exercises: WorkoutExerciseDeep[];
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
      )
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

  return {
    ...data,
    split_day: data.split_day ?? null,
    exercises,
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
      )
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
  })) as Awaited<ReturnType<typeof getRecentWorkouts>>;
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
