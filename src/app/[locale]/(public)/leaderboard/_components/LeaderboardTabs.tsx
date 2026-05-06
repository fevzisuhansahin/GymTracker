"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LeaderboardEntry } from "@/lib/db/leaderboard";
import { cn } from "@/lib/utils";

interface Props {
  volumeData: LeaderboardEntry[];
  streakData: LeaderboardEntry[];
  bigThreeData: LeaderboardEntry[];
  currentUserId?: string;
}

type Tab = "volume" | "streak" | "bigThree";

const MEDAL = ["🥇", "🥈", "🥉"];

function RankBadge({ rank }: { rank: number }) {
  if (rank < 3) return <span className="text-xl leading-none">{MEDAL[rank]}</span>;
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {rank + 1}
    </span>
  );
}

function Avatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} className="h-8 w-8 rounded-full object-cover" />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {initials}
    </div>
  );
}

function LeaderboardList({
  entries,
  currentUserId,
  valueLabel,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  valueLabel: (v: number) => string;
}) {
  const t = useTranslations("leaderboard");

  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <ol className="space-y-1">
      {entries.map((entry, i) => {
        const isYou = entry.userId === currentUserId;
        return (
          <li
            key={entry.userId}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
              isYou
                ? "bg-primary/10 ring-1 ring-primary/30"
                : "odd:bg-muted/30 hover:bg-muted/50",
            )}
          >
            <div className="flex w-7 items-center justify-center">
              <RankBadge rank={i} />
            </div>

            <Avatar avatarUrl={entry.avatarUrl} name={entry.displayName} />

            <div className="min-w-0 flex-1">
              <Link
                href={`/u/${entry.username}`}
                className="font-medium hover:underline"
              >
                {entry.displayName}
              </Link>
              <p className="text-xs text-muted-foreground">
                @{entry.username}
                {isYou && (
                  <span className="ml-1 text-primary">· {t("youLabel")}</span>
                )}
              </p>
            </div>

            <span className="font-semibold tabular-nums">{valueLabel(entry.value)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function LeaderboardTabs({
  volumeData,
  streakData,
  bigThreeData,
  currentUserId,
}: Props) {
  const [active, setActive] = useState<Tab>("volume");
  const t = useTranslations("leaderboard");

  const tabs: { key: Tab; label: string }[] = [
    { key: "volume", label: t("tabs.volume") },
    { key: "streak", label: t("tabs.streak") },
    { key: "bigThree", label: t("tabs.bigThree") },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              active === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {active === "volume" && (
        <LeaderboardList
          entries={volumeData}
          currentUserId={currentUserId}
          valueLabel={(v) => `${v.toLocaleString()} ${t("kgUnit")}`}
        />
      )}
      {active === "streak" && (
        <LeaderboardList
          entries={streakData}
          currentUserId={currentUserId}
          valueLabel={(v) => `${v} ${t("daysUnit")}`}
        />
      )}
      {active === "bigThree" && (
        <LeaderboardList
          entries={bigThreeData}
          currentUserId={currentUserId}
          valueLabel={(v) => `${v.toLocaleString()} ${t("kgUnit")}`}
        />
      )}
    </div>
  );
}
