"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  formatWeight,
  parseDecimalInput,
  toKg,
  type WeightUnit,
} from "@/lib/calculations/units";
import { Bike } from "lucide-react";
import { cancelWorkoutAction, createWorkoutAction } from "../../actions";

interface SplitDayLite {
  id: string;
  name: string;
}

interface ActiveSplitLite {
  id: string;
  name: string;
  days: SplitDayLite[];
}

interface Props {
  unitPreference: WeightUnit;
  activeWorkoutId: string | null;
  activeSplit: ActiveSplitLite | null;
  lastBodyWeightKg: number | null;
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

export function StartWorkoutClient({
  unitPreference,
  activeWorkoutId,
  activeSplit,
  lastBodyWeightKg,
}: Props) {
  const t = useTranslations("workouts.start");
  const tRoot = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  // Active workout interstitial — kullanıcı önce buradan geçmeli
  if (activeWorkoutId) {
    return (
      <>
        <ActiveExistsCard
          onContinue={() => router.push(`/workout/${activeWorkoutId}`)}
          onDiscardRequest={() => setConfirmingDiscard(true)}
          pending={pending}
        />
        <Dialog
          open={confirmingDiscard}
          onOpenChange={(open) => {
            if (!open) setConfirmingDiscard(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("discardConfirmTitle")}</DialogTitle>
              <DialogDescription>{t("discardConfirmBody")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmingDiscard(false)}
                disabled={pending}
              >
                {tRoot("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await cancelWorkoutAction(activeWorkoutId);
                    if (res.ok) {
                      setConfirmingDiscard(false);
                      router.refresh();
                    } else {
                      toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
                    }
                  })
                }
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("discardConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (!activeSplit) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border bg-card p-6 text-center">
          <h2 className="text-base font-semibold">{t("noActiveSplitTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("noActiveSplitBody")}</p>
          <Link href="/splits" className={cn("mt-4 inline-flex", buttonVariants())}>
            {t("goToSplits")}
          </Link>
        </div>
        <CardioOnlyButton onStart={(id) => router.push(`/workout/${id}`)} pending={pending} startTransition={startTransition} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StartForm
        activeSplit={activeSplit}
        lastBodyWeightKg={lastBodyWeightKg}
        unitPreference={unitPreference}
        onSubmit={(data) =>
          startTransition(async () => {
            const res = await createWorkoutAction({
              splitDayId: data.splitDayId,
              bodyWeightKg: data.bodyWeightKg,
            });
            if (res.ok && res.workoutId) {
              router.push(`/workout/${res.workoutId}`);
            } else {
              toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
            }
          })
        }
        pending={pending}
      />
      <CardioOnlyButton onStart={(id) => router.push(`/workout/${id}`)} pending={pending} startTransition={startTransition} />
    </div>
  );
}

function ActiveExistsCard({
  onContinue,
  onDiscardRequest,
  pending,
}: {
  onContinue: () => void;
  onDiscardRequest: () => void;
  pending: boolean;
}) {
  const t = useTranslations("workouts.start");
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-base font-semibold">{t("activeExistsTitle")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("activeExistsBody")}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onContinue} disabled={pending} className="flex-1">
          {t("continueActive")}
        </Button>
        <Button
          variant="outline"
          onClick={onDiscardRequest}
          disabled={pending}
          className="flex-1"
        >
          {t("discardActive")}
        </Button>
      </div>
    </div>
  );
}

interface StartFormSubmit {
  splitDayId: string | null;
  bodyWeightKg: number | null;
}

function StartForm({
  activeSplit,
  lastBodyWeightKg,
  unitPreference,
  onSubmit,
  pending,
}: {
  activeSplit: ActiveSplitLite;
  lastBodyWeightKg: number | null;
  unitPreference: WeightUnit;
  onSubmit: (data: StartFormSubmit) => void;
  pending: boolean;
}) {
  const t = useTranslations("workouts.start");
  const tRoot = useTranslations();

  const [selectedDayId, setSelectedDayId] = useState<string>(
    activeSplit.days[0]?.id ?? "",
  );
  const [bodyWeightStr, setBodyWeightStr] = useState<string>(
    formatWeight(lastBodyWeightKg, unitPreference),
  );
  const [bwError, setBwError] = useState<string | null>(null);

  function handleStart() {
    let bwKg: number | null = null;
    if (bodyWeightStr.trim().length > 0) {
      const parsed = parseDecimalInput(bodyWeightStr);
      if (parsed === null || parsed <= 0 || parsed >= 500) {
        setBwError(safeT(tRoot, "workouts.errors.weightInvalid"));
        return;
      }
      bwKg = toKg(parsed, unitPreference);
    }
    setBwError(null);
    onSubmit({
      splitDayId: selectedDayId || null,
      bodyWeightKg: bwKg,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("splitLabel")}
        </p>
        <h2 className="mt-1 text-lg font-semibold">{activeSplit.name}</h2>

        <Label className="mt-4 block">{t("dayPickerLabel")}</Label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {activeSplit.days.map((day) => {
            const active = selectedDayId === day.id;
            return (
              <button
                key={day.id}
                type="button"
                disabled={pending}
                onClick={() => setSelectedDayId(day.id)}
                className={cn(
                  "min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border bg-transparent hover:bg-muted",
                  pending && "opacity-50",
                )}
              >
                {day.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <Label htmlFor="bw" className="flex items-center justify-between">
          <span>{t("bodyWeightLabel")}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {t("bodyWeightOptional")}
          </span>
        </Label>
        <div className="mt-2 flex items-center gap-2">
          <Input
            id="bw"
            type="text"
            inputMode="decimal"
            value={bodyWeightStr}
            onChange={(e) => setBodyWeightStr(e.target.value)}
            placeholder={unitPreference === "kg" ? "75" : "165"}
            className="h-11"
          />
          <span className="text-sm font-medium text-muted-foreground">
            {unitPreference}
          </span>
        </div>
        {bwError ? (
          <p className="mt-2 text-sm font-medium text-destructive">{bwError}</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{t("bodyWeightHint")}</p>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          onClick={handleStart}
          disabled={pending || !selectedDayId}
          className="w-full"
          size="lg"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {pending ? t("starting") : t("beginWorkout")}
        </Button>
      </div>
    </div>
  );
}

function CardioOnlyButton({
  onStart,
  pending,
  startTransition,
}: {
  onStart: (workoutId: string) => void;
  pending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const t = useTranslations("workouts.start");
  const tRoot = useTranslations();

  return (
    <Button
      variant="ghost"
      disabled={pending}
      className="w-full"
      onClick={() =>
        startTransition(async () => {
          const res = await createWorkoutAction({
            splitDayId: null,
            bodyWeightKg: null,
          });
          if (res.ok && res.workoutId) {
            onStart(res.workoutId);
          } else {
            toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
          }
        })
      }
    >
      <Bike className="h-4 w-4" />
      {t("cardioOnly")}
    </Button>
  );
}
