"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  splitFormSchema,
  updateSplitFormSchema,
  type SplitFormInput,
  type UpdateSplitFormInput,
} from "@/lib/schemas/split";
import {
  rpcCreateSplitWithDays,
  rpcCopyTemplateSplit,
  rpcUpdateSplitWithDays,
} from "@/lib/db/rpc";

export interface SplitActionResult {
  ok: boolean;
  errorKey?: string;
  fieldErrors?: Record<string, string>;
  splitId?: string;
}

export interface UpdateSplitDryRunResult {
  ok: boolean;
  errorKey?: string;
  fieldErrors?: Record<string, string>;
  toDeleteDayIds?: string[];
  affectedWorkoutCount?: number;
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

async function requireUserId(): Promise<{ userId: string } | { errorKey: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errorKey: "auth.errors.notAuthenticated" };
  return { userId: user.id };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export async function createSplitAction(
  input: SplitFormInput,
): Promise<SplitActionResult> {
  const parsed = splitFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  try {
    const splitId = await rpcCreateSplitWithDays({
      name: parsed.data.name,
      description: parsed.data.description,
      days: parsed.data.days.map((d, idx) => ({
        name: d.name,
        orderIndex: idx + 1,
        targetMuscleGroups: d.targetMuscleGroups,
      })),
    });
    revalidatePath("/splits");
    revalidatePath("/dashboard");
    return { ok: true, splitId };
  } catch (e) {
    console.error("createSplitAction:", e);
    return { ok: false, errorKey: "splits.errors.generic" };
  }
}

// ---------------------------------------------------------------------------
// Update (dry-run + apply)
//
// dryRun: form state'i alır, hangi day_id'lerin silineceğini ve kaç geçmiş
// workout'un etkileneceğini hesaplar (kullanıcı confirm dialog'u için).
// apply: gerçek update'i atomik olarak yapar (RPC).
// ---------------------------------------------------------------------------
export async function previewUpdateSplitAction(
  input: UpdateSplitFormInput,
): Promise<UpdateSplitDryRunResult> {
  const parsed = updateSplitFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const supabase = await createClient();

  // Ownership + mevcut day id'leri
  const { data: split, error: splitErr } = await supabase
    .from("splits")
    .select("id, user_id, days:split_days(id)")
    .eq("id", parsed.data.splitId)
    .maybeSingle();

  if (splitErr || !split) {
    return { ok: false, errorKey: "splits.errors.notFound" };
  }
  if (split.user_id !== auth.userId) {
    return { ok: false, errorKey: "splits.errors.forbidden" };
  }

  const existingIds = new Set((split.days ?? []).map((d) => d.id));
  const incomingIds = new Set(
    parsed.data.days.map((d) => d.id).filter((id): id is string => Boolean(id)),
  );
  const toDeleteDayIds = [...existingIds].filter((id) => !incomingIds.has(id));

  if (toDeleteDayIds.length === 0) {
    return { ok: true, toDeleteDayIds: [], affectedWorkoutCount: 0 };
  }

  const { count, error: countErr } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .in("split_day_id", toDeleteDayIds);

  if (countErr) {
    console.error("previewUpdateSplitAction count:", countErr);
    return { ok: false, errorKey: "splits.errors.generic" };
  }

  return {
    ok: true,
    toDeleteDayIds,
    affectedWorkoutCount: count ?? 0,
  };
}

export async function applyUpdateSplitAction(
  input: UpdateSplitFormInput,
): Promise<SplitActionResult> {
  const parsed = updateSplitFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  try {
    await rpcUpdateSplitWithDays({
      splitId: parsed.data.splitId,
      name: parsed.data.name,
      description: parsed.data.description,
      days: parsed.data.days.map((d) => ({
        id: d.id,
        name: d.name,
        targetMuscleGroups: d.targetMuscleGroups,
      })),
    });
    revalidatePath("/splits");
    revalidatePath(`/splits/${parsed.data.splitId}/edit`);
    revalidatePath("/dashboard");
    return { ok: true, splitId: parsed.data.splitId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    console.error("applyUpdateSplitAction:", e);
    if (msg.includes("split_not_found")) {
      return { ok: false, errorKey: "splits.errors.notFound" };
    }
    if (msg.includes("forbidden")) {
      return { ok: false, errorKey: "splits.errors.forbidden" };
    }
    return { ok: false, errorKey: "splits.errors.generic" };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
export async function deleteSplitAction(
  splitId: string,
): Promise<{ ok: boolean; errorKey?: string }> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const supabase = await createClient();
  const { error } = await supabase
    .from("splits")
    .delete()
    .eq("id", splitId)
    .eq("user_id", auth.userId);

  if (error) {
    console.error("deleteSplitAction:", error);
    return { ok: false, errorKey: "splits.errors.generic" };
  }
  revalidatePath("/splits");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Set active (atomic 2-step)
// ---------------------------------------------------------------------------
export async function setActiveSplitAction(
  splitId: string,
): Promise<{ ok: boolean; errorKey?: string }> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  const supabase = await createClient();

  // 1) Diğer aktifleri kapat. Partial unique index'i ihlal etmemek için
  //    önce false setlemek zorunlu.
  const { error: clearErr } = await supabase
    .from("splits")
    .update({ is_active: false })
    .eq("user_id", auth.userId)
    .eq("is_active", true);

  if (clearErr) {
    console.error("setActiveSplitAction (clear):", clearErr);
    return { ok: false, errorKey: "splits.errors.generic" };
  }

  // 2) Hedefi aktif yap (ownership filtreli).
  const { error: setErr } = await supabase
    .from("splits")
    .update({ is_active: true })
    .eq("id", splitId)
    .eq("user_id", auth.userId);

  if (setErr) {
    console.error("setActiveSplitAction (set):", setErr);
    return { ok: false, errorKey: "splits.errors.generic" };
  }

  revalidatePath("/splits");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Copy template
// ---------------------------------------------------------------------------
export async function copyTemplateSplitAction(
  templateId: string,
): Promise<SplitActionResult> {
  const auth = await requireUserId();
  if ("errorKey" in auth) return { ok: false, errorKey: auth.errorKey };

  try {
    const newSplitId = await rpcCopyTemplateSplit(templateId);
    revalidatePath("/splits");
    return { ok: true, splitId: newSplitId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    console.error("copyTemplateSplitAction:", e);
    if (msg.includes("template_not_found")) {
      return { ok: false, errorKey: "splits.errors.templateNotFound" };
    }
    return { ok: false, errorKey: "splits.errors.generic" };
  }
}
