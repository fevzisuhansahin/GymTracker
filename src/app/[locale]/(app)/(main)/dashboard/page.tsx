import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/layout/Container";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

export default async function DashboardPage() {
  const session = await getCurrentUserWithProfile();
  const displayName = session?.profile?.display_name ?? "";

  return (
    <Container className="py-8">
      <DashboardContent displayName={displayName} />
    </Container>
  );
}

function DashboardContent({ displayName }: { displayName: string }) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">{t("greetingPrefix")}</p>
        <h1 className="text-3xl font-bold tracking-tight">{t("welcome", { name: displayName })}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("startTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="w-full sm:w-auto" disabled>
            <Plus className="h-5 w-5" />
            {t("newWorkout")}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">{t("comingSoonNote")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
