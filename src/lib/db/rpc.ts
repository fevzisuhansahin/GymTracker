import { createClient } from "@/lib/supabase/server";

/**
 * Atomic RPC wrappers. Each function is defined in
 * supabase/migrations/20260428000001_workout_rpcs.sql and is SECURITY INVOKER —
 * RLS policies still apply for the calling user.
 *
 * Errors raised inside plpgsql (e.g. 'not_authenticated', 'forbidden',
 * 'template_not_found', 'workout_not_found') propagate as PostgrestError.message.
 */

export interface CreateSplitWithDaysInput {
  name: string;
  description: string | null;
  days: Array<{
    name: string;
    orderIndex: number;
    targetMuscleGroups: string[];
  }>;
}

export async function rpcCreateSplitWithDays(
  input: CreateSplitWithDaysInput,
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_split_with_days", {
    p_name: input.name,
    p_description: input.description,
    p_days: input.days.map((d) => ({
      name: d.name,
      order_index: d.orderIndex,
      target_muscle_groups: d.targetMuscleGroups,
    })),
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("rpc_no_data");
  return data;
}

export async function rpcCopyTemplateSplit(templateId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("copy_template_split", {
    p_template_id: templateId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("rpc_no_data");
  return data;
}

export interface FinishWorkoutInput {
  workoutId: string;
  notes: string | null;
  durationSeconds: number;
}

export async function rpcFinishWorkout(input: FinishWorkoutInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finish_workout", {
    p_workout_id: input.workoutId,
    p_notes: input.notes,
    p_duration_seconds: input.durationSeconds,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("rpc_no_data");
  return data;
}
