import { z } from "zod";

const emailField = z
  .string()
  .min(1, { message: "auth.errors.emailRequired" })
  .email({ message: "auth.errors.emailInvalid" });

const passwordField = z
  .string()
  .min(8, { message: "auth.errors.passwordTooShort" })
  .regex(/[0-9]/, { message: "auth.errors.passwordNeedsNumber" });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: "auth.errors.passwordRequired" }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.errors.passwordsDoNotMatch",
    path: ["confirmPassword"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.errors.passwordsDoNotMatch",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
