import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { MuscleGroup } from "@/lib/schemas/split";

export type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

export interface ExerciseHistoryEntry {
  date: string;
  workoutId: string;
  sets: Array<{
    weight: number;
    reps: number;
    rpe: number | null;
    isWarmup: boolean;
  }>;
}

/**
 * Sistem hareketleri (is_custom=false) + kullanıcının kendi custom'ları (created_by=auth.uid()).
 * RLS zaten filtreliyor, burada query basit.
 */
export async function getAllAvailableExercises(): Promise<ExerciseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("name");

  if (error) {
    console.error("getAllAvailableExercises error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function searchExercises(
  query: string,
  primaryMuscle?: MuscleGroup,
): Promise<ExerciseRow[]> {
  const supabase = await createClient();
  let q = supabase.from("exercises").select("*").order("name").limit(50);

  if (query.trim().length > 0) {
    const term = `%${query.trim()}%`;
    q = q.or(`name.ilike.${term},name_en.ilike.${term}`);
  }
  if (primaryMuscle) {
    q = q.eq("primary_muscle", primaryMuscle);
  }

  const { data, error } = await q;
  if (error) {
    console.error("searchExercises error:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Kullanıcının son 3 ayda yaptığı tüm hareketler, sıklığa göre sıralı.
 * Workout'un split_day_id'si yoksa (ya da kullanıcı edit'te split silmişse)
 * "Önerilenler" tab'ı için fallback olarak kullanılır.
 */
export async function getRecentExercisesForUser(
  userId: string,
  limit = 20,
): Promise<ExerciseRow[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 3);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data: rows, error } = await supabase
    .from("workout_exercises")
    .select("exercise_id, workouts!inner(user_id, date)")
    .eq("workouts.user_id", userId)
    .gte("workouts.date", sinceDate);

  if (error) {
    console.error("getRecentExercisesForUser error:", error.message);
    return [];
  }

  const freq = new Map<string, number>();
  for (const row of rows ?? []) {
    const id = row.exercise_id;
    freq.set(id, (freq.get(id) ?? 0) + 1);
  }
  const ranked = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (ranked.length === 0) return [];

  const { data: exercises, error: exErr } = await supabase
    .from("exercises")
    .select("*")
    .in("id", ranked);
  if (exErr) {
    console.error("getRecentExercisesForUser (exercises) error:", exErr.message);
    return [];
  }
  const byId = new Map((exercises ?? []).map((e) => [e.id, e] as const));
  return ranked.map((id) => byId.get(id)).filter((e): e is ExerciseRow => Boolean(e));
}

/**
 * Bu split day için kullanıcının son 3 ayda eklediği hareketler, sıklığa göre sıralı.
 * UI'da "Önerilenler" tab'ında ilk gösterilir.
 */
export async function getRecentExercisesForSplitDay(
  userId: string,
  splitDayId: string,
  limit = 20,
): Promise<ExerciseRow[]> {
  const supabase = await createClient();
  // Önce relevant exercise_id'leri frequency ile çek
  const since = new Date();
  since.setMonth(since.getMonth() - 3);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data: rows, error } = await supabase
    .from("workout_exercises")
    .select("exercise_id, workouts!inner(user_id, split_day_id, date)")
    .eq("workouts.user_id", userId)
    .eq("workouts.split_day_id", splitDayId)
    .gte("workouts.date", sinceDate);

  if (error) {
    console.error("getRecentExercisesForSplitDay error:", error.message);
    return [];
  }

  const freq = new Map<string, number>();
  for (const row of rows ?? []) {
    const id = row.exercise_id;
    freq.set(id, (freq.get(id) ?? 0) + 1);
  }
  const ranked = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (ranked.length === 0) return [];

  const { data: exercises, error: exErr } = await supabase
    .from("exercises")
    .select("*")
    .in("id", ranked);
  if (exErr) {
    console.error("getRecentExercisesForSplitDay (exercises) error:", exErr.message);
    return [];
  }
  // ranked sırasına göre map'le
  const byId = new Map((exercises ?? []).map((e) => [e.id, e] as const));
  return ranked.map((id) => byId.get(id)).filter((e): e is ExerciseRow => Boolean(e));
}

export async function getExerciseById(exerciseId: string): Promise<ExerciseRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", exerciseId)
    .maybeSingle();

  if (error) {
    console.error("getExerciseById error:", error.message);
    return null;
  }
  return data;
}

export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  months = 6,
): Promise<ExerciseHistoryEntry[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("workouts")
    .select(
      `
      id,
      date,
      workout_exercises!inner(
        exercise_id,
        sets(weight, reps, rpe, is_warmup, set_number)
      )
    `,
    )
    .eq("user_id", userId)
    .eq("workout_exercises.exercise_id", exerciseId)
    .not("finished_at", "is", null)
    .gte("date", sinceDate)
    .order("date", { ascending: false });

  if (error) {
    console.error("getExerciseHistory error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const weRows = (
      row.workout_exercises as Array<{
        exercise_id: string;
        sets: Array<{ weight: number; reps: number; rpe: number | null; is_warmup: boolean; set_number: number }>;
      }>
    ).filter((we) => we.exercise_id === exerciseId);

    const sets = weRows
      .flatMap((we) => we.sets)
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        isWarmup: s.is_warmup,
      }));

    return { date: row.date, workoutId: row.id, sets };
  });
}
