export const revalidate = 300; // 5 dakika cache

import { getTranslations } from "next-intl/server";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";
import {
  getVolumeLeaderboard,
  getStreakLeaderboard,
  getBigThreeLeaderboard,
} from "@/lib/db/leaderboard";
import { Container } from "@/components/layout/Container";
import { LeaderboardTabs } from "./_components/LeaderboardTabs";

export default async function LeaderboardPage() {
  const t = await getTranslations("leaderboard");

  const [session, volumeData, streakData, bigThreeData] = await Promise.all([
    getCurrentUserWithProfile(),
    getVolumeLeaderboard(),
    getStreakLeaderboard(),
    getBigThreeLeaderboard(),
  ]);

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <LeaderboardTabs
          volumeData={volumeData}
          streakData={streakData}
          bigThreeData={bigThreeData}
          currentUserId={session?.userId}
        />
      </div>
    </Container>
  );
}
