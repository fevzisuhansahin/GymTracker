import { useTranslations } from "next-intl";
import { Dumbbell } from "lucide-react";

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex items-center gap-3">
        <Dumbbell className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight">GymTracker</h1>
      </div>
      <p className="text-xl text-muted-foreground">{t("headline")}</p>
      <span className="rounded-full border px-4 py-1 text-sm text-muted-foreground">
        {t("comingSoon")}
      </span>
    </main>
  );
}
