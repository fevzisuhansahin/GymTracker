"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, USERNAME_REGEX } from "@/lib/schemas/profile";

export interface UsernameCheckResult {
  available: boolean;
  reason?: "invalid" | "taken" | "unauthenticated";
}

export async function checkUsernameAvailableAction(username: string): Promise<UsernameCheckResult> {
  if (!USERNAME_REGEX.test(username)) {
    return { available: false, reason: "invalid" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { available: false, reason: "unauthenticated" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (error) {
    return { available: false, reason: "taken" };
  }

  return { available: !data, reason: data ? "taken" : undefined };
}

export interface OnboardingActionResult {
  ok: boolean;
  errorKey?: string;
  fieldErrors?: Record<string, string>;
}

export async function completeOnboardingAction(
  _prev: OnboardingActionResult | null,
  formData: FormData,
): Promise<OnboardingActionResult> {
  const raw = {
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    unitPreference: formData.get("unitPreference"),
    language: formData.get("language"),
    isPublic: formData.get("isPublic") === "true",
  };

  const parsed = onboardingSchema.safeParse(raw);
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

  if (!user) {
    return { ok: false, errorKey: "auth.errors.notAuthenticated" };
  }

  const usernameTaken = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .neq("id", user.id)
    .maybeSingle();

  if (usernameTaken.data) {
    return { ok: false, fieldErrors: { username: "onboarding.errors.usernameTaken" } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      unit_preference: parsed.data.unitPreference,
      language: parsed.data.language,
      is_public: parsed.data.isPublic,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, fieldErrors: { username: "onboarding.errors.usernameTaken" } };
    }
    return { ok: false, errorKey: "auth.errors.generic" };
  }

  redirect(`/${parsed.data.language}/dashboard`);
}
