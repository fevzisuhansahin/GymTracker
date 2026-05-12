"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Loader2, MoreVertical, Plus, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { type WeightUnit } from "@/lib/calculations/units";
import {
  removeExerciseFromWorkoutAction,
  updateExerciseNotesAction,
  reorderExerciseAction,
} from "../../actions";

import { SetRow, type SetRowInitial } from "./SetRow";

export interface ExerciseCardData {
  id: string; // workout_exercise_id
  orderIndex: number;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    equipment: string | null;
  };
  sets: SetRowInitial[];
}

interface FlushRegistry {
  register: (id: string, fn: () => Promise<void>) => void;
  unregister: (id: string) => void;
  flushAll: () => Promise<void>;
}

interface Props {
  data: ExerciseCardData;
  unitPreference: WeightUnit;
  flushRegistry: FlushRegistry;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSetComplete?: () => void;
}

const PLACEHOLDER_COUNT = 3;

interface PlaceholderSlot {
  /** Stable React key — never changes after creation. */
  slotKey: string;
  /** Set once the row is persisted for the first time. */
  materializedId: string | null;
  /**
   * true  = created by the user clicking "+ Add Set" after initial mount.
   * false = created at mount because data.sets was empty at that moment.
   *
   * When data.sets later becomes non-empty (pre-fill arrived via a subsequent
   * router.refresh() during a React concurrent transition), we must suppress
   * the initial unmaterialized slots so they don't stack on top of the real
   * server rows and cause duplicate INSERTs.
   */
  isUserAdded: boolean;
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

export function ExerciseCard({
  data,
  unitPreference,
  flushRegistry,
  canMoveUp,
  canMoveDown,
  onSetComplete,
}: Props) {
  const t = useTranslations("workouts.editor");
  const tRoot = useTranslations();
  const tEquipment = useTranslations("equipment");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showNotes, setShowNotes] = useState<boolean>(
    Boolean(data.notes && data.notes.trim().length > 0),
  );

  // Each entry is a placeholder slot that may later be "materialized" once
  // the first save returns a real setId.  The slotKey is stable so React
  // never unmounts the row during that transition.
  const slotKeyRef = useRef(0);
  // If the server already provided pre-filled sets (copied from the last
  // workout), start with 0 empty slots — the user sees real data immediately.
  // Otherwise fall back to PLACEHOLDER_COUNT empty rows.
  const [slots, setSlots] = useState<PlaceholderSlot[]>(() =>
    Array.from(
      { length: data.sets.length > 0 ? 0 : PLACEHOLDER_COUNT },
      (_, i) => ({ slotKey: `s-${data.id}-${i}`, materializedId: null, isUserAdded: false }),
    ),
  );

  // Derive visible placeholder slots without setState-in-effect.
  //
  // Two pruning rules:
  //   1. A materialized slot whose realSetId is now in data.sets has been
  //      confirmed by the server → hide it (server row will render instead).
  //   2. An unmaterialized slot that was created at initial mount
  //      (isUserAdded=false) should be hidden once data.sets becomes non-empty.
  //      This fixes the concurrent-transition race: React may render the card
  //      briefly with data.sets=[] (creating 3 phantom slots), then re-render
  //      with the pre-fill sets.  Without this rule those phantom slots survive
  //      and the user ends up with duplicate INSERTs on top of the pre-fill rows.
  const visibleSlots = useMemo(() => {
    const serverIds = new Set(data.sets.map((s) => s.id));
    return slots.filter((slot) => {
      if (slot.materializedId) return !serverIds.has(slot.materializedId);
      // Unmaterialized slot: suppress pre-mount phantom slots once server sets exist.
      if (!slot.isUserAdded && data.sets.length > 0) return false;
      return true;
    });
  }, [slots, data.sets]);

  const totalRows = data.sets.length + visibleSlots.length;

  function handleRemove() {
    startTransition(async () => {
      const res = await removeExerciseFromWorkoutAction(data.id);
      if (res.ok) {
        setConfirmRemove(false);
        router.refresh();
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
      }
    });
  }

  function handleMoveUp() {
    startTransition(async () => {
      const res = await reorderExerciseAction(data.id, "up");
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
      }
    });
  }

  function handleMoveDown() {
    startTransition(async () => {
      const res = await reorderExerciseAction(data.id, "down");
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
      }
    });
  }

  function addSet() {
    slotKeyRef.current += 1;
    const key = `s-${data.id}-added-${slotKeyRef.current}`;
    setSlots((s) => [...s, { slotKey: key, materializedId: null, isUserAdded: true }]);
  }

  return (
    <article className="rounded-lg border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{data.exercise.name}</h3>
          {data.exercise.equipment && (
            <Badge variant="muted" className="mt-1">
              {tEquipment(data.exercise.equipment as never)}
            </Badge>
          )}
        </div>
        {/* Reorder buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleMoveUp}
            disabled={!canMoveUp || pending}
            aria-label={tRoot("common.moveUp")}
            className="h-7 w-7 text-muted-foreground"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleMoveDown}
            disabled={!canMoveDown || pending}
            aria-label={tRoot("common.moveDown")}
            className="h-7 w-7 text-muted-foreground"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={tRoot("common.edit")}
              />
            }
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => setShowNotes((v) => !v)}
                className="cursor-pointer"
              >
                <StickyNote className="h-4 w-4" />
                {showNotes ? t("hideNotes") : t("showNotes")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmRemove(true)}
                className="cursor-pointer text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {t("removeExercise")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {showNotes && (
        <div className="mt-3">
          <NotesField
            workoutExerciseId={data.id}
            initial={data.notes ?? ""}
          />
        </div>
      )}

      <ol className="mt-3 flex flex-col gap-2">
        {data.sets.map((s, displayIdx) => (
          <SetRow
            key={s.id}
            workoutExerciseId={data.id}
            displayIndex={displayIdx + 1}
            initial={s}
            initialSetId={s.id}
            unitPreference={unitPreference}
            flushRegistry={flushRegistry}
            onSetComplete={onSetComplete}
            onMaterialized={() => {
              // already-saved row, nothing to do
            }}
            onDeleted={() => startTransition(() => { router.refresh(); })}
          />
        ))}
        {visibleSlots.map((slot, i) => {
          const displayIdx = data.sets.length + i + 1;
          return (
            <SetRow
              key={slot.slotKey}
              workoutExerciseId={data.id}
              displayIndex={displayIdx}
              initial={null}
              unitPreference={unitPreference}
              flushRegistry={flushRegistry}
              onSetComplete={onSetComplete}
              onMaterialized={(realSetId) => {
                // Mark this slot with the real setId so the cleanup effect
                // can prune it after the next router.refresh().
                // The slotKey stays the same → no unmount, no flicker.
                setSlots((s) =>
                  s.map((sl) =>
                    sl.slotKey === slot.slotKey
                      ? { ...sl, materializedId: realSetId }
                      : sl,
                  ),
                );
              }}
              onDeleted={() => {
                setSlots((s) => s.filter((sl) => sl.slotKey !== slot.slotKey));
              }}
            />
          );
        })}
      </ol>

      <div className="mt-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={addSet}
          disabled={pending || totalRows >= 20}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("addSet")}
        </Button>
      </div>

      <Dialog
        open={confirmRemove}
        onOpenChange={(open) => {
          if (!open) setConfirmRemove(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeExerciseConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("removeExerciseConfirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemove(false)}
              disabled={pending}
            >
              {tRoot("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={pending}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {tRoot("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function NotesField({
  workoutExerciseId,
  initial,
}: {
  workoutExerciseId: string;
  initial: string;
}) {
  const t = useTranslations("workouts.editor");
  const tRoot = useTranslations();
  const [value, setValue] = useState(initial);
  const lastSavedRef = useRef<string>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (value === lastSavedRef.current) return;
    const next = value.trim() === "" ? null : value;
    const res = await updateExerciseNotesAction({
      workoutExerciseId,
      notes: next,
    });
    if (res.ok) {
      lastSavedRef.current = value;
    } else {
      toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
    }
  }

  function schedule(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div>
      <label className="text-xs font-medium">{t("exerciseNotes")}</label>
      <Textarea
        value={value}
        onChange={(e) => schedule(e.target.value)}
        onBlur={() => void flush()}
        placeholder={t("exerciseNotesPlaceholder")}
        maxLength={500}
        className="mt-1 min-h-[60px]"
      />
    </div>
  );
}
