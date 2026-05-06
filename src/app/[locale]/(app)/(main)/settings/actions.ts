"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { usernameSchema, displayNameSchema } from "@/lib/schemas/profile";
import { z } from "zod";

export interface ActionResult {
  ok: boolean;
  errorKey?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Profile update
// ---------------------------------------------------------------------------

const updateProfileSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
  avatarUrl: z.string().url({ message: "settings.errors.avatarUrlInvalid" }).or(z.literal("")).optional(),
  isPublic: z.boolean(),
});

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    displayName: formData.get("displayName"),
    username: formData.get("username"),
    avatarUrl: (formData.get("avatarUrl") as string) ?? "",
    isPublic: formData.get("isPublic") === "true",
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errorKey: "auth.errors.notAuthenticated" };

  // Username uniqueness check
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) return { ok: false, fieldErrors: { username: "settings.errors.usernameTaken" } };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      username: parsed.data.username,
      avatar_url: parsed.data.avatarUrl || null,
      is_public: parsed.data.isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505")
      return { ok: false, fieldErrors: { username: "settings.errors.usernameTaken" } };
    return { ok: false, errorKey: "settings.errors.generic" };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Preferences update
// ---------------------------------------------------------------------------

const updatePrefsSchema = z.object({
  unitPreference: z.enum(["kg", "lb"]),
  language: z.enum(["tr", "en"]),
});

export async function updatePreferencesAction(
  formData: FormData,
): Promise<ActionResult & { newLanguage?: string }> {
  const raw = {
    unitPreference: formData.get("unitPreference"),
    language: formData.get("language"),
  };

  const parsed = updatePrefsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errorKey: "settings.errors.generic" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errorKey: "auth.errors.notAuthenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      unit_preference: parsed.data.unitPreference,
      language: parsed.data.language,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false, errorKey: "settings.errors.generic" };

  return { ok: true, newLanguage: parsed.data.language };
}

// ---------------------------------------------------------------------------
// Export data
// ---------------------------------------------------------------------------

export async function exportDataAction(): Promise<{ ok: boolean; data?: string; errorKey?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errorKey: "auth.errors.notAuthenticated" };

  const [{ data: profile }, { data: workouts }, { data: prs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("workouts")
      .select(
        `*, split_day:split_days(name),
         exercises:workout_exercises(*, sets(*)),
         cardio_sessions(*)`,
      )
      .eq("user_id", user.id)
      .not("finished_at", "is", null)
      .order("date", { ascending: false }),
    supabase
      .from("personal_records")
      .select("*, exercise:exercises(name)")
      .eq("user_id", user.id)
      .order("achieved_at", { ascending: false }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile,
    workouts: workouts ?? [],
    personalRecords: prs ?? [],
  };

  return { ok: true, data: JSON.stringify(payload, null, 2) };
}

// ---------------------------------------------------------------------------
// Delete account
// ---------------------------------------------------------------------------

export async function deleteAccountAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errorKey: "auth.errors.notAuthenticated" };

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("deleteAccountAction:", error.message);
    return { ok: false, errorKey: "settings.errors.generic" };
  }

  return { ok: true };
}
