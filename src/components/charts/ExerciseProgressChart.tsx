"use client";

import { useState } from "react";
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

import { cn } from "@/lib/utils";
import { formatWeight, fromKg, type WeightUnit } from "@/lib/calculations/units";
import type { ProgressDataPoint } from "@/lib/calculations/one-rep-max";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MetricKey = "estimated1RM" | "maxWeight" | "totalVolume" | "bestSetVolume";
type TimeRange = "1m" | "3m" | "6m" | "1y" | "all";

const METRICS: MetricKey[] = ["estimated1RM", "maxWeight", "totalVolume", "bestSetVolume"];
const TIME_RANGES: TimeRange[] = ["1m", "3m", "6m", "1y", "all"];

const TIME_RANGE_MONTHS: Record<Exclude<TimeRange, "all">, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "1y": 12,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function filterByTimeRange(data: ProgressDataPoint[], range: TimeRange): ProgressDataPoint[] {
  if (range === "all") return data;
  const months = TIME_RANGE_MONTHS[range];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return data.filter((d) => d.date >= cutoffStr);
}

function formatXDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------
interface TooltipPayloadItem {
  value?: number | null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  unit: WeightUnit;
  metricLabel: string;
}

function CustomTooltip({ active, payload, label, unit, metricLabel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
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
        {metricLabel}:{" "}
        {value != null ? `${formatWeight(value, unit)} ${unit}` : "—"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface Props {
  data: ProgressDataPoint[];
  unit: WeightUnit;
}

export function ExerciseProgressChart({ data, unit }: Props) {
  const t = useTranslations("charts");
  const [metric, setMetric] = useState<MetricKey>("estimated1RM");
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");

  // data comes in DESC order from the server — sort ASC for the chart x-axis
  const ascData = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const filtered = filterByTimeRange(ascData, timeRange);

  // Build chart data with a single `_value` key (converted to user unit)
  const chartData = filtered.map((d) => {
    const raw = d[metric];
    const converted =
      raw != null ? Math.round(fromKg(raw, unit) * 10) / 10 : null;
    return { date: d.date, _value: converted };
  });

  const metricLabel = t(metric as Parameters<typeof t>[0]);

  const timeRangeLabel: Record<TimeRange, string> = {
    "1m": t("timeRange1m"),
    "3m": t("timeRange3m"),
    "6m": t("timeRange6m"),
    "1y": t("timeRange1y"),
    all: t("timeRangeAll"),
  };

  if (filtered.length < 2) {
    return (
      <div className="flex flex-col gap-3">
        {/* Metric + time selectors still visible so UX isn't confusing */}
        <MetricSelector metrics={METRICS} active={metric} onChange={setMetric} t={t} />
        <TimeRangeSelector
          ranges={TIME_RANGES}
          active={timeRange}
          onChange={setTimeRange}
          labels={timeRangeLabel}
        />
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t("noData")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <MetricSelector metrics={METRICS} active={metric} onChange={setMetric} t={t} />
      <TimeRangeSelector
        ranges={TIME_RANGES}
        active={timeRange}
        onChange={setTimeRange}
        labels={timeRangeLabel}
      />
      <div className="w-full max-w-[800px]">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
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
              tickFormatter={formatXDate}
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => formatWeight(v, unit)}
            />
            <Tooltip
              content={
                <CustomTooltip unit={unit} metricLabel={metricLabel} />
              }
            />
            <Line
              type="monotone"
              dataKey="_value"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--foreground)", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "var(--foreground)" }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function MetricSelector({
  metrics,
  active,
  onChange,
  t,
}: {
  metrics: MetricKey[];
  active: MetricKey;
  onChange: (m: MetricKey) => void;
  t: ReturnType<typeof useTranslations<"charts">>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {metrics.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            active === m
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {t(m as Parameters<typeof t>[0])}
        </button>
      ))}
    </div>
  );
}

function TimeRangeSelector({
  ranges,
  active,
  onChange,
  labels,
}: {
  ranges: TimeRange[];
  active: TimeRange;
  onChange: (r: TimeRange) => void;
  labels: Record<TimeRange, string>;
}) {
  return (
    <div className="flex gap-1">
      {ranges.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "rounded px-2.5 py-1 text-xs transition-colors",
            active === r
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {labels[r]}
        </button>
      ))}
    </div>
  );
}
