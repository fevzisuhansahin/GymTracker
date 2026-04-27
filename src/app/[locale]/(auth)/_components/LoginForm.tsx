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
import { Link } from "@/i18n/navigation";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { loginAction, type ActionResult } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth");
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t("login.submitting") : t("login.submit")}
    </Button>
  );
}

export function LoginForm() {
  const t = useTranslations("auth");
  const tRoot = useTranslations();
  const locale = useLocale();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(loginAction, null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (state?.errorKey) {
      toast.error(safeT(tRoot, state.errorKey));
    }
    if (state?.fieldErrors) {
      for (const [key, val] of Object.entries(state.fieldErrors)) {
        form.setError(key as keyof LoginInput, { message: val });
      }
    }
  }, [state, tRoot, form]);

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
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessageT />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>{t("passwordLabel")}</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
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
