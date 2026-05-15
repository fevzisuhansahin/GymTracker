"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bike, Calendar, Clock, Info, Loader2, Trash2, Trophy, Weight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatWeight, type WeightUnit } from "@/lib/calculations/units";
import type { MuscleActivation } from "@/lib/calculations/muscle-activation";
import { BodyDiagram } from "@/components/workout/BodyDiagram";
import { formatCardioTime } from "./CardioSessionCard";
import { deleteWorkoutAction } from "../../actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SetData {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
  notes: string | null;
}

interface ExerciseData {
  id: string;
  exerciseId: string;
  exerciseName: string;
  equipment: string | null;
  notes: string | null;
  sets: SetData[];
}

interface CardioData {
  id: string;
  machineType: string;
  durationSeconds: number;
  distanceKm: number | null;
  avgSpeed: number | null;
  inclinePercent: number | null;
  resistanceLevel: number | null;
  calories: number | null;
  notes: string | null;
}

interface PRData {
  id: string;
  exerciseName: string;
  value: number;
}

export interface WorkoutDetailData {
  id: string;
  date: string;
  splitDayName: string | null;
  durationSeconds: number | null;
  bodyWeightKg: number | null;
  notes: string | null;
  exercises: ExerciseData[];
  cardioSessions: CardioData[];
  prs: PRData[];
  totalVolumeKg: number;
  workingSetCount: number;
  muscleActivations: ReadonlyArray<MuscleActivation>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}s ${m}d`;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

// ---------------------------------------------------------------------------
// WorkoutDetail
// ---------------------------------------------------------------------------
interface Props {
  data: WorkoutDetailData;
  unitPreference: WeightUnit;
}

export function WorkoutDetail({ data, unitPreference }: Props) {
  const t = useTranslations("workoutDetail");
  const tRoot = useTranslations();
  const tCardio = useTranslations("cardio");
  const tEquip = useTranslations("equipment");
  const tBody = useTranslations("bodyDiagram");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const dateDisplay = new Date(data.date).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteWorkoutAction(data.id);
      if (!res.ok) {
        toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
        setConfirmDelete(false);
      }
      // On success: deleteWorkoutAction redirects, so no explicit navigation needed
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {data.splitDayName ?? t("noSplitDay")}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {dateDisplay}
            </span>
            {data.durationSeconds != null && data.durationSeconds > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(data.durationSeconds)}
              </span>
            )}
            {data.bodyWeightKg != null && (
              <span className="flex items-center gap-1">
                <Weight className="h-3.5 w-3.5" />
                {formatWeight(data.bodyWeightKg, unitPreference)} {unitPreference}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setConfirmDelete(true)}
          aria-label={t("deleteTitle")}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Stats */}
      {(data.workingSetCount > 0 || data.totalVolumeKg > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.totalVolumeKg > 0 && (
            <StatCard
              label={t("totalVolume")}
              value={`${formatWeight(data.totalVolumeKg, unitPreference)} ${unitPreference}`}
            />
          )}
          {data.workingSetCount > 0 && (
            <StatCard label={t("workingSets")} value={String(data.workingSetCount)} />
          )}
        </div>
      )}

      {/* PRs */}
      {data.prs.length > 0 && (
        <section>
          <SectionTitle icon={<Trophy className="h-4 w-4 text-amber-500" />} title={t("prBadge")} />
          <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
            <Info className="mt-px h-3 w-3 shrink-0" aria-hidden />
            {t("epleyFormula")}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {data.prs.map((pr) => (
              <li
                key={pr.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{pr.exerciseName}</span>
                </div>
                <Badge variant="success">
                  {formatWeight(pr.value, unitPreference)} {unitPreference}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Muscles worked */}
      {data.muscleActivations.length > 0 && (
        <section>
          <SectionTitle icon={null} title={tBody("title")} />
          <div className="mt-2 rounded-lg border bg-card p-3">
            <BodyDiagram activations={data.muscleActivations} />
          </div>
        </section>
      )}

      {/* Exercises */}
      <section>
        <SectionTitle icon={null} title={t("exercisesTitle")} />
        {data.exercises.length === 0 ? (
          <EmptyState message={t("noExercises")} />
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            {data.exercises.map((ex) => (
              <ExerciseBlock
                key={ex.id}
                ex={ex}
                unitPreference={unitPreference}
                t={t}
                tEquip={tEquip}
              />
            ))}
          </div>
        )}
      </section>

      {/* Cardio */}
      {data.cardioSessions.length > 0 && (
        <section>
          <SectionTitle
            icon={<Bike className="h-4 w-4 text-primary" />}
            title={t("cardioTitle")}
          />
          <div className="mt-2 flex flex-col gap-3">
            {data.cardioSessions.map((cs) => (
              <CardioBlock key={cs.id} cs={cs} tCardio={tCardio} />
            ))}
          </div>
        </section>
      )}

      {/* Workout notes */}
      {data.notes && (
        <section>
          <SectionTitle icon={null} title={t("notesLabel")} />
          <p className="mt-2 rounded-lg border bg-muted/30 p-3 text-sm">{data.notes}</p>
        </section>
      )}

      {/* Delete confirm dialog */}
      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("deleteConfirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
            >
              {tRoot("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="mt-2 rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function ExerciseBlock({
  ex,
  unitPreference,
  t,
  tEquip,
}: {
  ex: ExerciseData;
  unitPreference: WeightUnit;
  t: ReturnType<typeof useTranslations<"workoutDetail">>;
  tEquip: ReturnType<typeof useTranslations<"equipment">>;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/exercises/${ex.exerciseId}`}
            className="font-semibold hover:underline underline-offset-2"
          >
            {ex.exerciseName}
          </Link>
          {ex.equipment && (
            <Badge variant="muted" className="mt-1">
              {tEquip(ex.equipment as never)}
            </Badge>
          )}
        </div>
      </div>

      {ex.notes && (
        <p className="mt-2 text-xs text-muted-foreground border-t pt-2">{ex.notes}</p>
      )}

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="w-8 text-left font-normal">#</th>
            <th className="text-right font-normal">kg</th>
            <th className="text-right font-normal">×</th>
            <th className="w-16 text-right font-normal">RPE</th>
          </tr>
        </thead>
        <tbody>
          {ex.sets.map((s) => (
            <tr
              key={s.id}
              className={cn(
                "border-t border-border/40",
                s.isWarmup && "text-muted-foreground",
              )}
            >
              <td className="py-1.5 text-xs">
                {s.isWarmup ? (
                  <span className="text-[10px]">W</span>
                ) : (
                  t("setNumber", { n: s.setNumber })
                )}
              </td>
              <td className="py-1.5 text-right">
                {formatWeight(s.weight, unitPreference)}
              </td>
              <td className="py-1.5 text-right">{s.reps}</td>
              <td className="py-1.5 text-right text-xs text-muted-foreground">
                {s.rpe != null ? s.rpe : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardioBlock({
  cs,
  tCardio,
}: {
  cs: CardioData;
  tCardio: ReturnType<typeof useTranslations<"cardio">>;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Bike className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">
          {safeT(tCardio, `machines.${cs.machineType}`)}
        </h3>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <CardioMetric label={tCardio("fields.duration")} value={formatCardioTime(cs.durationSeconds)} />
        {cs.distanceKm != null && (
          <CardioMetric label={tCardio("fields.distance")} value={`${cs.distanceKm} km`} />
        )}
        {cs.avgSpeed != null && (
          <CardioMetric label={tCardio("fields.speed")} value={`${cs.avgSpeed} km/h`} />
        )}
        {cs.inclinePercent != null && (
          <CardioMetric label={tCardio("fields.incline")} value={`${cs.inclinePercent}%`} />
        )}
        {cs.resistanceLevel != null && (
          <CardioMetric label={tCardio("fields.resistance")} value={String(cs.resistanceLevel)} />
        )}
        {cs.calories != null && (
          <CardioMetric label={tCardio("fields.calories")} value={`${cs.calories} kcal`} />
        )}
      </div>
      {cs.notes && (
        <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">{cs.notes}</p>
      )}
    </div>
  );
}

function CardioMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
