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
