"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bike, Loader2, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RestTimer } from "@/components/workout/RestTimer";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  formatWeight,
  parseDecimalInput,
  toKg,
  type WeightUnit,
} from "@/lib/calculations/units";
import {
  finishWorkoutAction,
  updateBodyWeightAction,
} from "../../actions";

import { ExerciseCard, type ExerciseCardData } from "./ExerciseCard";
import { ExerciseSelector } from "./ExerciseSelector";
import { CardioSessionCard, type CardioSessionData } from "./CardioSessionCard";
import { CardioForm } from "./CardioForm";

export interface WorkoutData {
  id: string;
  startedAt: string;
  bodyWeightKg: number | null;
  splitDayName: string | null;
  splitDayId: string | null;
  exercises: ExerciseCardData[];
  cardioSessions: CardioSessionData[];
}

interface Props {
  unitPreference: WeightUnit;
  workout: WorkoutData;
  isAdmin: boolean;
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

/**
 * Pending-flush registry: child SetRow component'leri pending olan
 * debounced upsert'leri buraya kaydeder. "Antrenmanı Bitir" tıklandığında
 * tüm flush handler'ları Promise.all ile beklenir.
 */
export type FlushHandler = () => Promise<void>;

interface FlushRegistry {
  register: (id: string, fn: FlushHandler) => void;
  unregister: (id: string) => void;
  flushAll: () => Promise<void>;
}

function useFlushRegistry(): FlushRegistry {
  const handlers = useRef<Map<string, FlushHandler>>(new Map());
  return {
    register: useCallback((id, fn) => {
      handlers.current.set(id, fn);
    }, []),
    unregister: useCallback((id) => {
      handlers.current.delete(id);
    }, []),
    flushAll: useCallback(async () => {
      const all = [...handlers.current.values()].map((fn) => fn());
      await Promise.allSettled(all);
    }, []),
  };
}

export function WorkoutEditor({ unitPreference, workout, isAdmin }: Props) {
  const t = useTranslations("workouts.editor");
  const tRoot = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [cardioFormOpen, setCardioFormOpen] = useState(false);

  // Rest timer state
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimerKey, setRestTimerKey] = useState(0);

  const handleSetComplete = useCallback(() => {
    setRestTimerActive(true);
    setRestTimerKey((k) => k + 1);
  }, []);

  const startedAtMs = new Date(workout.startedAt).getTime();
  const elapsed = useElapsedSeconds(startedAtMs);

  const flushRegistry = useFlushRegistry();

  function handleFinish() {
    startTransition(async () => {
      await flushRegistry.flushAll();
      const res = await finishWorkoutAction({
        workoutId: workout.id,
        notes: null,
        durationSeconds: Math.max(
          0,
          Math.floor((Date.now() - startedAtMs) / 1000),
        ),
      });
      if (res && !res.ok) {
        toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
      }
    });
  }

  const hasNoContent =
    workout.exercises.length === 0 && workout.cardioSessions.length === 0;

  return (
    <Container className="py-4 pb-32">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight">
              {workout.splitDayName ?? t("splitNoneLabel")}
            </h1>
            <p
              className="text-xs text-muted-foreground cursor-default"
              title={t("timerNotPauseable")}
            >
              {t("elapsed")}: {formatElapsed(elapsed)}
            </p>
          </div>
          <BodyWeightField
            workoutId={workout.id}
            initialKg={workout.bodyWeightKg}
            unitPreference={unitPreference}
          />
        </div>
      </header>

      <main className="mt-5 flex flex-col gap-4">
        {hasNoContent && (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {t("noExercisesYet")}
          </div>
        )}

        {workout.exercises.map((we, idx) => (
          <ExerciseCard
            key={we.id}
            data={we}
            unitPreference={unitPreference}
            flushRegistry={flushRegistry}
            canMoveUp={idx > 0}
            canMoveDown={idx < workout.exercises.length - 1}
            onSetComplete={handleSetComplete}
          />
        ))}

        {workout.cardioSessions.map((cs) => (
          <CardioSessionCard key={cs.id} workoutId={workout.id} data={cs} />
        ))}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSelectorOpen(true)}
            className="flex-1"
            disabled={pending}
          >
            <Plus className="h-4 w-4" />
            {t("addExercise")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setCardioFormOpen(true)}
            className="flex-1"
            disabled={pending}
          >
            <Bike className="h-4 w-4" />
            {t("addCardio")}
          </Button>
        </div>
      </main>

      {/* Fixed bottom bar: rest timer (if active) + finish button */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur",
          "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          "md:relative md:inset-auto md:border-0 md:bg-transparent md:backdrop-blur-0 md:px-0 md:pb-0 md:pt-6",
        )}
      >
        <Container className="px-0 flex flex-col gap-2">
          {restTimerActive && (
            <RestTimer
              key={restTimerKey}
              onComplete={() => setRestTimerActive(false)}
              onSkip={() => setRestTimerActive(false)}
            />
          )}
          <Button
            onClick={handleFinish}
            disabled={pending}
            size="lg"
            className="w-full"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trophy className="h-4 w-4" />
            )}
            {pending ? t("finishing") : t("finishWorkout")}
          </Button>
        </Container>
      </div>

      <ExerciseSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        workoutId={workout.id}
        splitDayId={workout.splitDayId}
        excludeExerciseIds={workout.exercises.map((we) => we.exercise.id)}
        onAdded={() => {
          setSelectorOpen(false);
          startTransition(() => { router.refresh(); });
        }}
        isAdmin={isAdmin}
      />

      <CardioForm
        workoutId={workout.id}
        open={cardioFormOpen}
        onOpenChange={setCardioFormOpen}
        onSaved={() => {
          setCardioFormOpen(false);
          startTransition(() => { router.refresh(); });
        }}
      />
    </Container>
  );
}

// ---------------------------------------------------------------------------
// Body weight inline input — debounced upsert, blur flush
// ---------------------------------------------------------------------------
function BodyWeightField({
  workoutId,
  initialKg,
  unitPreference,
}: {
  workoutId: string;
  initialKg: number | null;
  unitPreference: WeightUnit;
}) {
  const t = useTranslations("workouts.editor");
  const tRoot = useTranslations();
  const [value, setValue] = useState<string>(formatWeight(initialKg, unitPreference));
  const lastSavedRef = useRef<string>(value);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (pendingTimer.current) {
      clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
    }
    const trimmed = value.trim();
    if (trimmed === lastSavedRef.current) return;
    let kg: number | null = null;
    if (trimmed.length > 0) {
      const parsed = parseDecimalInput(trimmed);
      if (parsed === null || parsed <= 0 || parsed >= 500) {
        toast.error(safeT(tRoot, "workouts.errors.weightInvalid"));
        return;
      }
      kg = toKg(parsed, unitPreference);
    }
    const res = await updateBodyWeightAction({ workoutId, bodyWeightKg: kg });
    if (res.ok) {
      lastSavedRef.current = trimmed;
    } else {
      toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
    }
  }, [value, unitPreference, workoutId, tRoot]);

  function scheduleSave(next: string) {
    setValue(next);
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => {
      void flush();
    }, 600);
  }

  useEffect(() => {
    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, []);

  return (
    <div className="flex shrink-0 flex-col items-end">
      <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {t("bodyWeightShort")}
      </label>
      <div className="mt-1 flex items-center gap-1">
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => scheduleSave(e.target.value)}
          onBlur={() => void flush()}
          placeholder="—"
          className="h-9 w-16 text-right text-sm"
        />
        <span className="text-xs font-medium text-muted-foreground">
          {unitPreference}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// useElapsedSeconds — workout timer ticker
// ---------------------------------------------------------------------------
function useElapsedSeconds(startedAtMs: number): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, Math.floor((now - startedAtMs) / 1000));
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
