"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  createWorkoutSchema,
  setUpsertSchema,
  finishWorkoutSchema,
  updateBodyWeightSchema,
  exerciseNotesSchema,
  cardioSessionSchema,
  type SetUpsertInput,
  type FinishWorkoutInput,
  type CardioSessionInput,
} from "@/lib/schemas/workout";
import type { WorkoutHistoryItem } from "@/lib/db/workouts";
import { getWorkoutHistory } from "@/lib/db/workouts";
import { customExerciseSchema, type CustomExerciseInput } from "@/lib/schemas/exercise";
import { rpcFinishWorkout } from "@/lib/db/rpc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function flattenZodErrors(
  err: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> },
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

async function requireUserId(): Promise<{ userId: string } | { errorKey: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errorKey: "auth.errors.notAuthenticated" };
  return { userId: user.id };
}

async function assertWorkoutOwner(
  workoutId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; errorKey: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("user_id")
    .eq("id", workoutId)
    .maybeSingle();
  if (error || !data) return { ok: false, errorKey: "workouts.errors.notFound" };
  if (data.user_id !== userId) return { ok: false, errorKey: "workouts.errors.forbidden" };
  return { ok: true };
}

async function assertWorkoutExerciseOwner(
  workoutExerciseId: string,
  userId: string,
): Promise<{ ok: true; workoutId: string } | { ok: false; errorKey: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_exercises")
    .select("workout_id, workouts!inner(user_id)")
    .eq("id", workoutExerciseId)
    .maybeSingle();
  if (error || !data) return { ok: false, errorKey: "workouts.errors.notFound" };
  // PostgREST inner join: workouts is single object here
  // Cast safe since we've asserted not-null
  const owner = (data.workouts as { user_id: string }).user_id;
  if (owner !== userId) return { ok: false, errorKey: "workouts.errors.forbidden" };
  return { ok: true, workoutId: data.workout_id };
}

async function assertSetOwner(
  setId: string,
  userId: string,
): Promise<{ ok: true; workoutId: string; workoutExerciseId: string } | { ok: false; errorKey: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sets")
    .select(
      "workout_exercise_id, workout_exercises!inner(workout_id, workouts!inner(user_id))",
    )
    .eq("id", setId)
    .maybeSingle();
  if (error || !data) return { ok: false, errorKey: "workouts.errors.notFound" };
  const we = data.workout_exercises as {
    workout_id: string;
    workouts: { user_id: string };
  };
  if (we.workouts.user_id !== userId) {
    return { ok: false, errorKey: "workouts.errors.forbidden" };
  }
  return { ok: true, workoutId: we.workout_id, workoutExerciseId: data.workout_exercise_id };
}

// ---------------------------------------------------------------------------
// createWorkoutAction — başlangıç. Aktif workout zaten varsa hata döner;
// client önce cancel veya continue seçimi yapmalı.
// ---------------------------------------------------------------------------
export interface CreateWorkoutResult {
  ok: boolean;
  errorKey?: string;
  fieldErrors?: Record<string, string>;
  workoutId?: string;
}

export async function createWorkoutAction(input: {
  splitDayId: string | null;
  bodyWeightKg: number | null;
}): Promise<CreateWorkoutResult> {
  const parsed = createWorkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const supabase = await createClient();

  // Aktif workout var mı?
  const { data: active, error: activeErr } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", auth.userId)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeErr) {
    console.error("createWorkoutAction (active check):", activeErr);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  if (active) {
    return { ok: false, errorKey: "workouts.errors.activeExists" };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("workouts")
    .insert({
      user_id: auth.userId,
      split_day_id: parsed.data.splitDayId,
      body_weight: parsed.data.bodyWeightKg,
    })
    .select("id")
    .maybeSingle();

  if (insErr || !inserted) {
    console.error("createWorkoutAction (insert):", insErr);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }

  revalidatePath("/dashboard");
  return { ok: true, workoutId: inserted.id };
}

// ---------------------------------------------------------------------------
// cancelWorkoutAction — workout DELETE (CASCADE: workout_exercises + sets).
// /workout/new interstitial confirmation sonrası çağrılır.
// ---------------------------------------------------------------------------
export async function cancelWorkoutAction(
  workoutId: string,
): Promise<{ ok: boolean; errorKey?: string }> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutOwner(workoutId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", auth.userId);
  if (error) {
    console.error("cancelWorkoutAction:", error);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  revalidatePath("/workout/new");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// updateBodyWeightAction
// ---------------------------------------------------------------------------
export async function updateBodyWeightAction(input: {
  workoutId: string;
  bodyWeightKg: number | null;
}): Promise<{ ok: boolean; errorKey?: string; fieldErrors?: Record<string, string> }> {
  const parsed = updateBodyWeightSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutOwner(parsed.data.workoutId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({ body_weight: parsed.data.bodyWeightKg })
    .eq("id", parsed.data.workoutId)
    .eq("user_id", auth.userId);
  if (error) {
    console.error("updateBodyWeightAction:", error);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// addExercisesToWorkoutAction (multi-add from selector)
// ---------------------------------------------------------------------------
export async function addExercisesToWorkoutAction(input: {
  workoutId: string;
  exerciseIds: string[];
}): Promise<{ ok: boolean; errorKey?: string; addedIds?: string[] }> {
  if (!input.exerciseIds || input.exerciseIds.length === 0) {
    return { ok: true, addedIds: [] };
  }
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutOwner(input.workoutId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();

  const { data: existing, error: existErr } = await supabase
    .from("workout_exercises")
    .select("order_index")
    .eq("workout_id", input.workoutId);
  if (existErr) {
    console.error("addExercisesToWorkoutAction (existing):", existErr);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  const maxOrder = (existing ?? []).reduce(
    (m, r) => (r.order_index > m ? r.order_index : m),
    0,
  );

  const rows = input.exerciseIds.map((exerciseId, idx) => ({
    workout_id: input.workoutId,
    exercise_id: exerciseId,
    order_index: maxOrder + idx + 1,
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("workout_exercises")
    .insert(rows)
    .select("id");
  if (insErr) {
    console.error("addExercisesToWorkoutAction (insert):", insErr);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }

  revalidatePath(`/workout/${input.workoutId}`);
  return { ok: true, addedIds: (inserted ?? []).map((r) => r.id) };
}

// ---------------------------------------------------------------------------
// createCustomExerciseAndAddToWorkoutAction (Y4) — combined for fewer
// roundtrips. Idempotent on UNIQUE clash.
// ---------------------------------------------------------------------------
export async function createCustomExerciseAndAddToWorkoutAction(input: {
  workoutId: string;
  exercise: CustomExerciseInput;
}): Promise<{
  ok: boolean;
  errorKey?: string;
  fieldErrors?: Record<string, string>;
  workoutExerciseId?: string;
}> {
  const parsed = customExerciseSchema.safeParse(input.exercise);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutOwner(input.workoutId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();

  let exerciseId: string | null = null;
  const { data: inserted, error: insertErr } = await supabase
    .from("exercises")
    .insert({
      name: parsed.data.name,
      primary_muscle: parsed.data.primaryMuscle,
      equipment: parsed.data.equipment,
      is_custom: true,
      created_by: auth.userId,
    })
    .select("id")
    .maybeSingle();

  if (inserted) {
    exerciseId = inserted.id;
  } else if (insertErr?.code === "23505") {
    const { data: existing } = await supabase
      .from("exercises")
      .select("id")
      .eq("name", parsed.data.name)
      .eq("created_by", auth.userId)
      .maybeSingle();
    if (existing) exerciseId = existing.id;
  }

  if (!exerciseId) {
    console.error("createCustomExerciseAndAdd:", insertErr);
    return { ok: false, errorKey: "exercises.errors.generic" };
  }

  const addRes = await addExercisesToWorkoutAction({
    workoutId: input.workoutId,
    exerciseIds: [exerciseId],
  });
  if (!addRes.ok) {
    return { ok: false, errorKey: addRes.errorKey ?? "workouts.errors.generic" };
  }
  return {
    ok: true,
    workoutExerciseId: addRes.addedIds?.[0],
  };
}

// ---------------------------------------------------------------------------
// removeExerciseFromWorkoutAction
// ---------------------------------------------------------------------------
export async function removeExerciseFromWorkoutAction(
  workoutExerciseId: string,
): Promise<{ ok: boolean; errorKey?: string }> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutExerciseOwner(workoutExerciseId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_exercises")
    .delete()
    .eq("id", workoutExerciseId);
  if (error) {
    console.error("removeExerciseFromWorkoutAction:", error);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  revalidatePath(`/workout/${ownership.workoutId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// updateExerciseNotesAction
// ---------------------------------------------------------------------------
export async function updateExerciseNotesAction(input: {
  workoutExerciseId: string;
  notes: string | null;
}): Promise<{ ok: boolean; errorKey?: string; fieldErrors?: Record<string, string> }> {
  const parsed = exerciseNotesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutExerciseOwner(
    parsed.data.workoutExerciseId,
    auth.userId,
  );
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_exercises")
    .update({ notes: parsed.data.notes })
    .eq("id", parsed.data.workoutExerciseId);
  if (error) {
    console.error("updateExerciseNotesAction:", error);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// upsertSetAction — debounced flush hedefi. setId yoksa insert
// (set_number = max + 1, gap'lere izin verilir), varsa update.
// ---------------------------------------------------------------------------
export interface UpsertSetResult {
  ok: boolean;
  errorKey?: string;
  fieldErrors?: Record<string, string>;
  setId?: string;
  setNumber?: number;
}

export async function upsertSetAction(input: SetUpsertInput): Promise<UpsertSetResult> {
  const parsed = setUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const supabase = await createClient();

  if (parsed.data.setId) {
    // UPDATE branch — ownership via assertSetOwner (depth=2 join)
    const ownership = await assertSetOwner(parsed.data.setId, auth.userId);
    if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

    const { data, error } = await supabase
      .from("sets")
      .update({
        weight: parsed.data.weightKg,
        reps: parsed.data.reps,
        rpe: parsed.data.rpe,
        is_warmup: parsed.data.isWarmup,
        notes: parsed.data.notes,
      })
      .eq("id", parsed.data.setId)
      .select("id, set_number")
      .maybeSingle();
    if (error || !data) {
      console.error("upsertSetAction (update):", error);
      return { ok: false, errorKey: "workouts.errors.generic" };
    }
    return { ok: true, setId: data.id, setNumber: data.set_number };
  }

  // INSERT branch — ownership via parent we
  const ownership = await assertWorkoutExerciseOwner(
    parsed.data.workoutExerciseId,
    auth.userId,
  );
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  // set_number = max(existing) + 1; gap'lere izin verilir (delete sonrası
  // renumber yapılmaz, K2 kararı).
  const { data: existing, error: existErr } = await supabase
    .from("sets")
    .select("set_number")
    .eq("workout_exercise_id", parsed.data.workoutExerciseId);
  if (existErr) {
    console.error("upsertSetAction (existing):", existErr);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  const nextNum =
    (existing ?? []).reduce((m, r) => (r.set_number > m ? r.set_number : m), 0) + 1;

  const { data: inserted, error: insErr } = await supabase
    .from("sets")
    .insert({
      workout_exercise_id: parsed.data.workoutExerciseId,
      set_number: nextNum,
      weight: parsed.data.weightKg,
      reps: parsed.data.reps,
      rpe: parsed.data.rpe,
      is_warmup: parsed.data.isWarmup,
      notes: parsed.data.notes,
    })
    .select("id, set_number")
    .maybeSingle();

  if (insErr || !inserted) {
    console.error("upsertSetAction (insert):", insErr);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  return { ok: true, setId: inserted.id, setNumber: inserted.set_number };
}

// ---------------------------------------------------------------------------
// deleteSetAction
// ---------------------------------------------------------------------------
export async function deleteSetAction(
  setId: string,
): Promise<{ ok: boolean; errorKey?: string }> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertSetOwner(setId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();
  const { error } = await supabase.from("sets").delete().eq("id", setId);
  if (error) {
    console.error("deleteSetAction:", error);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// finishWorkoutAction — RPC ile atomik. 0-set workout_exercises silinir.
// Pre-flight (debounced upsert flush) CLIENT tarafında yapılır.
// ---------------------------------------------------------------------------
export async function finishWorkoutAction(
  input: FinishWorkoutInput,
): Promise<{ ok: boolean; errorKey?: string; fieldErrors?: Record<string, string> }> {
  const parsed = finishWorkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutOwner(parsed.data.workoutId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  try {
    await rpcFinishWorkout({
      workoutId: parsed.data.workoutId,
      notes: parsed.data.notes,
      durationSeconds: parsed.data.durationSeconds,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    console.error("finishWorkoutAction:", e);
    if (msg.includes("workout_not_found")) {
      return { ok: false, errorKey: "workouts.errors.notFound" };
    }
    if (msg.includes("forbidden")) {
      return { ok: false, errorKey: "workouts.errors.forbidden" };
    }
    return { ok: false, errorKey: "workouts.errors.generic" };
  }

  revalidatePath("/dashboard");
  redirect(`/workout/${parsed.data.workoutId}/summary`);
}

// ---------------------------------------------------------------------------
// assertCardioOwner — cardio_sessions için ownership kontrolü
// ---------------------------------------------------------------------------
async function assertCardioOwner(
  sessionId: string,
  userId: string,
): Promise<{ ok: true; workoutId: string } | { ok: false; errorKey: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cardio_sessions")
    .select("workout_id, workouts!inner(user_id)")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) return { ok: false, errorKey: "workouts.errors.notFound" };
  const owner = (data.workouts as { user_id: string }).user_id;
  if (owner !== userId) return { ok: false, errorKey: "workouts.errors.forbidden" };
  return { ok: true, workoutId: data.workout_id };
}

// ---------------------------------------------------------------------------
// addCardioSessionAction
// ---------------------------------------------------------------------------
export interface AddCardioResult {
  ok: boolean;
  errorKey?: string;
  fieldErrors?: Record<string, string>;
  sessionId?: string;
}

export async function addCardioSessionAction(
  workoutId: string,
  data: CardioSessionInput,
): Promise<AddCardioResult> {
  const parsed = cardioSessionSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutOwner(workoutId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();

  const { data: existing, error: existErr } = await supabase
    .from("cardio_sessions")
    .select("order_index")
    .eq("workout_id", workoutId);
  if (existErr) {
    console.error("addCardioSessionAction (existing):", existErr);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  const maxOrder = (existing ?? []).reduce(
    (m, r) => (r.order_index > m ? r.order_index : m),
    0,
  );

  const { data: inserted, error: insErr } = await supabase
    .from("cardio_sessions")
    .insert({
      workout_id: workoutId,
      machine_type: parsed.data.machineType,
      duration_seconds: parsed.data.durationSeconds,
      distance_km: parsed.data.distanceKm,
      avg_speed: parsed.data.avgSpeed,
      incline_percent: parsed.data.inclinePercent,
      resistance_level: parsed.data.resistanceLevel,
      calories: parsed.data.calories,
      avg_heart_rate: parsed.data.avgHeartRate,
      notes: parsed.data.notes,
      order_index: maxOrder + 1,
    })
    .select("id")
    .maybeSingle();

  if (insErr || !inserted) {
    console.error("addCardioSessionAction (insert):", insErr);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }

  revalidatePath(`/workout/${workoutId}`);
  return { ok: true, sessionId: inserted.id };
}

// ---------------------------------------------------------------------------
// updateCardioSessionAction
// ---------------------------------------------------------------------------
export async function updateCardioSessionAction(
  sessionId: string,
  data: CardioSessionInput,
): Promise<{ ok: boolean; errorKey?: string; fieldErrors?: Record<string, string> }> {
  const parsed = cardioSessionSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertCardioOwner(sessionId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();
  const { error } = await supabase
    .from("cardio_sessions")
    .update({
      machine_type: parsed.data.machineType,
      duration_seconds: parsed.data.durationSeconds,
      distance_km: parsed.data.distanceKm,
      avg_speed: parsed.data.avgSpeed,
      incline_percent: parsed.data.inclinePercent,
      resistance_level: parsed.data.resistanceLevel,
      calories: parsed.data.calories,
      avg_heart_rate: parsed.data.avgHeartRate,
      notes: parsed.data.notes,
    })
    .eq("id", sessionId);

  if (error) {
    console.error("updateCardioSessionAction:", error);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }

  revalidatePath(`/workout/${ownership.workoutId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteCardioSessionAction
// ---------------------------------------------------------------------------
export async function deleteCardioSessionAction(
  sessionId: string,
): Promise<{ ok: boolean; errorKey?: string }> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertCardioOwner(sessionId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();
  const { error } = await supabase
    .from("cardio_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) {
    console.error("deleteCardioSessionAction:", error);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }

  revalidatePath(`/workout/${ownership.workoutId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// reorderExerciseAction — order_index swap ile hareket sırası değiştir.
// ---------------------------------------------------------------------------
export async function reorderExerciseAction(
  workoutExerciseId: string,
  direction: "up" | "down",
): Promise<{ ok: boolean; errorKey?: string }> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutExerciseOwner(workoutExerciseId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();

  // Tüm workout_exercises'i sıralı çek
  const { data: allRows, error: fetchErr } = await supabase
    .from("workout_exercises")
    .select("id, order_index")
    .eq("workout_id", ownership.workoutId)
    .order("order_index", { ascending: true });

  if (fetchErr || !allRows) {
    console.error("reorderExerciseAction (fetch):", fetchErr);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }

  const idx = allRows.findIndex((r) => r.id === workoutExerciseId);
  if (idx === -1) return { ok: false, errorKey: "workouts.errors.notFound" };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= allRows.length) {
    return { ok: true }; // already at boundary, no-op
  }

  const current = allRows[idx];
  const neighbor = allRows[swapIdx];

  if (!current || !neighbor) return { ok: true }; // boundary guard

  // Swap order_indexes
  const { error: e1 } = await supabase
    .from("workout_exercises")
    .update({ order_index: neighbor.order_index })
    .eq("id", current.id);
  const { error: e2 } = await supabase
    .from("workout_exercises")
    .update({ order_index: current.order_index })
    .eq("id", neighbor.id);

  if (e1 || e2) {
    console.error("reorderExerciseAction (swap):", e1 ?? e2);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }

  revalidatePath(`/workout/${ownership.workoutId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteWorkoutAction — ownership check + DELETE (CASCADE). Geçmiş detaydan çağrılır.
// ---------------------------------------------------------------------------
export async function deleteWorkoutAction(
  workoutId: string,
): Promise<{ ok: boolean; errorKey?: string }> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutOwner(workoutId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", auth.userId);
  if (error) {
    console.error("deleteWorkoutAction:", error);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  revalidatePath("/history");
  revalidatePath("/dashboard");
  redirect("/history");
}

// ---------------------------------------------------------------------------
// getWorkoutHistoryAction — client'tan "load more" için
// ---------------------------------------------------------------------------
export async function getWorkoutHistoryAction(
  offset: number,
  limit: number,
): Promise<{ ok: boolean; errorKey?: string; items?: WorkoutHistoryItem[] }> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const items = await getWorkoutHistory(auth.userId, offset, limit);
  return { ok: true, items };
}

// ---------------------------------------------------------------------------
// updateWorkoutNotesAction — summary sayfasında onBlur auto-save.
// ---------------------------------------------------------------------------
export async function updateWorkoutNotesAction(input: {
  workoutId: string;
  notes: string | null;
}): Promise<{ ok: boolean; errorKey?: string }> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const ownership = await assertWorkoutOwner(input.workoutId, auth.userId);
  if (!ownership.ok) return { ok: false, errorKey: ownership.errorKey };

  const trimmed = input.notes?.trim() ?? "";
  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({ notes: trimmed.length === 0 ? null : trimmed })
    .eq("id", input.workoutId);
  if (error) {
    console.error("updateWorkoutNotesAction:", error);
    return { ok: false, errorKey: "workouts.errors.generic" };
  }
  return { ok: true };
}
