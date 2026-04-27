import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { GoogleButton } from "../_components/GoogleButton";
import { SignupForm } from "../_components/SignupForm";

interface PageProps {
  searchParams: Promise<{ verify?: string }>;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const { verify } = await searchParams;
  if (verify === "1") {
    return <VerifyEmailNotice />;
  }
  return <SignupView />;
}

function SignupView() {
  const t = useTranslations("auth");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("signup.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <GoogleButton />

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs uppercase text-muted-foreground">
            {t("orDivider")}
          </span>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-muted-foreground">
          {t("signup.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            {t("signup.loginLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function VerifyEmailNotice() {
  const t = useTranslations("auth.signup");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Mail className="h-6 w-6 text-primary" />
          {t("verifyTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
        <p>{t("verifyBody")}</p>
        <p>{t("verifyHint")}</p>
        <Link href="/login" className="text-foreground hover:underline">
          {t("verifyBackToLogin")}
        </Link>
      </CardContent>
    </Card>
  );
}
