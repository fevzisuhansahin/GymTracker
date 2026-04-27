import type { AuthError } from "@supabase/supabase-js";

export function mapAuthErrorToKey(error: Pick<AuthError, "message" | "code"> | null | undefined): string {
  if (!error) return "auth.errors.generic";
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login")) {
    return "auth.errors.invalidCredentials";
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "auth.errors.emailNotConfirmed";
  }
  if (code === "user_already_exists" || message.includes("already registered") || message.includes("already exists")) {
    return "auth.errors.emailAlreadyExists";
  }
  if (code === "weak_password" || message.includes("password should be")) {
    return "auth.errors.weakPassword";
  }
  if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "auth.errors.rateLimit";
  }
  if (code === "otp_expired" || message.includes("expired")) {
    return "auth.errors.linkExpired";
  }
  return "auth.errors.generic";
}
