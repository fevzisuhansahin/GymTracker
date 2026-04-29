import { redirect } from "@/i18n/navigation";
import { Container } from "@/components/layout/Container";
import { getWorkoutHistory } from "@/lib/db/workouts";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

import { WorkoutHistoryClient } from "./_components/WorkoutHistoryClient";

const PAGE_SIZE = 20;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HistoryPage({ params }: PageProps) {
  const { locale } = await params;

  const session = await getCurrentUserWithProfile();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const items = await getWorkoutHistory(session.userId, 0, PAGE_SIZE);

  return (
    <Container className="py-6 pb-24">
      <WorkoutHistoryClient
        initialItems={items}
        pageSize={PAGE_SIZE}
        hasMore={items.length === PAGE_SIZE}
      />
    </Container>
  );
}
