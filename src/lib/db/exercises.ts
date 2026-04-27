import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { MuscleGroup } from "@/lib/schemas/split";

export type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

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
