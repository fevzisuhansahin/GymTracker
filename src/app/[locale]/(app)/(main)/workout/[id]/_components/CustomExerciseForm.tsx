"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminExerciseSchema,
  EQUIPMENT_TYPES,
  type EquipmentType,
} from "@/lib/schemas/exercise";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/schemas/split";
import { createCustomExerciseAndAddToWorkoutAction } from "../../actions";

interface Props {
  workoutId: string;
  onCreated: () => void;
  isAdmin: boolean;
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

export function CustomExerciseForm({ workoutId, onCreated, isAdmin }: Props) {
  const t = useTranslations("workouts.selector");
  const tRoot = useTranslations();
  const tMuscles = useTranslations("muscles");
  const tEquipment = useTranslations("equipment");

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [primary, setPrimary] = useState<MuscleGroup>("chest");
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType>("barbell");
  const [pending, startTransition] = useTransition();

  function toggleSecondary(muscle: MuscleGroup) {
    setSecondaryMuscles((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle],
    );
  }

  function handleSubmit() {
    const parsed = adminExerciseSchema.safeParse({
      name,
      primaryMuscle: primary,
      equipment,
      nameEn: isAdmin && nameEn.trim() ? nameEn.trim() : undefined,
      secondaryMuscles:
        isAdmin && secondaryMuscles.length > 0 ? secondaryMuscles : undefined,
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
      {/* Türkçe isim */}
      <div>
        <Label htmlFor="custom-name">
          {isAdmin ? t("newNameTr") : t("newName")}
        </Label>
        <Input
          id="custom-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoFocus
          className="mt-1"
        />
      </div>

      {/* İngilizce isim — sadece admin */}
      {isAdmin && (
        <div>
          <Label htmlFor="custom-name-en">
            {t("newNameEn")}{" "}
            <span className="text-xs text-muted-foreground">
              ({t("optional")})
            </span>
          </Label>
          <Input
            id="custom-name-en"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            maxLength={80}
            className="mt-1"
          />
        </div>
      )}

      {/* Birincil kas grubu */}
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

      {/* İkincil kas grupları — sadece admin */}
      {isAdmin && (
        <div>
          <Label>
            {t("newSecondaryMuscles")}{" "}
            <span className="text-xs text-muted-foreground">
              ({t("optional")})
            </span>
          </Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {MUSCLE_GROUPS.filter((m) => m !== primary).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleSecondary(m)}
                className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted"
              >
                <Checkbox
                  checked={secondaryMuscles.includes(m)}
                  className="pointer-events-none h-3.5 w-3.5"
                />
                {tMuscles(m)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ekipman */}
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
