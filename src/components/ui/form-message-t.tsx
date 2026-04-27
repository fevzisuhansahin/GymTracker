"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useFormField } from "@/components/ui/form";

export function FormMessageT({ className }: { className?: string }) {
  const t = useTranslations();
  const { error, formMessageId } = useFormField();
  if (!error?.message) return null;
  const raw = String(error.message);
  const text = raw.includes(".") ? safeT(t, raw) : raw;

  return (
    <p
      id={formMessageId}
      className={cn("text-destructive text-sm font-medium", className)}
    >
      {text}
    </p>
  );
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}
