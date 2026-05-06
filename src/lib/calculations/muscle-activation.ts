/**
 * Bir antrenmandaki hareketlerden kas aktivasyon haritasını hesaplar.
 *
 * Kurallar:
 * - Primary muscle: exercise volume'unun %100'ünü alır
 * - Secondary muscles: exercise volume'unun %50'sini alır
 * - Aynı kas birden fazla exercise'da varsa volume'lar toplanır
 * - 'shoulders' özel hareketi: hem 'front_delts' hem 'rear_delts' aktive eder
 * - Bilinmeyen kas isimleri yok sayılır
 * - Warmup setleri volume hesabına dahil değil
 */

export interface MuscleActivation {
  /** SVG içindeki kas grup id'si (BodyDiagram'da kullanılan kanonik isim). */
  muscle: string;
  /** Bu kasa atfedilen toplam volume (kg cinsinden). */
  volume: number;
  /** En az bir exercise'da primary muscle olarak görüldü mü? */
  isPrimary: boolean;
}

interface SetForActivation {
  weight: number;
  reps: number;
  is_warmup: boolean;
}

export interface WorkoutExerciseForActivation {
  exercise: {
    primary_muscle: string;
    secondary_muscles: string[];
  };
  sets: ReadonlyArray<SetForActivation>;
}

/** SVG'de tanımlı kas id'leri. Bunun dışındaki isimler ignore edilir. */
const KNOWN_MUSCLES: ReadonlySet<string> = new Set([
  "chest",
  "lats",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "biceps",
  "triceps",
  "abs",
  "traps",
  "forearms",
  "lower_back",
  "rear_delts",
  "front_delts",
]);

/**
 * Bir-çoğa muscle map'i. exercises tablosundaki isim
 * birden fazla SVG kasını aktive ediyorsa burada belirtilir.
 */
const MUSCLE_EXPANSION: ReadonlyMap<string, ReadonlyArray<string>> = new Map([
  ["shoulders", ["front_delts", "rear_delts"]],
]);

function normalize(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, "_");
}

function expand(muscle: string): ReadonlyArray<string> {
  const normalized = normalize(muscle);
  const mapped = MUSCLE_EXPANSION.get(normalized);
  if (mapped) return mapped;
  if (KNOWN_MUSCLES.has(normalized)) return [normalized];
  return [];
}

function exerciseVolume(sets: ReadonlyArray<SetForActivation>): number {
  let total = 0;
  for (const s of sets) {
    if (s.is_warmup) continue;
    total += s.weight * s.reps;
  }
  return total;
}

export function calculateMuscleActivations(
  exercises: ReadonlyArray<WorkoutExerciseForActivation>,
): MuscleActivation[] {
  const map = new Map<string, { volume: number; isPrimary: boolean }>();

  function add(muscle: string, vol: number, isPrimary: boolean): void {
    const existing = map.get(muscle);
    if (existing) {
      existing.volume += vol;
      if (isPrimary) existing.isPrimary = true;
    } else {
      map.set(muscle, { volume: vol, isPrimary });
    }
  }

  for (const ex of exercises) {
    const vol = exerciseVolume(ex.sets);
    if (vol <= 0) continue;

    for (const m of expand(ex.exercise.primary_muscle)) {
      add(m, vol, true);
    }

    const secondaries = ex.exercise.secondary_muscles ?? [];
    for (const sec of secondaries) {
      for (const m of expand(sec)) {
        add(m, vol * 0.5, false);
      }
    }
  }

  return Array.from(map.entries())
    .map(([muscle, data]) => ({
      muscle,
      volume: Math.round(data.volume * 100) / 100,
      isPrimary: data.isPrimary,
    }))
    .sort((a, b) => b.volume - a.volume);
}
