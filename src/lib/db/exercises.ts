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

export interface LastWorkoutSet {
  weight: number;
  reps: number;
  isWarmup: boolean;
}

/**
 * Kullanıcının bu hareketi en son tamamladığı antrenmanın set verilerini döner.
 * Yeni antrenman eklerken default değer olarak kullanılır.
 * RPE ve notes kopyalanmaz — sadece weight, reps, is_warmup.
 * İlk kez yapılan harekette (geçmiş yok) null döner.
 *
 * İki adımlı sorgu (getExerciseHistory ile aynı pattern):
 *   1) workout_exercises'den exercise_id filtreli satırlar + setler — RLS userId'yi garantiler.
 *   2) workouts'tan en son finished_at IS NOT NULL olanı bul.
 */
export async function getLastWorkoutSetsForExercise(
  userId: string,
  exerciseId: string,
): Promise<LastWorkoutSet[] | null> {
  const supabase = await createClient();

  // Adım 1: Bu harekete ait tüm workout_exercise satırları + setleri
  const { data: weData, error: weErr } = await supabase
    .from("workout_exercises")
    .select("id, workout_id, sets(weight, reps, is_warmup, set_number)")
    .eq("exercise_id", exerciseId);

  if (weErr) {
    console.error("getLastWorkoutSetsForExercise (workout_exercises) error:", weErr.message);
    return null;
  }
  if (!weData || weData.length === 0) return null;

  const workoutIds = [...new Set(weData.map((r) => r.workout_id))];

  // Adım 2: Bu workout'lar içinde en son tamamlanmış olanı bul
  const { data: latestWorkout, error: wErr } = await supabase
    .from("workouts")
    .select("id")
    .in("id", workoutIds)
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("date", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (wErr) {
    console.error("getLastWorkoutSetsForExercise (workouts) error:", wErr.message);
    return null;
  }
  if (!latestWorkout) return null;

  // Adım 3: O workout'taki hareketin setlerini set_number ASC sırala
  const we = weData.find((r) => r.workout_id === latestWorkout.id);
  if (!we) return null;

  type SetRow = {
    weight: number;
    reps: number;
    is_warmup: boolean;
    set_number: number;
  };
  const sets = (we.sets as SetRow[])
    .sort((a, b) => a.set_number - b.set_number)
    .map((s) => ({ weight: s.weight, reps: s.reps, isWarmup: s.is_warmup }));

  return sets.length > 0 ? sets : null;
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

/**
 * Bu hareketin geçmişini döner. İki adımlı sorgu:
 *   1) workout_exercises.exercise_id üzerinde direkt filtre (embedded join belirsizliği yok).
 *      RLS, kullanıcıya ait olmayan satırları otomatik hariç tutar.
 *   2) Elde edilen workout_id'ler için workouts tablosundan metadata + filtreler.
 * Tarih filtresi sunucuda yok — chart bileşeni zaten client-side zaman penceresi uygular.
 */
export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
): Promise<ExerciseHistoryEntry[]> {
  const supabase = await createClient();

  // Adım 1: Bu hareketin tüm workout_exercise satırları + set'leri.
  // exercise_id direkt kolon filtreyle sorgulanıyor — RLS user kısıtını zaten uygular.
  const { data: weData, error: weErr } = await supabase
    .from("workout_exercises")
    .select(
      `
      id,
      workout_id,
      sets(weight, reps, rpe, is_warmup, set_number)
    `,
    )
    .eq("exercise_id", exerciseId);

  if (weErr) {
    console.error("getExerciseHistory (workout_exercises) error:", weErr.message);
    return [];
  }
  if (!weData || weData.length === 0) return [];

  const workoutIds = [...new Set(weData.map((r) => r.workout_id))];

  // Adım 2: Workout metadata'yı çek — user_id / finished_at filtreleri
  // doğrudan workouts tablosunda güvenilir şekilde uygulanır.
  const { data: workoutData, error: wErr } = await supabase
    .from("workouts")
    .select("id, date")
    .in("id", workoutIds)
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("date", { ascending: false });

  if (wErr) {
    console.error("getExerciseHistory (workouts) error:", wErr.message);
    return [];
  }
  if (!workoutData || workoutData.length === 0) return [];

  // Geçerli workout'lara ait workout_exercise'ları grupla.
  const validWorkoutIds = new Set(workoutData.map((w) => w.id));

  type WeRow = (typeof weData)[number];
  const weByWorkoutId = new Map<string, WeRow[]>();
  for (const we of weData) {
    if (!validWorkoutIds.has(we.workout_id)) continue;
    const arr = weByWorkoutId.get(we.workout_id) ?? [];
    arr.push(we);
    weByWorkoutId.set(we.workout_id, arr);
  }

  return workoutData.map((workout) => {
    const exercises = weByWorkoutId.get(workout.id) ?? [];
    const sets = exercises
      .flatMap((we) =>
        (we.sets as Array<{
          weight: number;
          reps: number;
          rpe: number | null;
          is_warmup: boolean;
          set_number: number;
        }>),
      )
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        isWarmup: s.is_warmup,
      }));

    return { date: workout.date, workoutId: workout.id, sets };
  });
}
