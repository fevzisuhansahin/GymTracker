"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatWeight,
  parseDecimalInput,
  toKg,
  type WeightUnit,
} from "@/lib/calculations/units";
import { deleteSetAction, upsertSetAction } from "../../actions";

export interface SetRowInitial {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
  notes: string | null;
}

interface FlushRegistry {
  register: (id: string, fn: () => Promise<void>) => void;
  unregister: (id: string) => void;
}

interface Props {
  workoutExerciseId: string;
  displayIndex: number;
  initial: SetRowInitial | null; // null = placeholder, henüz DB'de yok
  unitPreference: WeightUnit;
  flushRegistry: FlushRegistry;
  onMaterialized: (setId: string) => void; // ilk save sonrası
  onDeleted: () => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 400;

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

export function SetRow({
  workoutExerciseId,
  displayIndex,
  initial,
  unitPreference,
  flushRegistry,
  onMaterialized,
  onDeleted,
}: Props) {
  const t = useTranslations("workouts.set");
  const tRoot = useTranslations();
  const flushId = useId();

  const [setId, setSetId] = useState<string | null>(initial?.id ?? null);
  const [weight, setWeight] = useState<string>(
    initial ? formatWeight(initial.weight, unitPreference) : "",
  );
  const [reps, setReps] = useState<string>(initial ? String(initial.reps) : "");
  const [rpe, setRpe] = useState<string>(initial?.rpe != null ? String(initial.rpe) : "");
  const [isWarmup, setIsWarmup] = useState<boolean>(initial?.isWarmup ?? false);
  const [completed, setCompleted] = useState<boolean>(false); // Y7 client-only
  const [showDetails, setShowDetails] = useState<boolean>(
    Boolean(initial?.rpe != null || initial?.isWarmup),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Snapshot of last successfully persisted values
  const lastSavedRef = useRef<{
    weight: string;
    reps: string;
    rpe: string;
    isWarmup: boolean;
  }>({
    weight,
    reps,
    rpe,
    isWarmup,
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Validate + persist. Used by debounce, blur, and finish pre-flight. */
  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    // No-op short-circuits
    const wTrim = weight.trim();
    const rTrim = reps.trim();
    const rpTrim = rpe.trim();

    // Hiçbir şey girilmemişse ve henüz hiç kaydedilmemişse: çık.
    if (!setId && wTrim === "" && rTrim === "") {
      return;
    }
    // Mevcut DB row varsa ve hiçbir alan değişmemişse: çık.
    if (
      setId &&
      wTrim === lastSavedRef.current.weight &&
      rTrim === lastSavedRef.current.reps &&
      rpTrim === lastSavedRef.current.rpe &&
      isWarmup === lastSavedRef.current.isWarmup
    ) {
      return;
    }
    // Placeholder durumda: weight + reps ikisi de geçerli OLMADAN insert atma.
    if (!setId && (wTrim === "" || rTrim === "")) {
      return;
    }

    const wParsed = parseDecimalInput(wTrim);
    const rParsed = parseDecimalInput(rTrim);
    if (wParsed === null || rParsed === null) {
      return;
    }
    const weightKg = toKg(wParsed, unitPreference);
    const repsInt = Math.trunc(rParsed);

    let rpeNum: number | null = null;
    if (rpTrim !== "") {
      const rpParsed = parseDecimalInput(rpTrim);
      if (rpParsed === null) {
        toast.error(safeT(tRoot, "workouts.errors.rpeInvalid"));
        return;
      }
      if (rpParsed < 1 || rpParsed > 10) {
        toast.error(safeT(tRoot, "workouts.errors.rpeOutOfRange"));
        return;
      }
      rpeNum = rpParsed;
    }

    setSaveState("saving");
    const res = await upsertSetAction({
      setId,
      workoutExerciseId,
      weightKg,
      reps: repsInt,
      rpe: rpeNum,
      isWarmup,
      notes: null,
    });

    if (res.ok && res.setId) {
      lastSavedRef.current = { weight: wTrim, reps: rTrim, rpe: rpTrim, isWarmup };
      const wasNew = setId === null;
      setSetId(res.setId);
      setSaveState("saved");
      if (wasNew) onMaterialized(res.setId);
    } else if (res.fieldErrors) {
      const firstErr = Object.values(res.fieldErrors)[0];
      if (firstErr) toast.error(safeT(tRoot, firstErr));
      setSaveState("error");
    } else {
      toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
      setSaveState("error");
    }
  }, [setId, weight, reps, rpe, isWarmup, workoutExerciseId, unitPreference, onMaterialized, tRoot]);

  // Register/unregister with the parent flush registry (K1 finish pre-flight)
  useEffect(() => {
    flushRegistry.register(flushId, flush);
    return () => flushRegistry.unregister(flushId);
  }, [flushRegistry, flushId, flush]);

  function scheduleSave() {
    setSaveState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  }

  function handleBlur() {
    // K1 onBlur: pending debounce'u bypass et, anında flush
    void flush();
  }

  async function handleDelete() {
    if (timer.current) clearTimeout(timer.current);
    if (!setId) {
      // Sadece placeholder, DB'de yok
      onDeleted();
      return;
    }
    const res = await deleteSetAction(setId);
    if (res.ok) {
      onDeleted();
    } else {
      toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
    }
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const weightLabel = unitPreference === "kg" ? t("weightLabel") : t("weightLabelLb");

  return (
    <li
      className={cn(
        "rounded-md border p-2",
        completed ? "border-emerald-500/50 bg-emerald-500/5" : "border-border",
        isWarmup && "border-amber-500/40 bg-amber-500/5",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">
          {displayIndex}
        </span>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {weightLabel}
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                scheduleSave();
              }}
              onBlur={handleBlur}
              className="h-11 text-base"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("repsLabel")}
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={reps}
              onChange={(e) => {
                setReps(e.target.value.replace(/[^0-9]/g, ""));
                scheduleSave();
              }}
              onBlur={handleBlur}
              className="h-11 text-base"
              placeholder="0"
            />
          </div>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant={completed ? "secondary" : "outline"}
          onClick={() => {
            setCompleted((v) => !v);
            void flush(); // also persist any pending input
          }}
          aria-label={t("completeAria")}
          aria-pressed={completed}
          className="h-11 w-11"
        >
          <Check className={cn("h-4 w-4", completed && "text-emerald-500")} />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={handleDelete}
          aria-label={t("deleteAria")}
          className="h-11 w-11 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              showDetails && "rotate-180",
            )}
          />
          {t("expandDetails")}
        </button>
        <SaveStatusBadge state={saveState} />
      </div>

      {showDetails && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("rpeLabel")}
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={rpe}
              onChange={(e) => {
                setRpe(e.target.value);
                scheduleSave();
              }}
              onBlur={handleBlur}
              className="h-9"
              placeholder="—"
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-1.5">
            <Checkbox
              checked={isWarmup}
              onCheckedChange={(checked) => {
                setIsWarmup(Boolean(checked));
                scheduleSave();
              }}
            />
            <span className="text-sm">{t("warmupLabel")}</span>
          </label>
        </div>
      )}
    </li>
  );
}

function SaveStatusBadge({ state }: { state: SaveState }) {
  const t = useTranslations("workouts.set");
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("saving")}
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" />
        {t("saved")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
      {t("saveFailed")}
    </span>
  );
}
