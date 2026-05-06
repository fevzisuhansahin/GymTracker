"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { MuscleActivation } from "@/lib/calculations/muscle-activation";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
interface BodyDiagramProps {
  activations: ReadonlyArray<MuscleActivation>;
  className?: string;
}

// ---------------------------------------------------------------------------
// SVG geometry (data-driven)
// ---------------------------------------------------------------------------
type MuscleShape =
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "rect"; x: number; y: number; w: number; h: number; rx: number };

interface MuscleGroupDef {
  /** SVG kas id'si — calculateMuscleActivations çıktısıyla aynı isim. */
  muscle: string;
  shapes: ReadonlyArray<MuscleShape>;
}

const FRONT_MUSCLES: ReadonlyArray<MuscleGroupDef> = [
  {
    muscle: "front_delts",
    shapes: [
      { type: "ellipse", cx: 60, cy: 86, rx: 19, ry: 21 },
      { type: "ellipse", cx: 140, cy: 86, rx: 19, ry: 21 },
    ],
  },
  {
    muscle: "chest",
    shapes: [{ type: "ellipse", cx: 100, cy: 98, rx: 32, ry: 26 }],
  },
  {
    muscle: "biceps",
    shapes: [
      { type: "ellipse", cx: 50, cy: 147, rx: 11, ry: 30 },
      { type: "ellipse", cx: 150, cy: 147, rx: 11, ry: 30 },
    ],
  },
  {
    muscle: "abs",
    shapes: [{ type: "rect", x: 81, y: 127, w: 38, h: 87, rx: 10 }],
  },
  {
    muscle: "forearms",
    shapes: [
      { type: "ellipse", cx: 44, cy: 205, rx: 9, ry: 28 },
      { type: "ellipse", cx: 156, cy: 205, rx: 9, ry: 28 },
    ],
  },
  {
    muscle: "quads",
    shapes: [
      { type: "ellipse", cx: 85, cy: 285, rx: 22, ry: 52 },
      { type: "ellipse", cx: 115, cy: 285, rx: 22, ry: 52 },
    ],
  },
];

const BACK_MUSCLES: ReadonlyArray<MuscleGroupDef> = [
  {
    muscle: "traps",
    shapes: [{ type: "ellipse", cx: 100, cy: 82, rx: 40, ry: 18 }],
  },
  {
    muscle: "rear_delts",
    shapes: [
      { type: "ellipse", cx: 57, cy: 89, rx: 17, ry: 19 },
      { type: "ellipse", cx: 143, cy: 89, rx: 17, ry: 19 },
    ],
  },
  {
    muscle: "triceps",
    shapes: [
      { type: "ellipse", cx: 50, cy: 147, rx: 11, ry: 30 },
      { type: "ellipse", cx: 150, cy: 147, rx: 11, ry: 30 },
    ],
  },
  {
    muscle: "lats",
    shapes: [
      { type: "ellipse", cx: 68, cy: 155, rx: 22, ry: 50 },
      { type: "ellipse", cx: 132, cy: 155, rx: 22, ry: 50 },
    ],
  },
  {
    muscle: "lower_back",
    shapes: [{ type: "ellipse", cx: 100, cy: 195, rx: 26, ry: 20 }],
  },
  {
    muscle: "glutes",
    shapes: [
      { type: "ellipse", cx: 85, cy: 248, rx: 25, ry: 27 },
      { type: "ellipse", cx: 115, cy: 248, rx: 25, ry: 27 },
    ],
  },
  {
    muscle: "hamstrings",
    shapes: [
      { type: "ellipse", cx: 85, cy: 303, rx: 21, ry: 44 },
      { type: "ellipse", cx: 115, cy: 303, rx: 21, ry: 44 },
    ],
  },
  {
    muscle: "calves",
    shapes: [
      { type: "ellipse", cx: 85, cy: 367, rx: 14, ry: 26 },
      { type: "ellipse", cx: 115, cy: 367, rx: 14, ry: 26 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Intensity mapping
// ---------------------------------------------------------------------------
function buildIntensityMap(
  activations: ReadonlyArray<MuscleActivation>,
): Map<string, number> {
  const result = new Map<string, number>();
  if (activations.length === 0) return result;

  const maxVolume = activations.reduce((m, a) => Math.max(m, a.volume), 0);
  if (maxVolume <= 0) return result;

  for (const a of activations) {
    const ratio = a.volume / maxVolume;
    let opacity: number;
    if (ratio < 0.34) opacity = 0.4;
    else if (ratio < 0.67) opacity = 0.7;
    else opacity = 1.0;
    result.set(a.muscle, opacity);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------
interface MuscleGroupProps {
  def: MuscleGroupDef;
  intensity: number | undefined; // undefined = inactive
  isHovered: boolean;
  label: string; // already-translated muscle name (for SVG <title>)
  onHover: (m: string | null) => void;
}

function MuscleGroup({
  def,
  intensity,
  isHovered,
  label,
  onHover,
}: MuscleGroupProps) {
  const isActive = intensity !== undefined;
  const fill = isActive ? "var(--primary)" : "var(--muted)";
  const fillOpacity = isActive ? intensity : 1;
  const stroke = isHovered ? "var(--ring)" : "var(--border)";
  const strokeWidth = isHovered ? 1.5 : 0.75;

  const shapeStyle: React.CSSProperties = {
    fill,
    fillOpacity,
    stroke,
    strokeWidth,
    transition: "fill-opacity 200ms ease, stroke 200ms ease, stroke-width 200ms ease",
    cursor: "pointer",
  };

  return (
    <g
      onMouseEnter={() => onHover(def.muscle)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(def.muscle)}
      onBlur={() => onHover(null)}
      onClick={() => onHover(def.muscle)}
      tabIndex={0}
      role="button"
      aria-label={label}
      className="outline-none"
    >
      <title>{label}</title>
      {def.shapes.map((shape, i) =>
        shape.type === "ellipse" ? (
          <ellipse
            key={i}
            cx={shape.cx}
            cy={shape.cy}
            rx={shape.rx}
            ry={shape.ry}
            style={shapeStyle}
          />
        ) : (
          <rect
            key={i}
            x={shape.x}
            y={shape.y}
            width={shape.w}
            height={shape.h}
            rx={shape.rx}
            style={shapeStyle}
          />
        ),
      )}
    </g>
  );
}

// Static body silhouette (head, torso, limbs) — non-interactive context.
function BodyOutline() {
  const baseStyle: React.CSSProperties = {
    fill: "var(--muted)",
    stroke: "var(--border)",
    strokeWidth: 0.75,
  };

  return (
    <g style={baseStyle} aria-hidden="true">
      {/* Head */}
      <circle cx={100} cy={30} r={22} />
      {/* Neck */}
      <rect x={92} y={51} width={16} height={14} rx={3} />
      {/* Torso */}
      <rect x={68} y={72} width={64} height={152} rx={14} />
      {/* Upper arms */}
      <rect x={38} y={78} width={24} height={82} rx={12} />
      <rect x={138} y={78} width={24} height={82} rx={12} />
      {/* Forearms */}
      <rect x={34} y={161} width={20} height={78} rx={10} />
      <rect x={146} y={161} width={20} height={78} rx={10} />
      {/* Thighs */}
      <rect x={68} y={228} width={34} height={108} rx={14} />
      <rect x={102} y={228} width={34} height={108} rx={14} />
      {/* Shins */}
      <rect x={72} y={337} width={28} height={60} rx={12} />
      <rect x={104} y={337} width={28} height={60} rx={12} />
    </g>
  );
}

interface ViewProps {
  groups: ReadonlyArray<MuscleGroupDef>;
  intensityMap: Map<string, number>;
  hoveredMuscle: string | null;
  onHover: (m: string | null) => void;
  muscleLabel: (muscle: string) => string;
  ariaLabel: string;
}

function BodyView({
  groups,
  intensityMap,
  hoveredMuscle,
  onHover,
  muscleLabel,
  ariaLabel,
}: ViewProps) {
  return (
    <svg
      viewBox="0 0 200 400"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full max-w-[180px]"
    >
      <BodyOutline />
      {groups.map((def) => (
        <MuscleGroup
          key={def.muscle}
          def={def}
          intensity={intensityMap.get(def.muscle)}
          isHovered={hoveredMuscle === def.muscle}
          label={muscleLabel(def.muscle)}
          onHover={onHover}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function BodyDiagram({ activations, className }: BodyDiagramProps) {
  const t = useTranslations("bodyDiagram");
  const tMuscles = useTranslations("muscles");
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  const intensityMap = useMemo(() => buildIntensityMap(activations), [activations]);
  const activationByMuscle = useMemo(() => {
    const m = new Map<string, MuscleActivation>();
    for (const a of activations) m.set(a.muscle, a);
    return m;
  }, [activations]);

  function muscleLabel(muscle: string): string {
    // Mevcut "muscles.*" namespace'ini yeniden kullanıyoruz.
    // Çeviri yoksa key'i döndür (graceful fallback).
    try {
      return tMuscles(muscle as never);
    } catch {
      return muscle;
    }
  }

  const hoveredActivation = hoveredMuscle ? activationByMuscle.get(hoveredMuscle) : null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className="flex flex-col items-stretch gap-4 sm:flex-row sm:justify-center"
        onMouseLeave={() => setHoveredMuscle(null)}
      >
        <div className="flex flex-1 flex-col items-center gap-1 sm:flex-initial">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("front")}
          </span>
          <BodyView
            groups={FRONT_MUSCLES}
            intensityMap={intensityMap}
            hoveredMuscle={hoveredMuscle}
            onHover={setHoveredMuscle}
            muscleLabel={muscleLabel}
            ariaLabel={t("front")}
          />
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 sm:flex-initial">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("back")}
          </span>
          <BodyView
            groups={BACK_MUSCLES}
            intensityMap={intensityMap}
            hoveredMuscle={hoveredMuscle}
            onHover={setHoveredMuscle}
            muscleLabel={muscleLabel}
            ariaLabel={t("back")}
          />
        </div>
      </div>

      {/* Tooltip / info bar — shows hovered or top muscle */}
      <div className="min-h-[2.25rem] rounded-md border bg-muted/30 px-3 py-2 text-center text-xs">
        {hoveredMuscle ? (
          <>
            <span className="font-medium">{muscleLabel(hoveredMuscle)}</span>
            {hoveredActivation ? (
              <span className="text-muted-foreground">
                {" — "}
                {hoveredActivation.volume.toLocaleString()} kg
                {!hoveredActivation.isPrimary && ` (${t("secondary")})`}
              </span>
            ) : (
              <span className="text-muted-foreground"> — {t("inactive")}</span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">{t("hint")}</span>
        )}
      </div>
    </div>
  );
}
