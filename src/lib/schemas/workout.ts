import { z } from "zod";

// DB constraint: 0 < weight < 1000 (kg). UI input is in user's preference unit
// (kg or lb) and must be normalized to kg before persistence.
export const weightKgSchema = z
  .number({ message: "workouts.errors.weightInvalid" })
  .gt(0, { message: "workouts.errors.weightTooLow" })
  .lt(1000, { message: "workouts.errors.weightTooHigh" });

// DB constraint: 0 < reps < 1000.
export const repsSchema = z
  .number({ message: "workouts.errors.repsInvalid" })
  .int({ message: "workouts.errors.repsInvalid" })
  .gt(0, { message: "workouts.errors.repsTooLow" })
  .lt(1000, { message: "workouts.errors.repsTooHigh" });

export const rpeSchema = z
  .number({ message: "workouts.errors.rpeInvalid" })
  .gte(1, { message: "workouts.errors.rpeOutOfRange" })
  .lte(10, { message: "workouts.errors.rpeOutOfRange" });

// DB constraint: 0 < body_weight < 500 (kg). null = skipped.
export const bodyWeightKgSchema = z
  .number()
  .gt(0, { message: "workouts.errors.bodyWeightTooLow" })
  .lt(500, { message: "workouts.errors.bodyWeightTooHigh" });

export const createWorkoutSchema = z.object({
  splitDayId: z.string().uuid().nullable(),
  bodyWeightKg: bodyWeightKgSchema.nullable(),
});
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export const setUpsertSchema = z.object({
  setId: z.string().uuid().nullable(),
  workoutExerciseId: z.string().uuid(),
  weightKg: weightKgSchema,
  reps: repsSchema,
  rpe: rpeSchema.nullable(),
  isWarmup: z.boolean(),
  notes: z
    .string()
    .max(200, { message: "workouts.errors.notesTooLong" })
    .nullable(),
});
export type SetUpsertInput = z.infer<typeof setUpsertSchema>;

export const finishWorkoutSchema = z.object({
  workoutId: z.string().uuid(),
  notes: z
    .string()
    .max(1000, { message: "workouts.errors.notesTooLong" })
    .nullable(),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 24), // hard cap 24h
});
export type FinishWorkoutInput = z.infer<typeof finishWorkoutSchema>;

export const updateBodyWeightSchema = z.object({
  workoutId: z.string().uuid(),
  bodyWeightKg: bodyWeightKgSchema.nullable(),
});

export const exerciseNotesSchema = z.object({
  workoutExerciseId: z.string().uuid(),
  notes: z
    .string()
    .max(500, { message: "workouts.errors.notesTooLong" })
    .nullable(),
});
