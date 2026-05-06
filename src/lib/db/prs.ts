import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PRRecord {
  id: string;
  recordType: string;
  value: number;
  achievedAt: string;
  workoutId: string | null;
}

export async function getPRsForExercise(
  userId: string,
  exerciseId: string,
): Promise<PRRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personal_records")
    .select("id, record_type, value, achieved_at, workout_id")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .eq("record_type", "1rm")
    .order("achieved_at", { ascending: true });

  if (error) {
    console.error("getPRsForExercise error:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    recordType: r.record_type,
    value: r.value,
    achievedAt: r.achieved_at,
    workoutId: r.workout_id,
  }));
}

// ---------------------------------------------------------------------------
// All PRs — en yüksek 1RM per exercise
// ---------------------------------------------------------------------------
export interface AllPRRecord {
  exerciseId: string;
  exerciseName: string;
  value: number; // always kg
  achievedAt: string;
  workoutId: string | null;
}

/**
 * Kullanıcının her hareket için en yüksek tahmini 1RM PR'ını döndürür.
 * Supabase SDK DISTINCT ON desteklemediği için JS tarafında deduplicate yapılır:
 * value DESC sıralı sonuçtan her exercise_id'nin ilk kaydı = max değer.
 */
export async function getAllPRs(userId: string): Promise<AllPRRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personal_records")
    .select("exercise_id, value, achieved_at, workout_id, exercises!inner(name)")
    .eq("user_id", userId)
    .eq("record_type", "1rm")
    .order("value", { ascending: false });

  if (error) {
    console.error("getAllPRs:", error.message);
    return [];
  }

  const seen = new Set<string>();
  return (data ?? [])
    .filter((r) => {
      if (seen.has(r.exercise_id)) return false;
      seen.add(r.exercise_id);
      return true;
    })
    .map((r) => ({
      exerciseId: r.exercise_id,
      exerciseName: (r.exercises as { name: string }).name,
      value: r.value,
      achievedAt: r.achieved_at,
      workoutId: r.workout_id,
    }));
}
