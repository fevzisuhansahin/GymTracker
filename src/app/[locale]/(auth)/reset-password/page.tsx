import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "../_components/ResetPasswordForm";

export default function ResetPasswordPage() {
  const t = useTranslations("auth.resetPassword");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
