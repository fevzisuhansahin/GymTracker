import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { GoogleButton } from "../_components/GoogleButton";
import { LoginForm } from "../_components/LoginForm";

export default function LoginPage() {
  const t = useTranslations("auth");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <GoogleButton />

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs uppercase text-muted-foreground">
            {t("orDivider")}
          </span>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-muted-foreground">
          {t("login.noAccount")}{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            {t("login.signupLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
