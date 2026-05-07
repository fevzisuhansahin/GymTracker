"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  adminExerciseSchema,
  customExerciseSchema,
  type AdminExerciseInput,
  type CustomExerciseInput,
} from "@/lib/schemas/exercise";

export interface ExerciseActionResult {
  ok: boolean;
  errorKey?: string;
  fieldErrors?: Record<string, string>;
  exerciseId?: string;
}

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

/**
 * Custom hareket oluşturma. UNIQUE (name, created_by) çakışırsa (PG 23505)
 * mevcut satırı bul ve onun id'sini dön — kullanıcı çift tık veya
 * aynı isimde tekrar yarattığında idempotent davran. (Y4 onay)
 */
export async function createCustomExerciseAction(
  input: CustomExerciseInput,
): Promise<ExerciseActionResult> {
  const parsed = customExerciseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errorKey: "auth.errors.notAuthenticated" };

  const { data: inserted, error: insertErr } = await supabase
    .from("exercises")
    .insert({
      name: parsed.data.name,
      primary_muscle: parsed.data.primaryMuscle,
      equipment: parsed.data.equipment,
      is_custom: true,
      created_by: user.id,
    })
    .select("id")
    .maybeSingle();

  if (inserted) {
    revalidatePath("/workout", "layout");
    return { ok: true, exerciseId: inserted.id };
  }

  // 23505 = unique_violation
  if (insertErr?.code === "23505") {
    const { data: existing, error: lookupErr } = await supabase
      .from("exercises")
      .select("id")
      .eq("name", parsed.data.name)
      .eq("created_by", user.id)
      .maybeSingle();
    if (existing) {
      return { ok: true, exerciseId: existing.id };
    }
    if (lookupErr) console.error("createCustomExerciseAction lookup:", lookupErr);
    return { ok: false, errorKey: "exercises.errors.duplicate" };
  }

  console.error("createCustomExerciseAction:", insertErr);
  return { ok: false, errorKey: "exercises.errors.generic" };
}

/**
 * Admin-only: sistem hareketi oluşturur (is_custom=false, created_by=null).
 * Workout'a ekleme yapmaz; sadece exercises tablosuna INSERT.
 */
export async function createSystemExerciseAction(
  input: AdminExerciseInput,
): Promise<ExerciseActionResult> {
  const parsed = adminExerciseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errorKey: "auth.errors.notAuthenticated" };

  // Defense-in-depth: server-side admin kontrolü
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return { ok: false, errorKey: "exercises.errors.forbidden" };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("exercises")
    .insert({
      name: parsed.data.name,
      name_en: parsed.data.nameEn ?? null,
      primary_muscle: parsed.data.primaryMuscle,
      secondary_muscles: parsed.data.secondaryMuscles ?? [],
      equipment: parsed.data.equipment,
      is_custom: false,
      created_by: null,
    })
    .select("id")
    .maybeSingle();

  if (inserted) {
    revalidatePath("/exercises");
    return { ok: true, exerciseId: inserted.id };
  }

  if (insertErr?.code === "23505") {
    return { ok: false, errorKey: "exercises.errors.duplicate" };
  }

  console.error("createSystemExerciseAction:", insertErr);
  return { ok: false, errorKey: "exercises.errors.generic" };
}

/**
 * Admin-only: sistem hareketini siler (is_custom=false, created_by=null).
 * workout_exercises veya personal_records'ta referans varsa engellenir.
 */
export async function deleteExerciseAction(
  exerciseId: string,
): Promise<ExerciseActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errorKey: "auth.errors.notAuthenticated" };

  // Defense-in-depth: admin kontrolü
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return { ok: false, errorKey: "exercises.errors.forbidden" };
  }

  // Sadece sistem hareketleri silinebilir
  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, is_custom")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!exercise) return { ok: false, errorKey: "exercises.errors.notFound" };
  if (exercise.is_custom) {
    return { ok: false, errorKey: "exercises.errors.forbidden" };
  }

  // workout_exercises'da kullanım kontrolü
  const { count: weCount, error: weErr } = await supabase
    .from("workout_exercises")
    .select("id", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);
  if (weErr) {
    console.error("deleteExerciseAction usage check:", weErr);
    return { ok: false, errorKey: "exercises.errors.generic" };
  }
  if (weCount && weCount > 0) {
    return { ok: false, errorKey: "exercises.errors.exerciseInUse" };
  }

  // personal_records'ta kullanım kontrolü
  const { count: prCount, error: prErr } = await supabase
    .from("personal_records")
    .select("id", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);
  if (prErr) {
    console.error("deleteExerciseAction pr check:", prErr);
    return { ok: false, errorKey: "exercises.errors.generic" };
  }
  if (prCount && prCount > 0) {
    return { ok: false, errorKey: "exercises.errors.exerciseInUse" };
  }

  const { error: deleteErr } = await supabase
    .from("exercises")
    .delete()
    .eq("id", exerciseId)
    .eq("is_custom", false); // ekstra güvence: asla custom silme
  if (deleteErr) {
    console.error("deleteExerciseAction delete:", deleteErr);
    return { ok: false, errorKey: "exercises.errors.generic" };
  }

  revalidatePath("/exercises");
  return { ok: true };
}
