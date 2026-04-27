import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type SplitRow = Database["public"]["Tables"]["splits"]["Row"];
export type SplitDayRow = Database["public"]["Tables"]["split_days"]["Row"];

export interface SplitWithDays extends SplitRow {
  days: SplitDayRow[];
}

/**
 * Kullanıcının kendi split'leri (template kopyaları + sıfırdan oluşturulanlar).
 * Sistem şablonları ayrı çağrı ile gelir (`getTemplateSplits`).
 */
export async function getUserSplits(userId: string): Promise<SplitWithDays[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("splits")
    .select("*, days:split_days(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserSplits error:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    ...row,
    days: (row.days ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index),
  }));
}

export async function getTemplateSplits(): Promise<SplitWithDays[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("splits")
    .select("*, days:split_days(*)")
    .is("user_id", null)
    .eq("is_template", true)
    .order("name");

  if (error) {
    console.error("getTemplateSplits error:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    ...row,
    days: (row.days ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index),
  }));
}

export async function getSplitWithDays(splitId: string): Promise<SplitWithDays | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("splits")
    .select("*, days:split_days(*)")
    .eq("id", splitId)
    .maybeSingle();

  if (error) {
    console.error("getSplitWithDays error:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    ...data,
    days: (data.days ?? []).slice().sort((a, b) => a.order_index - b.order_index),
  };
}

export async function getActiveSplit(userId: string): Promise<SplitWithDays | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("splits")
    .select("*, days:split_days(*)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("getActiveSplit error:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    ...data,
    days: (data.days ?? []).slice().sort((a, b) => a.order_index - b.order_index),
  };
}
