"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/schemas/split";
import type { ExerciseRow } from "@/lib/db/exercises";

interface Props {
  exercises: ExerciseRow[];
}

export function ExercisesListClient({ exercises }: Props) {
  const t = useTranslations("exercises");
  const tMuscles = useTranslations("muscles");
  const tEquip = useTranslations("equipment");
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  const filtered = exercises.filter((ex) => {
    const matchesQuery =
      query.trim() === "" ||
      ex.name.toLowerCase().includes(query.toLowerCase()) ||
      (ex.name_en ?? "").toLowerCase().includes(query.toLowerCase());
    const matchesMuscle = muscle == null || ex.primary_muscle === muscle;
    return matchesQuery && matchesMuscle;
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">{t("listTitle")}</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      {/* Muscle filter */}
      <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setMuscle(null)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
            muscle == null
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {t("allMuscles")}
        </button>
        {MUSCLE_GROUPS.map((mg) => (
          <button
            key={mg}
            type="button"
            onClick={() => setMuscle(muscle === mg ? null : mg)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
              muscle === mg
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {tMuscles(mg as Parameters<typeof tMuscles>[0])}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {t("noResults")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((ex) => (
            <Link
              key={ex.id}
              href={`/exercises/${ex.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40 active:bg-muted/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{ex.name}</p>
                  {ex.is_custom && (
                    <Badge variant="muted" className="shrink-0 text-[10px]">
                      {t("customBadge")}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {tMuscles(ex.primary_muscle as Parameters<typeof tMuscles>[0])}
                  </Badge>
                  {ex.equipment && (
                    <Badge variant="outline" className="text-[10px]">
                      {tEquip(ex.equipment as Parameters<typeof tEquip>[0])}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
