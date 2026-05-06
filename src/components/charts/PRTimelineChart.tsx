"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { formatWeight, fromKg, type WeightUnit } from "@/lib/calculations/units";
import type { PRRecord } from "@/lib/db/prs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChartPoint {
  date: string;
  value: number; // already converted to user unit
  workoutId: string | null;
  deltaKg: number | null; // raw kg delta vs previous PR
}

interface Props {
  prs: PRRecord[]; // ascending by achievedAt (oldest first)
  unit: WeightUnit;
  locale: string;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------
interface TooltipPayloadItem {
  payload?: ChartPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  unit: WeightUnit;
}

function PRTooltip({ active, payload, label, unit }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const delta = point.deltaKg;
  const deltaConverted =
    delta != null ? Math.round(fromKg(Math.abs(delta), unit) * 10) / 10 : null;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
        padding: "0.5rem 0.75rem",
        fontSize: "12px",
        color: "var(--card-foreground)",
      }}
    >
      <p style={{ color: "var(--muted-foreground)", marginBottom: 2 }}>
        {label ? new Date(label).toLocaleDateString() : ""}
      </p>
      <p style={{ fontWeight: 500 }}>
        {formatWeight(point.value, unit)} {unit}
      </p>
      {deltaConverted != null && delta != null && (
        <p style={{ color: delta >= 0 ? "var(--foreground)" : "var(--destructive)", marginTop: 2 }}>
          {delta >= 0 ? "+" : "-"}{deltaConverted} {unit}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function PRTimelineChart({ prs, unit, locale }: Props) {
  const t = useTranslations("prs");
  const router = useRouter();

  const chartData: ChartPoint[] = useMemo(
    () =>
      prs.map((pr, i) => {
        const prev = i > 0 ? prs[i - 1] : null;
        return {
          date: pr.achievedAt.slice(0, 10),
          value: Math.round(fromKg(pr.value, unit) * 100) / 100,
          workoutId: pr.workoutId,
          deltaKg: prev != null ? Math.round((pr.value - prev.value) * 100) / 100 : null,
        };
      }),
    [prs, unit],
  );

  // --- Empty state ---
  if (prs.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/30">
        <p className="text-sm text-muted-foreground">{t("noRecords")}</p>
      </div>
    );
  }

  // --- Single PR: no chart, just a label ---
  if (prs.length === 1) {
    const onlyPR = prs[0]!;
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{t("firstPR")}</p>
          <p className="mt-1 text-xl font-bold">
            {formatWeight(onlyPR.value, unit)}{" "}
            <span className="text-sm font-normal text-muted-foreground">{unit}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[800px]">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) => {
              const date = new Date(d);
              return `${date.getDate()}/${date.getMonth() + 1}`;
            }}
            minTickGap={30}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => formatWeight(v, unit)}
          />
          <Tooltip content={<PRTooltip unit={unit} />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
            activeDot={{
              r: 6,
              fill: "var(--primary)",
              style: { cursor: "pointer" },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick: (_e: unknown, payload: any) => {
                const wid = (payload?.payload as ChartPoint | undefined)?.workoutId;
                if (wid) router.push(`/${locale}/workout/${wid}`);
              },
            }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
