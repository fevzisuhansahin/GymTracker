"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getRecentExercisesForSplitDay,
  getRecentExercisesForUser,
  searchExercises,
} from "@/lib/db/exercises";

interface SelectorExercise {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string | null;
}

/**
 * "Önerilenler" tab veri kaynağı.
 * - splitDayId varsa: bu güne özel son 3 ay sıklık sıralı
 * - splitDayId yoksa (cardio-only veya silinmiş split day, Y6 fallback):
 *   kullanıcının global son 3 ay sıklık sıralısı
 */
export async function getRecommendedExercisesForSelectorAction(
  splitDayId: string | null,
): Promise<SelectorExercise[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const rows = splitDayId
    ? await getRecentExercisesForSplitDay(user.id, splitDayId)
    : await getRecentExercisesForUser(user.id);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    primary_muscle: r.primary_muscle,
    equipment: r.equipment,
  }));
}

export async function searchExercisesAction(
  query: string,
): Promise<SelectorExercise[]> {
  const rows = await searchExercises(query);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    primary_muscle: r.primary_muscle,
    equipment: r.equipment,
  }));
}
