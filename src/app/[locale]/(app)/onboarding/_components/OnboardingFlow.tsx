"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { onboardingSchema, USERNAME_REGEX } from "@/lib/schemas/profile";
import {
  checkUsernameAvailableAction,
  completeOnboardingAction,
  type OnboardingActionResult,
} from "../actions";

type Step = 0 | 1 | 2 | 3 | 4;
const TOTAL_STEPS = 5;

interface FormState {
  username: string;
  displayName: string;
  unitPreference: "kg" | "lb";
  language: "tr" | "en";
  isPublic: boolean;
}

interface Props {
  initialDisplayName: string;
  initialLanguage: "tr" | "en";
}

export function OnboardingFlow({ initialDisplayName, initialLanguage }: Props) {
  const t = useTranslations("onboarding");
  const tRoot = useTranslations();
  const locale = useLocale();

  const [step, setStep] = useState<Step>(0);
  const [data, setData] = useState<FormState>({
    username: "",
    displayName: initialDisplayName,
    unitPreference: "kg",
    language: initialLanguage,
    isPublic: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [serverState, submitAction, isSubmitting] = useActionState<OnboardingActionResult | null, FormData>(
    completeOnboardingAction,
    null,
  );
  const [, startSubmitTransition] = useTransition();

  useEffect(() => {
    if (serverState?.errorKey) toast.error(safeT(tRoot, serverState.errorKey));
    if (serverState?.fieldErrors) {
      const mapped: Partial<Record<keyof FormState, string>> = {};
      for (const [k, v] of Object.entries(serverState.fieldErrors)) {
        mapped[k as keyof FormState] = v;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrors(mapped);
      const order: (keyof FormState)[] = ["username", "displayName", "unitPreference", "language", "isPublic"];
      const idx = order.findIndex((k) => mapped[k]);
      if (idx >= 0) setStep(idx as Step);
    }
  }, [serverState, tRoot]);

  function validateCurrentStep(): boolean {
    const partials: Partial<FormState> =
      step === 0
        ? { username: data.username }
        : step === 1
        ? { displayName: data.displayName }
        : step === 2
        ? { unitPreference: data.unitPreference }
        : step === 3
        ? { language: data.language }
        : { isPublic: data.isPublic };

    const result = onboardingSchema.partial().safeParse(partials);
    if (!result.success) {
      const newErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (!newErrors[k]) newErrors[k] = issue.message;
      }
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return false;
    }
    return true;
  }

  function next() {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(4, s + 1) as Step);
  }
  function back() {
    setStep((s) => Math.max(0, s - 1) as Step);
  }

  function handleSubmit() {
    const parsed = onboardingSchema.safeParse(data);
    if (!parsed.success) {
      const newErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (!newErrors[k]) newErrors[k] = issue.message;
      }
      setErrors(newErrors);
      const order: (keyof FormState)[] = ["username", "displayName", "unitPreference", "language", "isPublic"];
      const idx = order.findIndex((k) => newErrors[k]);
      if (idx >= 0) setStep(idx as Step);
      return;
    }
    const fd = new FormData();
    fd.set("username", data.username);
    fd.set("displayName", data.displayName);
    fd.set("unitPreference", data.unitPreference);
    fd.set("language", data.language);
    fd.set("isPublic", data.isPublic ? "true" : "false");
    fd.set("locale", locale);
    startSubmitTransition(() => {
      submitAction(fd);
    });
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("progress", { current: step + 1, total: TOTAL_STEPS })}</span>
          <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
        </div>
        <Progress value={((step + 1) / TOTAL_STEPS) * 100} />
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        {step === 0 && (
          <UsernameStep
            value={data.username}
            error={errors.username}
            onChange={(v) => {
              setData((d) => ({ ...d, username: v }));
              setErrors((e) => ({ ...e, username: undefined }));
            }}
          />
        )}
        {step === 1 && (
          <DisplayNameStep
            value={data.displayName}
            error={errors.displayName}
            onChange={(v) => {
              setData((d) => ({ ...d, displayName: v }));
              setErrors((e) => ({ ...e, displayName: undefined }));
            }}
          />
        )}
        {step === 2 && (
          <UnitStep
            value={data.unitPreference}
            onChange={(v) => setData((d) => ({ ...d, unitPreference: v }))}
          />
        )}
        {step === 3 && (
          <LanguageStep
            value={data.language}
            onChange={(v) => setData((d) => ({ ...d, language: v }))}
          />
        )}
        {step === 4 && (
          <VisibilityStep
            value={data.isPublic}
            onChange={(v) => setData((d) => ({ ...d, isPublic: v }))}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          disabled={step === 0 || isSubmitting}
        >
          <ChevronLeft className="h-4 w-4" />
          {t("back")}
        </Button>

        {step < 4 ? (
          <Button type="button" onClick={next} disabled={isSubmitting}>
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("complete")}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

function UsernameStep({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("onboarding.step1");
  const tRoot = useTranslations();
  const [availability, setAvailability] = useState<
    { state: "idle" } | { state: "checking" } | { state: "ok" } | { state: "taken" } | { state: "invalid" }
  >({ state: "idle" });
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailability({ state: "idle" });
      return;
    }
    if (!USERNAME_REGEX.test(value)) {
      setAvailability({ state: "invalid" });
      return;
    }
    setAvailability({ state: "checking" });
    const handle = setTimeout(() => {
      startTransition(async () => {
        const res = await checkUsernameAvailableAction(value);
        if (res.available) setAvailability({ state: "ok" });
        else if (res.reason === "taken") setAvailability({ state: "taken" });
        else if (res.reason === "invalid") setAvailability({ state: "invalid" });
        else setAvailability({ state: "idle" });
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [value]);

  return (
    <div>
      <StepHeading title={t("title")} description={t("description")} />
      <Label htmlFor="username">{t("label")}</Label>
      <div className="relative mt-2">
        <Input
          id="username"
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          placeholder={t("placeholder")}
          className="pr-9"
        />
        <div className="absolute inset-y-0 right-2 flex items-center">
          {availability.state === "checking" && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {availability.state === "ok" && <Check className="h-4 w-4 text-emerald-500" />}
          {(availability.state === "taken" || availability.state === "invalid") && (
            <X className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("hint")}</p>
      {availability.state === "taken" && (
        <p className="mt-2 text-sm font-medium text-destructive">{t("taken")}</p>
      )}
      {error && <p className="mt-2 text-sm font-medium text-destructive">{safeT(tRoot, error)}</p>}
    </div>
  );
}

function DisplayNameStep({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("onboarding.step2");
  const tRoot = useTranslations();
  return (
    <div>
      <StepHeading title={t("title")} description={t("description")} />
      <Label htmlFor="displayName">{t("label")}</Label>
      <Input
        id="displayName"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("placeholder")}
        className="mt-2"
        maxLength={50}
      />
      {error && <p className="mt-2 text-sm font-medium text-destructive">{safeT(tRoot, error)}</p>}
    </div>
  );
}

function UnitStep({ value, onChange }: { value: "kg" | "lb"; onChange: (v: "kg" | "lb") => void }) {
  const t = useTranslations("onboarding.step3");
  return (
    <div>
      <StepHeading title={t("title")} description={t("description")} />
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as "kg" | "lb")}
        className="grid grid-cols-2 gap-3"
      >
        <UnitOption value="kg" label={t("kgLabel")} sublabel={t("kgSublabel")} selected={value === "kg"} />
        <UnitOption value="lb" label={t("lbLabel")} sublabel={t("lbSublabel")} selected={value === "lb"} />
      </RadioGroup>
    </div>
  );
}

function UnitOption({
  value,
  label,
  sublabel,
  selected,
}: {
  value: string;
  label: string;
  sublabel: string;
  selected: boolean;
}) {
  return (
    <Label
      htmlFor={`unit-${value}`}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-5 text-center transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
      )}
    >
      <RadioGroupItem value={value} id={`unit-${value}`} className="sr-only" />
      <span className="text-2xl font-bold">{label}</span>
      <span className="text-xs text-muted-foreground">{sublabel}</span>
    </Label>
  );
}

function LanguageStep({
  value,
  onChange,
}: {
  value: "tr" | "en";
  onChange: (v: "tr" | "en") => void;
}) {
  const t = useTranslations("onboarding.step4");
  return (
    <div>
      <StepHeading title={t("title")} description={t("description")} />
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as "tr" | "en")}
        className="grid grid-cols-2 gap-3"
      >
        <UnitOption value="tr" label={t("tr")} sublabel="Türkçe" selected={value === "tr"} />
        <UnitOption value="en" label={t("en")} sublabel="English" selected={value === "en"} />
      </RadioGroup>
    </div>
  );
}

function VisibilityStep({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const t = useTranslations("onboarding.step5");
  return (
    <div>
      <StepHeading title={t("title")} description={t("description")} />
      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
            value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
          )}
        >
          <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <div className="font-semibold">{t("publicTitle")}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t("publicDesc")}</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
            !value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
          )}
        >
          <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
          <div className="flex-1">
            <div className="font-semibold">{t("privateTitle")}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t("privateDesc")}</div>
          </div>
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("changeHint")}</p>
    </div>
  );
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}
