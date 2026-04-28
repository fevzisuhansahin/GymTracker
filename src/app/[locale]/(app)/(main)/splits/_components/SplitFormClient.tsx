"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  splitFormSchema,
  updateSplitFormSchema,
  MUSCLE_GROUPS,
  type MuscleGroup,
} from "@/lib/schemas/split";
import {
  createSplitAction,
  previewUpdateSplitAction,
  applyUpdateSplitAction,
} from "../actions";

interface DayState {
  // null = yeni, mevcut id varsa korunur (rename/reorder)
  id: string | null;
  name: string;
  targetMuscleGroups: MuscleGroup[];
}

interface InitialState {
  splitId: string;
  name: string;
  description: string;
  days: DayState[];
}

interface Props {
  mode: "create" | "edit";
  initial?: InitialState;
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

export function SplitFormClient({ mode, initial }: Props) {
  const t = useTranslations("splits");
  const tRoot = useTranslations();
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [days, setDays] = useState<DayState[]>(
    initial?.days ?? [{ id: null, name: "", targetMuscleGroups: [] }],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  // Dry-run sonucu: kullanıcı confirm gerekiyorsa burada tutulur
  const [confirmState, setConfirmState] = useState<{
    affectedWorkoutCount: number;
  } | null>(null);

  function addDay() {
    if (days.length >= 7) return;
    setDays((d) => [...d, { id: null, name: "", targetMuscleGroups: [] }]);
  }

  function removeDay(idx: number) {
    setDays((d) => d.filter((_, i) => i !== idx));
  }

  function moveDay(idx: number, dir: -1 | 1) {
    setDays((d) => {
      const target = idx + dir;
      if (target < 0 || target >= d.length) return d;
      const next = [...d];
      const a = next[idx];
      const b = next[target];
      if (!a || !b) return d;
      next[idx] = b;
      next[target] = a;
      return next;
    });
  }

  function updateDay(idx: number, patch: Partial<DayState>) {
    setDays((d) => d.map((day, i) => (i === idx ? { ...day, ...patch } : day)));
  }

  function toggleMuscle(idx: number, m: MuscleGroup) {
    setDays((d) =>
      d.map((day, i) => {
        if (i !== idx) return day;
        const has = day.targetMuscleGroups.includes(m);
        return {
          ...day,
          targetMuscleGroups: has
            ? day.targetMuscleGroups.filter((x) => x !== m)
            : [...day.targetMuscleGroups, m],
        };
      }),
    );
  }

  function buildPayload() {
    return {
      name: name.trim(),
      description: description.trim() === "" ? null : description.trim(),
      days: days.map((d) => ({
        name: d.name.trim(),
        targetMuscleGroups: d.targetMuscleGroups,
      })),
    };
  }

  function buildUpdatePayload() {
    if (!initial) throw new Error("buildUpdatePayload without initial");
    return {
      splitId: initial.splitId,
      name: name.trim(),
      description: description.trim() === "" ? null : description.trim(),
      days: days.map((d) => ({
        id: d.id,
        name: d.name.trim(),
        targetMuscleGroups: d.targetMuscleGroups,
      })),
    };
  }

  function validateLocally(): boolean {
    const payload = mode === "create" ? buildPayload() : buildUpdatePayload();
    const result =
      mode === "create"
        ? splitFormSchema.safeParse(payload)
        : updateSplitFormSchema.safeParse(payload);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.map(String).join(".") || "_";
        if (!newErrors[key]) newErrors[key] = issue.message;
      }
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      if (firstError) toast.error(safeT(tRoot, firstError));
      return false;
    }
    setErrors({});
    return true;
  }

  function handleCreate() {
    if (!validateLocally()) return;
    startTransition(async () => {
      const res = await createSplitAction(buildPayload());
      if (res.ok) {
        toast.success(t("form.createSuccess"));
        router.push("/splits");
      } else if (res.fieldErrors) {
        setErrors(res.fieldErrors);
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "splits.errors.generic"));
      }
    });
  }

  function handleUpdate() {
    if (!validateLocally()) return;
    startTransition(async () => {
      // Önce dry-run: silinecek day var mı, kaç workout etkilenir?
      const preview = await previewUpdateSplitAction(buildUpdatePayload());
      if (!preview.ok) {
        if (preview.fieldErrors) setErrors(preview.fieldErrors);
        else toast.error(safeT(tRoot, preview.errorKey ?? "splits.errors.generic"));
        return;
      }
      if ((preview.affectedWorkoutCount ?? 0) > 0) {
        // Confirm bekle
        setConfirmState({ affectedWorkoutCount: preview.affectedWorkoutCount ?? 0 });
        return;
      }
      // Etkilenen yok, direkt apply
      await actuallyApplyUpdate();
    });
  }

  async function actuallyApplyUpdate() {
    const res = await applyUpdateSplitAction(buildUpdatePayload());
    if (res.ok) {
      toast.success(t("form.updateSuccess"));
      setConfirmState(null);
      router.push("/splits");
    } else if (res.fieldErrors) {
      setErrors(res.fieldErrors);
      setConfirmState(null);
    } else {
      toast.error(safeT(tRoot, res.errorKey ?? "splits.errors.generic"));
      setConfirmState(null);
    }
  }

  function fieldError(path: string): string | undefined {
    const raw = errors[path];
    return raw ? safeT(tRoot, raw) : undefined;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="split-name">{t("form.nameLabel")}</Label>
        <Input
          id="split-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("form.namePlaceholder")}
          maxLength={80}
          autoFocus
          aria-invalid={fieldError("name") ? true : undefined}
        />
        {fieldError("name") && (
          <p className="text-sm font-medium text-destructive">{fieldError("name")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="split-desc">{t("form.descriptionLabel")}</Label>
        <Textarea
          id="split-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("form.descriptionPlaceholder")}
          maxLength={500}
        />
        {fieldError("description") && (
          <p className="text-sm font-medium text-destructive">
            {fieldError("description")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>{t("form.daysLabel")}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDay}
            disabled={days.length >= 7 || pending}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("form.addDay")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("form.daysHint")}</p>
        {fieldError("days") && (
          <p className="text-sm font-medium text-destructive">{fieldError("days")}</p>
        )}

        <ul className="flex flex-col gap-3">
          {days.map((day, idx) => (
            <li key={day.id ?? `new-${idx}`} className="rounded-lg border bg-card p-4">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => moveDay(idx, -1)}
                    disabled={idx === 0 || pending}
                    aria-label={tRoot("common.moveUp")}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => moveDay(idx, 1)}
                    disabled={idx === days.length - 1 || pending}
                    aria-label={tRoot("common.moveDown")}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <Label htmlFor={`day-${idx}-name`} className="text-xs">
                    {t("form.dayNameLabel")} {idx + 1}
                  </Label>
                  <Input
                    id={`day-${idx}-name`}
                    value={day.name}
                    onChange={(e) => updateDay(idx, { name: e.target.value })}
                    placeholder={t("form.dayNamePlaceholder")}
                    maxLength={60}
                    className="mt-1"
                    aria-invalid={
                      fieldError(`days.${idx}.name`) ? true : undefined
                    }
                  />
                  {fieldError(`days.${idx}.name`) && (
                    <p className="mt-1 text-xs font-medium text-destructive">
                      {fieldError(`days.${idx}.name`)}
                    </p>
                  )}

                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium">
                      {t("form.targetMusclesLabel")}
                    </p>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {t("form.targetMusclesHint")}
                    </p>
                    <MuscleChips
                      selected={day.targetMuscleGroups}
                      onToggle={(m) => toggleMuscle(idx, m)}
                      disabled={pending}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeDay(idx)}
                  disabled={pending || days.length === 1}
                  aria-label={tRoot("common.delete")}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-end gap-2 sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/splits")}
          disabled={pending}
        >
          {tRoot("common.cancel")}
        </Button>
        <Button
          type="button"
          onClick={mode === "create" ? handleCreate : handleUpdate}
          disabled={pending}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? t("form.saveCreate") : t("form.saveUpdate")}
        </Button>
      </div>

      <Dialog
        open={confirmState !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("form.confirmEditTitle")}</DialogTitle>
            <DialogDescription>
              {t("form.affectedWorkoutsWarning", {
                count: confirmState?.affectedWorkoutCount ?? 0,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmState(null)}
              disabled={pending}
            >
              {tRoot("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                startTransition(async () => {
                  await actuallyApplyUpdate();
                })
              }
              disabled={pending}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {tRoot("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MuscleChips({
  selected,
  onToggle,
  disabled,
}: {
  selected: MuscleGroup[];
  onToggle: (m: MuscleGroup) => void;
  disabled: boolean;
}) {
  const tMuscles = useTranslations("muscles");
  return (
    <div className="flex flex-wrap gap-1.5">
      {MUSCLE_GROUPS.map((m) => {
        const active = selected.includes(m);
        return (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(m)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted",
              disabled && "opacity-50",
            )}
          >
            <Checkbox
              checked={active}
              className="h-3 w-3 pointer-events-none"
              tabIndex={-1}
            />
            {tMuscles(m)}
          </button>
        );
      })}
    </div>
  );
}
