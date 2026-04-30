import { useTranslations } from "next-intl";
import { BarChart2, Bike, Dumbbell, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Dumbbell className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold tracking-tight">GymTracker</span>
        </div>

        <div className="max-w-sm">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            {t("headline")}{" "}
            <span className="text-primary">{t("headlineBold")}</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground">{t("subheadline")}</p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3 sm:flex-row sm:max-w-sm">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "lg" }), "flex-1")}
          >
            {t("signUp")}
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }), "flex-1")}
          >
            {t("logIn")}
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t bg-muted/30 px-6 py-12">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-4">
          <FeatureCard
            icon={<Dumbbell className="h-5 w-5" />}
            title={t("feature1Title")}
            description={t("feature1Desc")}
          />
          <FeatureCard
            icon={<BarChart2 className="h-5 w-5" />}
            title={t("feature2Title")}
            description={t("feature2Desc")}
            badge={t("feature2Soon")}
          />
          <FeatureCard
            icon={<Bike className="h-5 w-5" />}
            title={t("feature3Title")}
            description={t("feature3Desc")}
          />
          <FeatureCard
            icon={<Users className="h-5 w-5" />}
            title={t("feature4Title")}
            description={t("feature4Desc")}
            badge={t("feature4Soon")}
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        {badge && (
          <Badge variant="muted" className="text-[10px]">
            {badge}
          </Badge>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
