"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CustomExerciseForm } from "../../workout/[id]/_components/CustomExerciseForm";
import { createSystemExerciseAction } from "../actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminExerciseSheet({ open, onOpenChange }: Props) {
  const t = useTranslations("exercises");
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-hidden">
        <SheetHeader>
          <SheetTitle>{t("adminSheetTitle")}</SheetTitle>
        </SheetHeader>
        {open && (
          <SheetBody>
            <CustomExerciseForm
              isAdmin={true}
              submitFn={createSystemExerciseAction}
              onCreated={() => {
                onOpenChange(false);
                router.refresh();
              }}
            />
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}
