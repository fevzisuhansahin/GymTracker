import { createClient } from "@/lib/supabase/server";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  value: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekStart(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeStreak(datesDESC: string[]): number {
  const seen = new Set<string>();
  const distinct: string[] = [];
  for (const d of datesDESC) {
    if (!seen.has(d)) {
      seen.add(d);
      distinct.push(d);
    }
  }
  if (distinct.length === 0) return 0;

  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));
  if (distinct[0] !== today && distinct[0] !== yesterday) return 0;

  let streak = 0;
  let expected = distinct[0];
  for (const d of distinct) {
    if (d === expected) {
      streak++;
      const prev = new Date(expected + "T12:00:00Z");
      prev.setUTCDate(prev.getUTCDate() - 1);
      expected = toDateStr(prev);
    } else {
      break;
    }
  }
  return streak;
}

async function getPublicProfiles() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("is_public", true)
    .eq("onboarding_completed", true);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Volume leaderboard — this week
// ---------------------------------------------------------------------------

export async function getVolumeLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const profiles = await getPublicProfiles();
  if (!profiles.length) return [];

  const publicIds = profiles.map((p) => p.id);
  const weekStart = getWeekStart();

  const { data: workouts } = await supabase
    .from("workouts")
    .select("user_id, exercises:workout_exercises(sets(weight, reps, is_warmup))")
    .in("user_id", publicIds)
    .not("finished_at", "is", null)
    .gte("date", weekStart);

  const volByUser = new Map<string, number>();
  for (const w of workouts ?? []) {
    let vol = volByUser.get(w.user_id) ?? 0;
    for (const ex of (w.exercises ?? []) as Array<{
      sets: Array<{ weight: number; reps: number; is_warmup: boolean }>;
    }>) {
      for (const s of ex.sets ?? []) {
        if (!s.is_warmup) vol += s.weight * s.reps;
      }
    }
    volByUser.set(w.user_id, vol);
  }

  return profiles
    .filter((p) => (volByUser.get(p.id) ?? 0) > 0)
    .map((p) => ({
      userId: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      value: Math.round(volByUser.get(p.id) ?? 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
}

// ---------------------------------------------------------------------------
// Streak leaderboard
// ---------------------------------------------------------------------------

export async function getStreakLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const profiles = await getPublicProfiles();
  if (!profiles.length) return [];

  const publicIds = profiles.map((p) => p.id);

  const { data: rows } = await supabase
    .from("workouts")
    .select("user_id, date")
    .in("user_id", publicIds)
    .not("finished_at", "is", null)
    .order("date", { ascending: false });

  const datesByUser = new Map<string, string[]>();
  for (const r of rows ?? []) {
    const arr = datesByUser.get(r.user_id) ?? [];
    arr.push(r.date);
    datesByUser.set(r.user_id, arr);
  }

  return profiles
    .map((p) => ({
      userId: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      value: computeStreak(datesByUser.get(p.id) ?? []),
    }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
}

// ---------------------------------------------------------------------------
// Big Three leaderboard — powerlifting total (est. 1RM)
// ---------------------------------------------------------------------------

export async function getBigThreeLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const profiles = await getPublicProfiles();
  if (!profiles.length) return [];

  const publicIds = profiles.map((p) => p.id);

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, name_en")
    .or(
      "name.ilike.%squat%,name_en.ilike.%squat%," +
        "name.ilike.%bench%,name_en.ilike.%bench%," +
        "name.ilike.%deadlift%,name_en.ilike.%deadlift%",
    )
    .eq("is_custom", false);

  if (!exercises?.length) return [];

  const ids = (kw: string) =>
    (exercises ?? [])
      .filter(
        (e) =>
          e.name?.toLowerCase().includes(kw) || e.name_en?.toLowerCase().includes(kw),
      )
      .map((e) => e.id);

  const squatIds = ids("squat");
  const benchIds = ids("bench");
  const deadliftIds = ids("deadlift");
  const allIds = [...squatIds, ...benchIds, ...deadliftIds];
  if (!allIds.length) return [];

  const { data: prs } = await supabase
    .from("personal_records")
    .select("user_id, exercise_id, value")
    .in("user_id", publicIds)
    .in("exercise_id", allIds)
    .eq("record_type", "1rm")
    .order("value", { ascending: false });

  const prsByUser = new Map<string, { exercise_id: string; value: number }[]>();
  for (const pr of prs ?? []) {
    const arr = prsByUser.get(pr.user_id) ?? [];
    arr.push(pr);
    prsByUser.set(pr.user_id, arr);
  }

  const maxFor = (
    userPRs: { exercise_id: string; value: number }[],
    catIds: string[],
  ) => {
    const vals = userPRs.filter((pr) => catIds.includes(pr.exercise_id)).map((pr) => pr.value);
    return vals.length > 0 ? Math.max(...vals) : 0;
  };

  return profiles
    .map((p) => {
      const userPRs = prsByUser.get(p.id) ?? [];
      const total = maxFor(userPRs, squatIds) + maxFor(userPRs, benchIds) + maxFor(userPRs, deadliftIds);
      return {
        userId: p.id,
        username: p.username,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        value: Math.round(total),
      };
    })
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
}
