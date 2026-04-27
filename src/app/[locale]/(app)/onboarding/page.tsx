import { Dumbbell } from "lucide-react";
import { OnboardingFlow } from "./_components/OnboardingFlow";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function OnboardingPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await getCurrentUserWithProfile();
  // Layout already redirects unauth/onboarded users; this is a defensive fallback.
  const initialDisplayName = session?.profile?.display_name ?? "";
  const initialLanguage = locale === "en" ? "en" : "tr";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <Dumbbell className="h-7 w-7 text-primary" />
        <span className="text-xl font-bold tracking-tight">GymTracker</span>
      </div>
      <OnboardingFlow
        initialDisplayName={initialDisplayName}
        initialLanguage={initialLanguage}
      />
    </main>
  );
}
