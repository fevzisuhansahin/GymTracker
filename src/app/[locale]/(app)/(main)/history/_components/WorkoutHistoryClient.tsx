"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Clock, Dumbbell, Bike, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { WorkoutHistoryItem } from "@/lib/db/workouts";
import { getWorkoutHistoryAction } from "../../workout/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCardioTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}s ${m}d`;
  if (s === 0) return `${m}dk`;
  return `${m}dk ${s}sn`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}s ${m}d`;
  return `${m}dk`;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

function useRelativeDate(dateStr: string, t: ReturnType<typeof useTranslations<"history">>) {
  const date = new Date(dateStr);
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dateStr === todayStr) return t("today");
  if (dateStr === yesterdayStr) return t("yesterday");

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return t("daysAgo", { count: diffDays });

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// ---------------------------------------------------------------------------
// Filter type
// ---------------------------------------------------------------------------
type FilterType = "all" | "strength" | "cardio";

// ---------------------------------------------------------------------------
// WorkoutCard
// ---------------------------------------------------------------------------
function WorkoutCard({ item }: { item: WorkoutHistoryItem }) {
  const t = useTranslations("history");
  const tWD = useTranslations("workoutDetail");
  const relativeDate = useRelativeDate(item.date, t);

  const label = item.splitDayName
    ? item.splitDayName
    : item.hasCardio && !item.hasExercises
    ? t("cardioOnly")
    : t("freeWorkout");

  return (
    <Link
      href={`/workout/${item.id}`}
      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40 active:bg-muted/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.hasExercises && <Dumbbell className="h-3.5 w-3.5 shrink-0 text-primary" />}
            {item.hasCardio && <Bike className="h-3.5 w-3.5 shrink-0 text-primary" />}
            <h3 className="truncate font-semibold">{label}</h3>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{relativeDate}</span>
            {item.durationSeconds != null && item.durationSeconds > 0 && (
              <>
                <span>·</span>
                <Clock className="h-3 w-3" />
                <span>{formatDuration(item.durationSeconds)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {item.hasExercises && (
          <>
            <Metric
              label={tWD("workingSets")}
              value={t("sets", { count: item.workingSetCount })}
            />
            {item.totalVolumeKg > 0 && (
              <Metric label={tWD("totalVolume")} value={formatVolume(item.totalVolumeKg)} />
            )}
          </>
        )}
        {item.hasCardio && (
          <>
            <Metric label={t("cardioLabel")} value={formatCardioTime(item.cardioTotalSeconds)} />
            {item.cardioTotalDistanceKm > 0 && (
              <Metric label={t("distanceLabel")} value={`${item.cardioTotalDistanceKm.toFixed(2)} km`} />
            )}
          </>
        )}
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------
function WorkoutCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </div>
      <div className="mt-3 flex gap-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface Props {
  initialItems: WorkoutHistoryItem[];
  pageSize: number;
  hasMore: boolean;
}

export function WorkoutHistoryClient({ initialItems, pageSize, hasMore: initialHasMore }: Props) {
  const t = useTranslations("history");
  const [items, setItems] = useState<WorkoutHistoryItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [filter, setFilter] = useState<FilterType>("all");
  const [pending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const res = await getWorkoutHistoryAction(items.length, pageSize);
      if (!res.ok || !res.items) {
        toast.error(t("loadError"));
        return;
      }
      setItems((prev) => [...prev, ...res.items!]);
      setHasMore(res.items.length === pageSize);
    });
  }

  const filtered = items.filter((item) => {
    if (filter === "strength") return item.hasExercises;
    if (filter === "cardio") return item.hasCardio;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "strength", "cardio"] as FilterType[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              filter === f
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {f === "all" ? t("filterAll") : f === "strength" ? t("filterStrength") : t("filterCardio")}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && !pending ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-10 text-center">
            <Trophy className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? t("emptyAll") : t("emptyFiltered")}
            </p>
          </div>
        ) : (
          filtered.map((item) => <WorkoutCard key={item.id} item={item} />)
        )}
      </div>

      {/* Load more / all loaded */}
      {hasMore ? (
        <Button
          variant="outline"
          onClick={handleLoadMore}
          disabled={pending}
          className="w-full"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </>
          ) : (
            t("loadMore")
          )}
        </Button>
      ) : (
        items.length > 0 && (
          <p className="text-center text-sm text-muted-foreground">{t("allLoaded")}</p>
        )
      )}

      {/* Skeleton during load-more */}
      {pending && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <WorkoutCardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
