import { z } from "zod";

// Vocabulary mirrored from migration 20260427000011_seed_system_data.sql.
export const MUSCLE_GROUPS = [
  "chest",
  "lats",
  "mid_back",
  "lower_back",
  "traps",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "obliques",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const muscleGroupSchema = z.enum(MUSCLE_GROUPS);

export const splitDayInputSchema = z.object({
  name: z
    .string()
    .min(1, { message: "splits.errors.dayNameRequired" })
    .max(60, { message: "splits.errors.dayNameTooLong" }),
  targetMuscleGroups: z.array(muscleGroupSchema),
});
export type SplitDayInput = z.infer<typeof splitDayInputSchema>;

export const splitFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: "splits.errors.nameRequired" })
    .max(80, { message: "splits.errors.nameTooLong" }),
  description: z
    .string()
    .max(500, { message: "splits.errors.descriptionTooLong" })
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  days: z
    .array(splitDayInputSchema)
    .min(1, { message: "splits.errors.dayCountTooLow" })
    .max(7, { message: "splits.errors.dayCountTooHigh" }),
});
export type SplitFormInput = z.infer<typeof splitFormSchema>;

// Update form: each day may carry its existing id (rename/reorder preserves
// it) or be null/undefined for newly added days.
export const updateSplitDayInputSchema = splitDayInputSchema.extend({
  id: z.string().uuid().nullable(),
});
export type UpdateSplitDayInput = z.infer<typeof updateSplitDayInputSchema>;

export const updateSplitFormSchema = z.object({
  splitId: z.string().uuid(),
  name: z
    .string()
    .min(1, { message: "splits.errors.nameRequired" })
    .max(80, { message: "splits.errors.nameTooLong" }),
  description: z
    .string()
    .max(500, { message: "splits.errors.descriptionTooLong" })
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  days: z
    .array(updateSplitDayInputSchema)
    .min(1, { message: "splits.errors.dayCountTooLow" })
    .max(7, { message: "splits.errors.dayCountTooHigh" }),
});
export type UpdateSplitFormInput = z.infer<typeof updateSplitFormSchema>;
