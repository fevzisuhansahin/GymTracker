"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customExerciseSchema, EQUIPMENT_TYPES } from "@/lib/schemas/exercise";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/schemas/split";
import type { EquipmentType } from "@/lib/schemas/exercise";
import { createCustomExerciseAndAddToWorkoutAction } from "../../actions";

interface Props {
  workoutId: string;
  onCreated: () => void;
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

export function CustomExerciseForm({ workoutId, onCreated }: Props) {
  const t = useTranslations("workouts.selector");
  const tRoot = useTranslations();
  const tMuscles = useTranslations("muscles");
  const tEquipment = useTranslations("equipment");

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState<MuscleGroup>("chest");
  const [equipment, setEquipment] = useState<EquipmentType>("barbell");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    const parsed = customExerciseSchema.safeParse({
      name,
      primaryMuscle: primary,
      equipment,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      if (first) toast.error(safeT(tRoot, first.message));
      return;
    }

    startTransition(async () => {
      const res = await createCustomExerciseAndAddToWorkoutAction({
        workoutId,
        exercise: parsed.data,
      });
      if (res.ok) {
        onCreated();
      } else if (res.fieldErrors) {
        const first = Object.values(res.fieldErrors)[0];
        if (first) toast.error(safeT(tRoot, first));
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "exercises.errors.generic"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="custom-name">{t("newName")}</Label>
        <Input
          id="custom-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoFocus
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="custom-primary">{t("newPrimary")}</Label>
        <Select
          value={primary}
          onValueChange={(v) => setPrimary(v as MuscleGroup)}
        >
          <SelectTrigger id="custom-primary" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MUSCLE_GROUPS.map((m) => (
              <SelectItem key={m} value={m}>
                {tMuscles(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="custom-equipment">{t("newEquipment")}</Label>
        <Select
          value={equipment}
          onValueChange={(v) => setEquipment(v as EquipmentType)}
        >
          <SelectTrigger id="custom-equipment" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EQUIPMENT_TYPES.map((e) => (
              <SelectItem key={e} value={e}>
                {tEquipment(e)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSubmit} disabled={pending} className="mt-2 w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? t("newSubmitting") : t("newSubmit")}
      </Button>
    </div>
  );
}
