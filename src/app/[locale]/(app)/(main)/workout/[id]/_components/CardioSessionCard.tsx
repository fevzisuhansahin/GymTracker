"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bike, Edit2, Loader2, MoreVertical, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { deleteCardioSessionAction } from "../../actions";
import { CardioForm } from "./CardioForm";

export interface CardioSessionData {
  id: string;
  machineType: string;
  durationSeconds: number;
  distanceKm: number | null;
  avgSpeed: number | null;
  inclinePercent: number | null;
  resistanceLevel: number | null;
  calories: number | null;
  avgHeartRate: number | null;
  notes: string | null;
  orderIndex: number;
}

interface Props {
  workoutId: string;
  data: CardioSessionData;
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

export function formatCardioTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}s ${m}d ${s}sn`;
  if (s === 0) return `${m}dk`;
  return `${m}dk ${s}sn`;
}

export function CardioSessionCard({ workoutId, data }: Props) {
  const t = useTranslations("cardio");
  const tRoot = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteCardioSessionAction(data.id);
      if (res.ok) {
        setConfirmDelete(false);
        router.refresh();
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
      }
    });
  }

  return (
    <>
      <article className="rounded-lg border bg-card p-4">
        <header className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Bike className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{safeT(t, `machines.${data.machineType}`)}</h3>
              <Badge variant="muted" className="mt-1">
                {t("label")}
              </Badge>
            </div>
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
                  onClick={() => setEditOpen(true)}
                  className="cursor-pointer"
                >
                  <Edit2 className="h-4 w-4" />
                  {tRoot("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setConfirmDelete(true)}
                  className="cursor-pointer text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {tRoot("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <Metric label={t("fields.duration")} value={formatCardioTime(data.durationSeconds)} />
          {data.distanceKm != null && (
            <Metric label={t("fields.distance")} value={`${data.distanceKm} km`} />
          )}
          {data.avgSpeed != null && (
            <Metric label={t("fields.speed")} value={`${data.avgSpeed} km/h`} />
          )}
          {data.inclinePercent != null && (
            <Metric label={t("fields.incline")} value={`${data.inclinePercent}%`} />
          )}
          {data.resistanceLevel != null && (
            <Metric label={t("fields.resistance")} value={String(data.resistanceLevel)} />
          )}
          {data.calories != null && (
            <Metric label={t("fields.calories")} value={`${data.calories} kcal`} />
          )}
        </div>

        {data.notes && (
          <p className="mt-3 text-xs text-muted-foreground border-t pt-2">{data.notes}</p>
        )}
      </article>

      <CardioForm
        workoutId={workoutId}
        open={editOpen}
        onOpenChange={setEditOpen}
        editingSession={data}
        onSaved={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />

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
              {tRoot("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
