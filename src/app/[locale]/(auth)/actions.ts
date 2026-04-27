"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapAuthErrorToKey } from "@/lib/auth/errors";
import { getSiteUrl } from "@/lib/auth/site-url";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/schemas/auth";

export interface ActionResult {
  ok: boolean;
  errorKey?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
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

function getLocale(formData: FormData): "tr" | "en" {
  const raw = formData.get("locale");
  return raw === "en" ? "en" : "tr";
}

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, errorKey: mapAuthErrorToKey(error) };
  }

  const locale = getLocale(formData);
  redirect(`/${locale}/dashboard`);
}

export async function signupAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const locale = getLocale(formData);

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/${locale}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, errorKey: mapAuthErrorToKey(error) };
  }

  return { ok: true, redirectTo: `/${locale}/signup?verify=1` };
}

export async function forgotPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const locale = getLocale(formData);

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/${locale}/auth/callback?type=recovery`,
  });

  if (error) {
    return { ok: false, errorKey: mapAuthErrorToKey(error) };
  }

  return { ok: true };
}

export async function resetPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, errorKey: "auth.errors.linkExpired" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, errorKey: mapAuthErrorToKey(error) };
  }

  const locale = getLocale(formData);
  redirect(`/${locale}/dashboard`);
}

export async function googleSignInAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const locale = getLocale(formData);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/${locale}/auth/callback`,
    },
  });

  if (error || !data?.url) {
    redirect(`/${locale}/login?error=oauth`);
  }
  redirect(data.url);
}

export async function logoutAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = getLocale(formData);
  redirect(`/${locale}`);
}
