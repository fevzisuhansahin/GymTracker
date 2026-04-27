import { z } from "zod";

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export const usernameSchema = z
  .string()
  .min(3, { message: "onboarding.errors.usernameTooShort" })
  .max(20, { message: "onboarding.errors.usernameTooLong" })
  .regex(USERNAME_REGEX, { message: "onboarding.errors.usernameInvalid" });

export const displayNameSchema = z
  .string()
  .min(1, { message: "onboarding.errors.displayNameRequired" })
  .max(50, { message: "onboarding.errors.displayNameTooLong" });

export const unitSchema = z.enum(["kg", "lb"]);
export const languageSchema = z.enum(["tr", "en"]);

export const onboardingSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  unitPreference: unitSchema,
  language: languageSchema,
  isPublic: z.boolean(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
