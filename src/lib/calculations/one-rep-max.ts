/**
 * Epley formülü ile estimated 1RM hesaplaması (DB'deki estimate_1rm
 * fonksiyonu ile parity sağlar).
 *
 * 1RM = w * (1 + r/30)  (r > 1 için)
 * 1RM = w                (r == 1 için)
 * null                   (r <= 0 ya da değerler null)
 */
export function epley1RM(weightKg: number | null, reps: number | null): number | null {
  if (weightKg == null || reps == null || reps <= 0) return null;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 100) / 100;
}

interface HistorySetInput {
  weight: number;
  reps: number;
  isWarmup: boolean;
}

interface HistoryEntryInput {
  date: string;
  sets: HistorySetInput[];
}

export interface ProgressDataPoint {
  date: string;
  estimated1RM: number | null;
  maxWeight: number;
  totalVolume: number;
  bestSetVolume: number;
}

export function calculateProgressMetrics(
  history: HistoryEntryInput[],
): ProgressDataPoint[] {
  return history.map((entry) => {
    const working = entry.sets.filter((s) => !s.isWarmup);

    if (working.length === 0) {
      return {
        date: entry.date,
        estimated1RM: null,
        maxWeight: 0,
        totalVolume: 0,
        bestSetVolume: 0,
      };
    }

    let estimated1RM: number | null = null;
    let maxWeight = 0;
    let totalVolume = 0;
    let bestSetVolume = 0;

    for (const s of working) {
      const orm = epley1RM(s.weight, s.reps);
      if (orm != null && (estimated1RM == null || orm > estimated1RM)) {
        estimated1RM = orm;
      }
      if (s.weight > maxWeight) maxWeight = s.weight;
      totalVolume += s.weight * s.reps;
      const sv = s.weight * s.reps;
      if (sv > bestSetVolume) bestSetVolume = sv;
    }

    return {
      date: entry.date,
      estimated1RM: estimated1RM != null ? Math.round(estimated1RM * 100) / 100 : null,
      maxWeight: Math.round(maxWeight * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      bestSetVolume: Math.round(bestSetVolume * 100) / 100,
    };
  });
}
