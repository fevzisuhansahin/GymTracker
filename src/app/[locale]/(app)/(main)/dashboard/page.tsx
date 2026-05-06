import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";
import { ChevronRight, Play, Plus } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatWeight, type WeightUnit } from "@/lib/calculations/units";
import { calculateWorkoutVolume, countWorkingSets } from "@/lib/calculations/volume";
import { getActiveSplit } from "@/lib/db/splits";
import {
  getActiveWorkout,
  getRecentWorkouts,
  getWeeklyVolume,
  getMonthlyWorkoutCount,
  getCurrentStreak,
} from "@/lib/db/workouts";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;

  const session = await getCurrentUserWithProfile();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [active, split, recents, weeklyVolume, monthlyCount, streak] =
    await Promise.all([
      getActiveWorkout(session.userId),
      getActiveSplit(session.userId),
      getRecentWorkouts(session.userId, 3),
      getWeeklyVolume(session.userId),
      getMonthlyWorkoutCount(session.userId),
      getCurrentStreak(session.userId),
    ]);

  const unit: WeightUnit = session.profile?.unit_preference === "lb" ? "lb" : "kg";

  return (
    <Container className="py-6 pb-24">
      <DashboardContent
        displayName={session.profile?.display_name ?? ""}
        unit={unit}
        activeWorkoutId={active?.id ?? null}
        activeSplit={split ? { id: split.id, name: split.name } : null}
        weeklyVolumeKg={weeklyVolume}
        monthlyWorkoutCount={monthlyCount}
        currentStreak={streak}
        recents={recents.map((w) => {
          const exForCalc = (w.exercises ?? []).map((e) => ({
            sets: (e.sets ?? []).map((s) => ({
              weight: s.weight,
              reps: s.reps,
              is_warmup: s.is_warmup,
            })),
          }));
          return {
            id: w.id,
            date: w.date,
            splitDayName: w.split_day?.name ?? null,
            hasCardio: (w.cardio_sessions ?? []).length > 0,
            volumeKg: calculateWorkoutVolume(exForCalc),
            workingSets: countWorkingSets(exForCalc),
          };
        })}
      />
    </Container>
  );
}

interface RecentWorkoutCard {
  id: string;
  date: string;
  splitDayName: string | null;
  hasCardio: boolean;
  volumeKg: number;
  workingSets: number;
}

interface DashboardProps {
  displayName: string;
  unit: WeightUnit;
  activeWorkoutId: string | null;
  activeSplit: { id: string; name: string } | null;
  weeklyVolumeKg: number;
  monthlyWorkoutCount: number;
  currentStreak: number;
  recents: RecentWorkoutCard[];
}

function DashboardContent({
  displayName,
  unit,
  activeWorkoutId,
  activeSplit,
  weeklyVolumeKg,
  monthlyWorkoutCount,
  currentStreak,
  recents,
}: DashboardProps) {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">{t("greetingPrefix")}</p>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("welcome", { name: displayName })}
        </h1>
      </header>

      <StatsGrid
        unit={unit}
        weeklyVolumeKg={weeklyVolumeKg}
        monthlyWorkoutCount={monthlyWorkoutCount}
        currentStreak={currentStreak}
      />

      {activeWorkoutId ? (
        <Link
          href={`/workout/${activeWorkoutId}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">
              {t("activeWorkoutTitle")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("activeWorkoutBody")}
            </p>
          </div>
          <span
            className={cn(
              buttonVariants({ size: "sm" }),
              "shrink-0",
            )}
          >
            <Play className="h-3.5 w-3.5" />
            {t("continueWorkout")}
          </span>
        </Link>
      ) : activeSplit ? (
        <ActiveSplitCard activeSplit={activeSplit} newWorkoutLabel={tNav("newWorkout")} />
      ) : (
        <NoActiveSplitCard />
      )}

      <RecentWorkoutsSection unit={unit} recents={recents} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats grid
// ---------------------------------------------------------------------------
function StatsGrid({
  unit,
  weeklyVolumeKg,
  monthlyWorkoutCount,
  currentStreak,
}: {
  unit: WeightUnit;
  weeklyVolumeKg: number;
  monthlyWorkoutCount: number;
  currentStreak: number;
}) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label={t("weeklyVolume")}
          value={`${formatWeight(weeklyVolumeKg, unit)}`}
          unit={unit}
        />
        <StatCard
          label={t("streak")}
          value={String(currentStreak)}
          unit={t("days")}
        />
        <StatCard
          label={t("monthlyWorkouts")}
          value={String(monthlyWorkoutCount)}
          unit={t("workoutsUnit")}
        />
      </div>
      <Link
        href="/exercises/prs"
        className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
      >
        <span className="font-medium">{t("viewAllPRs")}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold leading-none">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{unit}</p>
    </div>
  );
}

function ActiveSplitCard({
  activeSplit,
  newWorkoutLabel,
}: {
  activeSplit: { id: string; name: string };
  newWorkoutLabel: string;
}) {
  const t = useTranslations("dashboard");
  return (
    <section className="rounded-lg border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {t("activeSplitLabel")}
      </p>
      <h2 className="mt-1 truncate text-lg font-semibold">{activeSplit.name}</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/workout/new"
          className={cn(buttonVariants({ size: "lg" }), "flex-1")}
        >
          <Plus className="h-4 w-4" />
          {newWorkoutLabel}
        </Link>
        <Link
          href="/splits"
          className={cn(buttonVariants({ size: "lg", variant: "outline" }), "flex-1")}
        >
          {t("viewSplits")}
        </Link>
      </div>
    </section>
  );
}

function NoActiveSplitCard() {
  const t = useTranslations("dashboard");
  return (
    <section className="rounded-lg border bg-card p-6 text-center">
      <h2 className="text-base font-semibold">{t("noActiveSplitTitle")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("noActiveSplitBody")}</p>
      <Link
        href="/splits"
        className={cn("mt-4 inline-flex", buttonVariants())}
      >
        {t("openSplits")}
      </Link>
    </section>
  );
}

function RecentWorkoutsSection({
  unit,
  recents,
}: {
  unit: WeightUnit;
  recents: RecentWorkoutCard[];
}) {
  const t = useTranslations("dashboard");
  const fmt = useFormatter();
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("recentTitle")}
      </h2>
      {recents.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
          {t("recentEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recents.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {w.splitDayName ?? (w.hasCardio ? t("cardioWorkout") : t("freeWorkout"))}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fmt.dateTime(new Date(w.date), {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="muted">
                  {t("stats.sets", { count: w.workingSets })}
                </Badge>
                <Badge variant="outline">
                  {formatWeight(w.volumeKg, unit)} {unit}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
