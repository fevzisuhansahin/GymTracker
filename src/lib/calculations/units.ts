/**
 * Birim dönüşüm sabitleri.
 * DB her zaman kg saklar; UI kullanıcının `unit_preference` tercihine göre
 * gösterir / parse eder.
 *
 * 1 lb = 0.45359237 kg (NIST tanımı, exact)
 */
export const KG_PER_LB = 0.45359237;
export const LB_PER_KG = 1 / KG_PER_LB;

export type WeightUnit = "kg" | "lb";

/** kg değerini kullanıcı biriminde göstermek için string'e çevirir. */
export function formatWeight(kg: number | null | undefined, unit: WeightUnit): string {
  if (kg == null || Number.isNaN(kg)) return "";
  const value = unit === "kg" ? kg : kg * LB_PER_KG;
  // Tam sayıysa virgülsüz, değilse 1-2 ondalık.
  return Number.isInteger(value)
    ? value.toString()
    : (Math.round(value * 100) / 100).toString();
}

/** Kullanıcı biriminde girilmiş input'u kg'a normalize eder. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

/** kg değerini kullanıcı birimine çevirir (number olarak; format için formatWeight kullan). */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : kg * LB_PER_KG;
}

/**
 * Serbest text input ("12,5" / "12.5" / "12") → number | null parse eder.
 * Boş string ya da geçersiz değer için null döner; çağıran tarafta validate edilir.
 */
export function parseDecimalInput(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}
