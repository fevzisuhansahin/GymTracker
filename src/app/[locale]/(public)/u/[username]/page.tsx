import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { format } from "date-fns";
import { tr as trLocale, enUS } from "date-fns/locale";
import { Calendar, Dumbbell, Flame, Trophy, Lock, AlertCircle } from "lucide-react";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";
import { getProfileByUsername, getPublicStats, getBigThreePRs } from "@/lib/db/profiles";
import { getWorkoutHistory } from "@/lib/db/workouts";
import { Container } from "@/components/layout/Container";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ username: string; locale: string }>;
}

function InitialsAvatar({ name, size = "lg" }: { name: string; size?: "sm" | "lg" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const cls =
    size === "lg"
      ? "h-20 w-20 rounded-full bg-primary/10 text-primary text-2xl font-bold flex items-center justify-center"
      : "h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center";

  return <div className={cls}>{initials}</div>;
}

function formatVolume(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)}k`;
  return kg.toLocaleString();
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}s ${m % 60}dk`;
  return `${m}dk`;
}

export default async function PublicProfilePage({ params }: Props) {
  const { username, locale } = await params;
  const t = await getTranslations("profile");

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const session = await getCurrentUserWithProfile();
  const isOwner = session?.userId === profile.id;

  if (!profile.is_public && !isOwner) notFound();

  const dateFnsLocale = locale === "tr" ? trLocale : enUS;
  const memberSince = format(new Date(profile.created_at), "MMMM yyyy", {
    locale: dateFnsLocale,
  });

  if (!profile.is_public && isOwner) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-md text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold">@{profile.username}</h1>
          <p className="mb-6 text-muted-foreground">{t("privateProfileOwner")}</p>
          <Link
            href="/settings"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            {t("settingsLink")}
          </Link>
        </div>
      </Container>
    );
  }

  const [stats, bigThree, recentWorkouts] = await Promise.all([
    getPublicStats(profile.id),
    getBigThreePRs(profile.id),
    getWorkoutHistory(profile.id, 0, 10),
  ]);

  const hasBigThree = bigThree.squat || bigThree.benchPress || bigThree.deadlift;

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <InitialsAvatar name={profile.display_name} />
          )}
          <div>
            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {t("memberSince", { date: memberSince })}
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <Dumbbell className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-xl font-bold">{stats.totalWorkouts}</p>
              <p className="text-xs text-muted-foreground">
                {t("stats.workouts", { count: stats.totalWorkouts })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <Trophy className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-xl font-bold">{formatVolume(stats.totalVolumeKg)}</p>
              <p className="text-xs text-muted-foreground">
                {t("stats.volume", { value: formatVolume(stats.totalVolumeKg) })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <Flame className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-xl font-bold">{stats.currentStreak}</p>
              <p className="text-xs text-muted-foreground">
                {t("stats.streak", { count: stats.currentStreak })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Big Three PRs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("bigThreeTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {hasBigThree ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Squat</p>
                  <p className="text-xl font-bold">
                    {bigThree.squat !== null ? `${bigThree.squat} kg` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bench</p>
                  <p className="text-xl font-bold">
                    {bigThree.benchPress !== null ? `${bigThree.benchPress} kg` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Deadlift</p>
                  <p className="text-xl font-bold">
                    {bigThree.deadlift !== null ? `${bigThree.deadlift} kg` : "—"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("bigThreeEmpty")}</p>
            )}
          </CardContent>
        </Card>

        {/* Recent workouts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recentTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentWorkouts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                {t("recentEmpty")}
              </div>
            ) : (
              recentWorkouts.map((w) => {
                const dateLabel = format(new Date(w.date), "d MMM yyyy", {
                  locale: dateFnsLocale,
                });
                const dayName = w.splitDayName
                  ? w.splitDayName
                  : w.hasCardio && !w.hasExercises
                    ? t("cardioWorkout")
                    : t("freeWorkout");

                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm odd:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{dateLabel}</span>
                      <span className="font-medium">{dayName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {w.hasExercises && (
                        <span>{Math.round(w.totalVolumeKg).toLocaleString()} kg</span>
                      )}
                      {w.durationSeconds && (
                        <Badge variant="secondary" className="text-xs">
                          {formatDuration(w.durationSeconds)}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
