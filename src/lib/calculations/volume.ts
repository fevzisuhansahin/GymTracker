/**
 * Volume = sum(weight_kg * reps), warmup setleri hariç.
 * Tüm değerler kg cinsinden döner (UI gösterimi için formatWeight kullan).
 */
export interface SetForVolume {
  weight: number;
  reps: number;
  is_warmup: boolean;
}

export function calculateSetsVolume(sets: ReadonlyArray<SetForVolume>): number {
  let total = 0;
  for (const s of sets) {
    if (s.is_warmup) continue;
    total += s.weight * s.reps;
  }
  return Math.round(total * 100) / 100;
}

export interface ExerciseForVolume {
  sets: ReadonlyArray<SetForVolume>;
}

export function calculateWorkoutVolume(
  exercises: ReadonlyArray<ExerciseForVolume>,
): number {
  let total = 0;
  for (const ex of exercises) {
    total += calculateSetsVolume(ex.sets);
  }
  return Math.round(total * 100) / 100;
}

export function countWorkingSets(
  exercises: ReadonlyArray<ExerciseForVolume>,
): number {
  let total = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (!s.is_warmup) total += 1;
    }
  }
  return total;
}
