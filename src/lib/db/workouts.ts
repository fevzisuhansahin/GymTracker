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

// ---------------------------------------------------------------------------
// Dashboard stats helpers
// ---------------------------------------------------------------------------

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Bu haftanın Pazartesi'si (UTC). */
function getWeekStart(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return toDateStr(d);
}

/** Bu ayın 1'i (UTC). */
function getMonthStart(): string {
  const d = new Date();
  d.setUTCDate(1);
  return toDateStr(d);
}

/** Bu haftaki tüm bitmiş workout'ların warmup-hariç toplam volume'u (kg). */
export async function getWeeklyVolume(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      `exercises:workout_exercises(
        sets(weight, reps, is_warmup)
      )`,
    )
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .gte("date", getWeekStart());

  if (error) {
    console.error("getWeeklyVolume:", error.message);
    return 0;
  }

  let total = 0;
  for (const w of data ?? []) {
    for (const ex of (w.exercises ?? []) as Array<{
      sets: Array<{ weight: number; reps: number; is_warmup: boolean }>;
    }>) {
      for (const s of ex.sets ?? []) {
        if (!s.is_warmup) total += s.weight * s.reps;
      }
    }
  }
  return Math.round(total * 100) / 100;
}

/** Bu ay tamamlanan workout sayısı. */
export async function getMonthlyWorkoutCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .gte("date", getMonthStart());

  if (error) {
    console.error("getMonthlyWorkoutCount:", error.message);
    return 0;
  }
  return count ?? 0;
}

/** Mevcut antrenman serisi (art arda gün sayısı). UTC tarihler kullanılır. */
export async function getCurrentStreak(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("date")
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("date", { ascending: false });

  if (error) {
    console.error("getCurrentStreak:", error.message);
    return 0;
  }

  // Aynı güne ait birden fazla workout → distinct date listesi (DESC sıra korunur)
  const seen = new Set<string>();
  const distinctDates: string[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.date)) {
      seen.add(row.date);
      distinctDates.push(row.date);
    }
  }

  if (distinctDates.length === 0) return 0;

  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));

  // En son workout bugün veya dün değilse streak yok
  if (distinctDates[0] !== today && distinctDates[0] !== yesterday) return 0;

  let streak = 0;
  let expected = distinctDates[0];

  for (const dateStr of distinctDates) {
    if (dateStr === expected) {
      streak++;
      // Beklenen sonraki tarihi bir gün geri al
      const prev = new Date(expected + "T12:00:00Z");
      prev.setUTCDate(prev.getUTCDate() - 1);
      expected = toDateStr(prev);
    } else {
      break;
    }
  }

  return streak;
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
