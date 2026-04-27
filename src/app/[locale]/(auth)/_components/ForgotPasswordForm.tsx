"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { FormMessageT } from "@/components/ui/form-message-t";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas/auth";
import { forgotPasswordAction, type ActionResult } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.forgotPassword");
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tRoot = useTranslations();
  const locale = useLocale();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(forgotPasswordAction, null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (state?.errorKey) toast.error(safeT(tRoot, state.errorKey));
    if (state?.fieldErrors) {
      for (const [key, val] of Object.entries(state.fieldErrors)) {
        form.setError(key as keyof ForgotPasswordInput, { message: val });
      }
    }
  }, [state, tRoot, form]);

  if (state?.ok) {
    return (
      <p className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t("forgotPassword.successMessage")}
      </p>
    );
  }

  return (
    <Form {...form}>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("emailLabel")}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder={t("emailPlaceholder")} {...field} />
              </FormControl>
              <FormMessageT />
            </FormItem>
          )}
        />

        <SubmitButton />
      </form>
    </Form>
  );
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}
