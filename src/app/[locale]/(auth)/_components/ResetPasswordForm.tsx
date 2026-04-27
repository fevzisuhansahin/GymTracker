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
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas/auth";
import { resetPasswordAction, type ActionResult } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.resetPassword");
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tRoot = useTranslations();
  const locale = useLocale();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(resetPasswordAction, null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (state?.errorKey) toast.error(safeT(tRoot, state.errorKey));
    if (state?.fieldErrors) {
      for (const [key, val] of Object.entries(state.fieldErrors)) {
        form.setError(key as keyof ResetPasswordInput, { message: val });
      }
    }
  }, [state, tRoot, form]);

  return (
    <Form {...form}>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("resetPassword.newPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">{t("signup.passwordHint")}</p>
              <FormMessageT />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("signup.confirmPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
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
