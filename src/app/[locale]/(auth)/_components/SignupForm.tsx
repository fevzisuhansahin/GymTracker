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
import { useRouter } from "@/i18n/navigation";
import { signupSchema, type SignupInput } from "@/lib/schemas/auth";
import { signupAction, type ActionResult } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth");
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t("signup.submitting") : t("signup.submit")}
    </Button>
  );
}

export function SignupForm() {
  const t = useTranslations("auth");
  const tRoot = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(signupAction, null);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (state?.errorKey) toast.error(safeT(tRoot, state.errorKey));
    if (state?.fieldErrors) {
      for (const [key, val] of Object.entries(state.fieldErrors)) {
        form.setError(key as keyof SignupInput, { message: val });
      }
    }
    if (state?.ok && state.redirectTo) {
      router.push("/signup?verify=1");
    }
  }, [state, tRoot, form, router]);

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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("passwordLabel")}</FormLabel>
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
