import { z } from "zod";
import { muscleGroupSchema } from "./split";

export const EQUIPMENT_TYPES = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "smith_machine",
  "bodyweight",
  "other",
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];
export const equipmentSchema = z.enum(EQUIPMENT_TYPES);

export const customExerciseSchema = z.object({
  name: z
    .string()
    .min(2, { message: "exercises.errors.nameTooShort" })
    .max(80, { message: "exercises.errors.nameTooLong" })
    .transform((v) => v.trim()),
  primaryMuscle: muscleGroupSchema,
  equipment: equipmentSchema,
});
export type CustomExerciseInput = z.infer<typeof customExerciseSchema>;

/** Admin-only: sistem hareketi ekleme için customExerciseSchema'nın üst kümesi. */
export const adminExerciseSchema = customExerciseSchema.extend({
  nameEn: z
    .string()
    .max(80, { message: "exercises.errors.nameTooLong" })
    .transform((v) => v.trim())
    .optional(),
  secondaryMuscles: z.array(muscleGroupSchema).max(5).optional(),
});
export type AdminExerciseInput = z.infer<typeof adminExerciseSchema>;
