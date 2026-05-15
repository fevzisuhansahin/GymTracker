"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Info, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatWeight, type WeightUnit } from "@/lib/calculations/units";
import type { MuscleActivation } from "@/lib/calculations/muscle-activation";
import { BodyDiagram } from "@/components/workout/BodyDiagram";
import { updateWorkoutNotesAction } from "../../../actions";

interface PRRow {
  id: string;
  value: number;
  exerciseName: string;
}

interface Props {
  workoutId: string;
  unitPreference: WeightUnit;
  volumeKg: number;
  workingSets: number;
  durationSeconds: number;
  prs: PRRow[];
  initialNotes: string;
  cardioTotalSeconds: number;
  cardioTotalDistanceKm: number;
  muscleActivations: ReadonlyArray<MuscleActivation>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function SummaryClient({
  workoutId,
  unitPreference,
  volumeKg,
  workingSets,
  durationSeconds,
  prs,
  initialNotes,
  cardioTotalSeconds,
  cardioTotalDistanceKm,
  muscleActivations,
}: Props) {
  const t = useTranslations("workouts.summary");
  const tCardio = useTranslations("cardio");
  const tBody = useTranslations("bodyDiagram");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label={t("totalVolume")}
          value={`${formatWeight(volumeKg, unitPreference)} ${unitPreference}`}
        />
        <Stat label={t("totalSets")} value={String(workingSets)} />
        <Stat label={t("duration")} value={formatDuration(durationSeconds)} />
        {cardioTotalSeconds > 0 && (
          <Stat
            label={tCardio("summaryDuration")}
            value={formatDuration(cardioTotalSeconds)}
          />
        )}
        {cardioTotalDistanceKm > 0 && (
          <Stat
            label={tCardio("summaryDistance")}
            value={`${cardioTotalDistanceKm.toFixed(2)} km`}
          />
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("newPRsTitle")}
        </h2>
        <p className="mb-2 flex items-start gap-1 text-xs text-muted-foreground">
          <Info className="mt-px h-3 w-3 shrink-0" aria-hidden />
          {t("rmFormulaHint")}
        </p>
        {prs.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("noNewPRs")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {prs.map((pr) => (
              <li
                key={pr.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{pr.exerciseName}</span>
                </div>
                <Badge variant="success">
                  {t("newPr", {
                    value: `${formatWeight(pr.value, unitPreference)} ${unitPreference}`,
                  })}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {muscleActivations.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {tBody("title")}
          </h2>
          <div className="rounded-lg border bg-card p-3">
            <BodyDiagram activations={muscleActivations} />
          </div>
        </section>
      )}

      <NotesSection workoutId={workoutId} initial={initialNotes} />

      <Link
        href="/dashboard"
        className={cn("w-full", buttonVariants({ size: "lg" }))}
      >
        {t("backToDashboard")}
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function NotesSection({
  workoutId,
  initial,
}: {
  workoutId: string;
  initial: string;
}) {
  const t = useTranslations("workouts.summary");
  const tRoot = useTranslations();
  const [value, setValue] = useState(initial);
  const lastSavedRef = useRef<string>(initial);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (value === lastSavedRef.current) return;
    setState("saving");
    const res = await updateWorkoutNotesAction({
      workoutId,
      notes: value.trim() === "" ? null : value,
    });
    if (res.ok) {
      lastSavedRef.current = value;
      setState("saved");
    } else {
      setState("error");
      toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
    }
  }

  function schedule(next: string) {
    setValue(next);
    setState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold">{t("notesLabel")}</label>
        <NotesStatus state={state} />
      </div>
      <Textarea
        value={value}
        onChange={(e) => schedule(e.target.value)}
        onBlur={() => void flush()}
        placeholder={t("notesPlaceholder")}
        maxLength={1000}
        className="min-h-[100px]"
      />
    </section>
  );
}

function NotesStatus({ state }: { state: SaveState }) {
  const t = useTranslations("workouts.summary");
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("notesSaving")}
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" />
        {t("notesSaved")}
      </span>
    );
  }
  return null;
}
