"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatWeight, type WeightUnit } from "@/lib/calculations/units";
import { ExerciseProgressChart } from "@/components/charts/ExerciseProgressChart";
import type { ExerciseRow, ExerciseHistoryEntry } from "@/lib/db/exercises";
import type { PRRecord } from "@/lib/db/prs";
import type { ProgressDataPoint } from "@/lib/calculations/one-rep-max";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calcImprovement(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Props {
  exercise: ExerciseRow;
  history: ExerciseHistoryEntry[];
  prs: PRRecord[];
  progressData: ProgressDataPoint[];
  unitPreference: WeightUnit;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ExerciseDetailClient({
  exercise,
  history,
  prs,
  progressData,
  unitPreference,
}: Props) {
  const t = useTranslations("exercises");
  const tPrs = useTranslations("prs");
  const tMuscles = useTranslations("muscles");
  const tEquip = useTranslations("equipment");
  const tCommon = useTranslations("common");

  const currentPR = prs.length > 0 ? prs[prs.length - 1] : null;
  const previousPR = prs.length > 1 ? prs[prs.length - 2] : null;
  const improvement =
    currentPR && previousPR
      ? calcImprovement(currentPR.value, previousPR.value)
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/exercises"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tCommon("back")}
      </Link>

      {/* Header */}
      <div>
        <div className="flex flex-wrap items-start gap-2">
          <h1 className="text-2xl font-bold tracking-tight break-words">
            {exercise.name}
          </h1>
          {exercise.is_custom && (
            <Badge variant="muted" className="mt-1 shrink-0">
              {t("customBadge")}
            </Badge>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {exercise.equipment && (
            <Badge variant="outline">
              {tEquip(exercise.equipment as Parameters<typeof tEquip>[0])}
            </Badge>
          )}
          <Badge variant="secondary">
            {tMuscles(exercise.primary_muscle as Parameters<typeof tMuscles>[0])}
          </Badge>
          {exercise.secondary_muscles.map((m) => (
            <Badge key={m} variant="muted">
              {tMuscles(m as Parameters<typeof tMuscles>[0])}
            </Badge>
          ))}
        </div>
      </div>

      {/* PR section */}
      <section>
        <SectionTitle
          icon={<Trophy className="h-4 w-4 text-amber-500" />}
          title={tPrs("title")}
        />
        {currentPR == null ? (
          <EmptyState message={tPrs("noRecords")} />
        ) : (
          <div className="mt-3 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {tPrs("currentPR")}
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatWeight(currentPR.value, unitPreference)}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    {unitPreference}
                  </span>
                </p>
              </div>
              {improvement != null && improvement > 0 && (
                <Badge variant="success" className="mt-1 shrink-0">
                  +{improvement}%
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {tPrs("achievedOn", { date: formatDate(currentPR.achievedAt) })}
            </p>
          </div>
        )}
      </section>

      {/* Progress chart */}
      <section>
        <SectionTitle icon={null} title={t("progressTitle")} />
        <div className="mt-3">
          <ExerciseProgressChart data={progressData} unit={unitPreference} />
        </div>
      </section>

      {/* History list */}
      <section>
        <SectionTitle icon={null} title={t("historyTitle")} />
        {history.length === 0 ? (
          <EmptyState message={t("historyEmpty")} />
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {history.map((entry) => (
              <HistoryCard
                key={entry.workoutId}
                entry={entry}
                unitPreference={unitPreference}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b pb-2">
      {icon}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function HistoryCard({
  entry,
  unitPreference,
}: {
  entry: ExerciseHistoryEntry;
  unitPreference: WeightUnit;
}) {
  const workingSets = entry.sets.filter((s) => !s.isWarmup);
  const warmupSets = entry.sets.filter((s) => s.isWarmup);
  const totalVolume = workingSets.reduce((acc, s) => acc + s.weight * s.reps, 0);
  const showRpe = entry.sets.some((s) => s.rpe != null);

  return (
    <Link
      href={`/workout/${entry.workoutId}`}
      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40 active:bg-muted/60"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{formatDate(entry.date)}</p>
        {totalVolume > 0 && (
          <p className="shrink-0 text-sm text-muted-foreground">
            {formatWeight(totalVolume, unitPreference)} {unitPreference}
          </p>
        )}
      </div>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="w-8 text-left font-normal">#</th>
            <th className="text-right font-normal">{unitPreference}</th>
            <th className="text-right font-normal">×</th>
            {showRpe && <th className="w-14 text-right font-normal">RPE</th>}
          </tr>
        </thead>
        <tbody>
          {warmupSets.map((s, i) => (
            <SetRow key={`w${i}`} s={s} label="W" isWarmup showRpe={showRpe} unitPreference={unitPreference} />
          ))}
          {workingSets.map((s, i) => (
            <SetRow key={i} s={s} label={String(i + 1)} isWarmup={false} showRpe={showRpe} unitPreference={unitPreference} />
          ))}
        </tbody>
      </table>
    </Link>
  );
}

function SetRow({
  s,
  label,
  isWarmup,
  showRpe,
  unitPreference,
}: {
  s: ExerciseHistoryEntry["sets"][number];
  label: string;
  isWarmup: boolean;
  showRpe: boolean;
  unitPreference: WeightUnit;
}) {
  return (
    <tr
      className={cn(
        "border-t border-border/40",
        isWarmup && "text-muted-foreground",
      )}
    >
      <td className="py-1.5 text-xs">{label}</td>
      <td className="py-1.5 text-right">
        {formatWeight(s.weight, unitPreference)}
      </td>
      <td className="py-1.5 text-right">{s.reps}</td>
      {showRpe && (
        <td className="py-1.5 text-right text-xs text-muted-foreground">
          {s.rpe != null ? s.rpe : "—"}
        </td>
      )}
    </tr>
  );
}
