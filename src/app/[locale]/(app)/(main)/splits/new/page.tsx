import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/Container";
import { SplitFormClient } from "../_components/SplitFormClient";

export default function NewSplitPage() {
  return (
    <Container className="py-6 pb-32">
      <NewSplitHeader />
      <div className="mt-6">
        <SplitFormClient mode="create" />
      </div>
    </Container>
  );
}

function NewSplitHeader() {
  const t = useTranslations("splits");
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight">{t("form.newTitle")}</h1>
    </header>
  );
}
