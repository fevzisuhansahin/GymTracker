import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { ForgotPasswordForm } from "../_components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <ForgotPasswordForm />
        <Link
          href="/login"
          className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {t("backToLogin")}
        </Link>
      </CardContent>
    </Card>
  );
}
