import { ChevronRight, Trophy } from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";

import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { Link, redirect } from "@/i18n/navigation";
import { getAllPRs, type AllPRRecord } from "@/lib/db/prs";
import { formatWeight, type WeightUnit } from "@/lib/calculations/units";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

interface PageProps {
  params: Promise<{ locale: string }>;
}

// ---------------------------------------------------------------------------
// Big Three detection (substring match, case-insensitive)
// ---------------------------------------------------------------------------
type BigThreeKey = "squat" | "bench" | "deadlift";

function detectBigThree(name: string): BigThreeKey | null {
  const lower = name.toLowerCase();
  if (lower.includes("deadlift")) return "deadlift";
  if (lower.includes("bench")) return "bench";
  if (lower.includes("squat")) return "squat";
  return null;
}

interface BigThreeMap {
  squat: AllPRRecord | null;
  bench: AllPRRecord | null;
  deadlift: AllPRRecord | null;
}

function buildBigThreeMap(prs: AllPRRecord[]): BigThreeMap {
  const result: BigThreeMap = { squat: null, bench: null, deadlift: null };
  for (const pr of prs) {
    const key = detectBigThree(pr.exerciseName);
    if (!key) continue;
    // prs are already value DESC — first match wins (highest value per category)
    if (!result[key]) result[key] = pr;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function AllPRsPage({ params }: PageProps) {
  const { locale } = await params;

  const session = await getCurrentUserWithProfile();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const unit: WeightUnit = session.profile?.unit_preference === "lb" ? "lb" : "kg";
  const prs = await getAllPRs(session.userId);

  return (
    <Container className="py-6 pb-24">
      <AllPRsContent prs={prs} unit={unit} />
    </Container>
  );
}

// ---------------------------------------------------------------------------
// Content (pure render function — no "use client" needed)
// ---------------------------------------------------------------------------
function AllPRsContent({
  prs,
  unit,
}: {
  prs: AllPRRecord[];
  unit: WeightUnit;
}) {
  const t = useTranslations("prs");

  const bigThree = buildBigThreeMap(prs);
  const bigThreeIds = new Set(
    Object.values(bigThree)
      .filter(Boolean)
      .map((r) => r!.exerciseId),
  );
  const restPRs = prs.filter((pr) => !bigThreeIds.has(pr.exerciseId));

  const hasBigThree = Object.values(bigThree).some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-bold tracking-tight">{t("allPRs")}</h1>
      </header>

      {prs.length === 0 && (
        <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {t("noPRs")}
        </p>
      )}

      {/* Big Three */}
      {hasBigThree && (
        <section>
          <SectionTitle title={t("bigThree")} />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BigThreeCard label="Squat" record={bigThree.squat} unit={unit} />
            <BigThreeCard label="Bench" record={bigThree.bench} unit={unit} />
            <BigThreeCard
              label="Deadlift"
              record={bigThree.deadlift}
              unit={unit}
            />
          </div>
        </section>
      )}

      {/* All other PRs */}
      {restPRs.length > 0 && (
        <section>
          <SectionTitle title={t("allPRs")} />
          <ul className="mt-3 flex flex-col gap-2">
            {restPRs.map((pr) => (
              <PRListItem key={pr.exerciseId} pr={pr} unit={unit} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="border-b pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </h2>
  );
}

function BigThreeCard({
  label,
  record,
  unit,
}: {
  label: string;
  record: AllPRRecord | null;
  unit: WeightUnit;
}) {
  const t = useTranslations("prs");
  const fmt = useFormatter();

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {record ? (
        <>
          <Link
            href={`/exercises/${record.exerciseId}`}
            className="mt-0.5 block truncate text-sm font-medium hover:underline"
          >
            {record.exerciseName}
          </Link>
          <p className="mt-2 text-2xl font-bold">
            {formatWeight(record.value, unit)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {t("achievedOn", {
              date: fmt.dateTime(new Date(record.achievedAt), {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            })}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

function PRListItem({ pr, unit }: { pr: AllPRRecord; unit: WeightUnit }) {
  const t = useTranslations("prs");
  const fmt = useFormatter();

  return (
    <li>
      <Link
        href={`/exercises/${pr.exerciseId}`}
        className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40 active:bg-muted/60"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{pr.exerciseName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("achievedOn", {
              date: fmt.dateTime(new Date(pr.achievedAt), {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline">
            {formatWeight(pr.value, unit)} {unit}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
}
