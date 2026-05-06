import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface PublicStats {
  totalWorkouts: number;
  totalVolumeKg: number;
  currentStreak: number;
}

export interface BigThreePR {
  squat: number | null;
  benchPress: number | null;
  deadlift: number | null;
}

// ---------------------------------------------------------------------------

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("getProfileByUsername:", error.message);
    return null;
  }
  return data;
}

export async function getPublicStats(userId: string): Promise<PublicStats> {
  const supabase = await createClient();

  const { count: totalWorkouts } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("finished_at", "is", null);

  const { data: allWorkouts } = await supabase
    .from("workouts")
    .select("exercises:workout_exercises(sets(weight, reps, is_warmup))")
    .eq("user_id", userId)
    .not("finished_at", "is", null);

  let totalVolumeKg = 0;
  for (const w of allWorkouts ?? []) {
    for (const ex of (w.exercises ?? []) as Array<{
      sets: Array<{ weight: number; reps: number; is_warmup: boolean }>;
    }>) {
      for (const s of ex.sets ?? []) {
        if (!s.is_warmup) totalVolumeKg += s.weight * s.reps;
      }
    }
  }

  const { data: dates } = await supabase
    .from("workouts")
    .select("date")
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("date", { ascending: false });

  const currentStreak = computeStreakFromDates((dates ?? []).map((r) => r.date));

  return {
    totalWorkouts: totalWorkouts ?? 0,
    totalVolumeKg: Math.round(totalVolumeKg),
    currentStreak,
  };
}

export async function getBigThreePRs(userId: string): Promise<BigThreePR> {
  const supabase = await createClient();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, name_en")
    .or(
      "name.ilike.%squat%,name_en.ilike.%squat%," +
        "name.ilike.%bench%,name_en.ilike.%bench%," +
        "name.ilike.%deadlift%,name_en.ilike.%deadlift%",
    )
    .eq("is_custom", false);

  if (!exercises?.length) return { squat: null, benchPress: null, deadlift: null };

  const matches = (keyword: string) =>
    exercises
      .filter(
        (e) =>
          e.name?.toLowerCase().includes(keyword) ||
          e.name_en?.toLowerCase().includes(keyword),
      )
      .map((e) => e.id);

  const squatIds = matches("squat");
  const benchIds = matches("bench");
  const deadliftIds = matches("deadlift");
  const allIds = [...squatIds, ...benchIds, ...deadliftIds];

  if (!allIds.length) return { squat: null, benchPress: null, deadlift: null };

  const { data: prs } = await supabase
    .from("personal_records")
    .select("exercise_id, value")
    .eq("user_id", userId)
    .eq("record_type", "1rm")
    .in("exercise_id", allIds)
    .order("value", { ascending: false });

  const maxForIds = (ids: string[]) => {
    const vals = (prs ?? []).filter((pr) => ids.includes(pr.exercise_id)).map((pr) => pr.value);
    return vals.length > 0 ? Math.max(...vals) : null;
  };

  return {
    squat: maxForIds(squatIds),
    benchPress: maxForIds(benchIds),
    deadlift: maxForIds(deadliftIds),
  };
}

// ---------------------------------------------------------------------------
// Streak helper (mirrors workouts.ts logic)
// ---------------------------------------------------------------------------

function computeStreakFromDates(datesDESC: string[]): number {
  const seen = new Set<string>();
  const distinct: string[] = [];
  for (const d of datesDESC) {
    if (!seen.has(d)) {
      seen.add(d);
      distinct.push(d);
    }
  }
  if (distinct.length === 0) return 0;

  const toStr = (d: Date) => d.toISOString().slice(0, 10);
  const today = toStr(new Date());
  const yesterday = toStr(new Date(Date.now() - 86_400_000));
  if (distinct[0] !== today && distinct[0] !== yesterday) return 0;

  let streak = 0;
  let expected = distinct[0];
  for (const d of distinct) {
    if (d === expected) {
      streak++;
      const prev = new Date(expected + "T12:00:00Z");
      prev.setUTCDate(prev.getUTCDate() - 1);
      expected = toStr(prev);
    } else {
      break;
    }
  }
  return streak;
}
