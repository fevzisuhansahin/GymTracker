import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

interface AppLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { locale } = await params;
  const session = await getCurrentUserWithProfile();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const isOnboarding = pathname.includes("/onboarding");
  const onboardingDone = session.profile?.onboarding_completed === true;

  if (!onboardingDone && !isOnboarding) {
    redirect(`/${locale}/onboarding`);
  }
  if (onboardingDone && isOnboarding) {
    redirect(`/${locale}/dashboard`);
  }

  return <>{children}</>;
}
