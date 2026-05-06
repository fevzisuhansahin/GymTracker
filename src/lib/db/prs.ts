import { createClient } from "@/lib/supabase/server";

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
