"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MACHINE_TYPES,
  type MachineType,
  type CardioSessionInput,
} from "@/lib/schemas/workout";
import { addCardioSessionAction, updateCardioSessionAction } from "../../actions";
import type { CardioSessionData } from "./CardioSessionCard";

interface Props {
  workoutId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSession?: CardioSessionData;
  onSaved: () => void;
}

// ---------------------------------------------------------------------------
// Duration helpers
// ---------------------------------------------------------------------------
export function parseDurationInput(input: string): number | null {
  const parts = input.trim().split(":").map(Number);
  if (parts.some((p) => isNaN(p) || p < 0)) return null;
  const p0 = parts[0] ?? 0;
  const p1 = parts[1] ?? 0;
  const p2 = parts[2] ?? 0;
  if (parts.length === 1) return Math.round(p0 * 60);
  if (parts.length === 2) return p0 * 60 + p1;
  if (parts.length === 3) return p0 * 3600 + p1 * 60 + p2;
  return null;
}

export function formatDurationInput(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" + s : s}`;
}

// ---------------------------------------------------------------------------
// Fields visible per machine type
// ---------------------------------------------------------------------------
type FieldKey =
  | "distance"
  | "speed"
  | "incline"
  | "resistance"
  | "calories"
  | "notes";

const MACHINE_FIELDS: Record<MachineType, FieldKey[]> = {
  treadmill: ["distance", "speed", "incline", "calories"],
  bike: ["distance", "resistance", "calories"],
  elliptical: ["distance", "resistance", "calories"],
  rowing: ["distance", "calories"],
  outdoor_run: ["distance", "calories"],
  stairmaster: ["calories"],
  other: ["calories", "notes"],
};

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

// ---------------------------------------------------------------------------
// Shell — manages Sheet; key on inner form resets state on every open
// ---------------------------------------------------------------------------
export function CardioForm({
  workoutId,
  open,
  onOpenChange,
  editingSession,
  onSaved,
}: Props) {
  const t = useTranslations("cardio");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle>
            {editingSession ? t("editTitle") : t("addTitle")}
          </SheetTitle>
        </SheetHeader>
        <CardioFormInner
          key={`${editingSession?.id ?? "new"}-${String(open)}`}
          workoutId={workoutId}
          editingSession={editingSession}
          onSaved={onSaved}
        />
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Inner form — remounts (via key) on each Sheet open, so no reset useEffect
// ---------------------------------------------------------------------------
interface InnerProps {
  workoutId: string;
  editingSession?: CardioSessionData;
  onSaved: () => void;
}

function CardioFormInner({ workoutId, editingSession, onSaved }: InnerProps) {
  const t = useTranslations("cardio");
  const tRoot = useTranslations();
  const [pending, startTransition] = useTransition();

  const [machineType, setMachineType] = useState<MachineType>(
    (editingSession?.machineType as MachineType) ?? "treadmill",
  );
  const [durationInput, setDurationInput] = useState<string>(
    editingSession ? formatDurationInput(editingSession.durationSeconds) : "",
  );
  const [distance, setDistance] = useState<string>(
    editingSession?.distanceKm != null ? String(editingSession.distanceKm) : "",
  );
  const [speed, setSpeed] = useState<string>(
    editingSession?.avgSpeed != null ? String(editingSession.avgSpeed) : "",
  );
  const [incline, setIncline] = useState<string>(
    editingSession?.inclinePercent != null ? String(editingSession.inclinePercent) : "",
  );
  const [resistance, setResistance] = useState<string>(
    editingSession?.resistanceLevel != null ? String(editingSession.resistanceLevel) : "",
  );
  const [calories, setCalories] = useState<string>(
    editingSession?.calories != null ? String(editingSession.calories) : "",
  );
  const [notes, setNotes] = useState<string>(editingSession?.notes ?? "");
  const [durationError, setDurationError] = useState<string | null>(null);

  const visibleFields = MACHINE_FIELDS[machineType] ?? [];

  function handleSave() {
    const durationSeconds = parseDurationInput(durationInput);
    if (durationSeconds === null || durationSeconds < 1) {
      setDurationError(safeT(t, "errors.durationRequired"));
      return;
    }
    setDurationError(null);

    const payload: CardioSessionInput = {
      machineType,
      durationSeconds,
      distanceKm: distance.trim() ? parseFloat(distance) : null,
      avgSpeed: speed.trim() ? parseFloat(speed) : null,
      inclinePercent: incline.trim() ? parseFloat(incline) : null,
      resistanceLevel: resistance.trim() ? parseInt(resistance, 10) : null,
      calories: calories.trim() ? parseInt(calories, 10) : null,
      avgHeartRate: null,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      const res = editingSession
        ? await updateCardioSessionAction(editingSession.id, payload)
        : await addCardioSessionAction(workoutId, payload);

      if (res.ok) {
        onSaved();
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
      }
    });
  }

  return (
        <div className="flex flex-col gap-5 pb-6">
          {/* Machine type selector */}
          <div>
            <Label className="mb-2 block">{t("machineLabel")}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MACHINE_TYPES.map((mt) => (
                <button
                  key={mt}
                  type="button"
                  disabled={pending}
                  onClick={() => setMachineType(mt)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm transition-colors text-left",
                    machineType === mt
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border bg-transparent hover:bg-muted",
                    pending && "opacity-50",
                  )}
                >
                  {safeT(t, `machines.${mt}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Duration — always required */}
          <div>
            <Label htmlFor="cardio-duration">
              {t("fields.duration")}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                {t("durationHint")}
              </span>
            </Label>
            <Input
              id="cardio-duration"
              type="text"
              inputMode="numeric"
              value={durationInput}
              onChange={(e) => {
                setDurationInput(e.target.value);
                setDurationError(null);
              }}
              placeholder="30:00"
              className={cn("mt-1 h-11", durationError && "border-destructive")}
              disabled={pending}
            />
            {durationError && (
              <p className="mt-1 text-sm text-destructive">{durationError}</p>
            )}
          </div>

          {/* Optional fields based on machine */}
          {visibleFields.includes("distance") && (
            <div>
              <Label htmlFor="cardio-distance">{t("fields.distance")} <OptionalBadge /></Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="cardio-distance"
                  type="text"
                  inputMode="decimal"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="5.0"
                  className="h-11"
                  disabled={pending}
                />
                <span className="text-sm text-muted-foreground shrink-0">km</span>
              </div>
            </div>
          )}

          {visibleFields.includes("speed") && (
            <div>
              <Label htmlFor="cardio-speed">{t("fields.speed")} <OptionalBadge /></Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="cardio-speed"
                  type="text"
                  inputMode="decimal"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  placeholder="7.5"
                  className="h-11"
                  disabled={pending}
                />
                <span className="text-sm text-muted-foreground shrink-0">km/h</span>
              </div>
            </div>
          )}

          {visibleFields.includes("incline") && (
            <div>
              <Label htmlFor="cardio-incline">{t("fields.incline")} <OptionalBadge /></Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="cardio-incline"
                  type="text"
                  inputMode="decimal"
                  value={incline}
                  onChange={(e) => setIncline(e.target.value)}
                  placeholder="5"
                  className="h-11"
                  disabled={pending}
                />
                <span className="text-sm text-muted-foreground shrink-0">%</span>
              </div>
            </div>
          )}

          {visibleFields.includes("resistance") && (
            <div>
              <Label htmlFor="cardio-resistance">{t("fields.resistance")} <OptionalBadge /></Label>
              <Input
                id="cardio-resistance"
                type="text"
                inputMode="numeric"
                value={resistance}
                onChange={(e) => setResistance(e.target.value)}
                placeholder="8"
                className="mt-1 h-11"
                disabled={pending}
              />
            </div>
          )}

          {visibleFields.includes("calories") && (
            <div>
              <Label htmlFor="cardio-calories">{t("fields.calories")} <OptionalBadge /></Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="cardio-calories"
                  type="text"
                  inputMode="numeric"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="250"
                  className="h-11"
                  disabled={pending}
                />
                <span className="text-sm text-muted-foreground shrink-0">kcal</span>
              </div>
            </div>
          )}

          {visibleFields.includes("notes") && (
            <div>
              <Label htmlFor="cardio-notes">{t("fields.notes")} <OptionalBadge /></Label>
              <Textarea
                id="cardio-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                maxLength={500}
                className="mt-1 min-h-[72px]"
                disabled={pending}
              />
            </div>
          )}

          <Button onClick={handleSave} disabled={pending} size="lg" className="w-full">
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tRoot("common.saving")}
              </>
            ) : (
              tRoot("common.save")
            )}
          </Button>
        </div>
  );
}

function OptionalBadge() {
  const t = useTranslations("workouts.start");
  return (
    <span className="ml-1 text-xs font-normal text-muted-foreground">
      {t("bodyWeightOptional")}
    </span>
  );
}
