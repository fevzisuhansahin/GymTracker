"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRESETS = [30, 60, 90, 120, 180, 300];
const STORAGE_KEY = "gymtracker-rest-timer-duration";
const DEFAULT_SECONDS = 90;

function readStoredDuration(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = parseInt(stored, 10);
      if (PRESETS.includes(n)) return n;
    }
  } catch {
    // localStorage not available
  }
  return DEFAULT_SECONDS;
}

export interface RestTimerProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function RestTimer({ onComplete, onSkip }: RestTimerProps) {
  const t = useTranslations("restTimer");

  // Lazy initializers: this component is only ever mounted client-side
  // (conditionally rendered after user interaction), never during SSR.
  // Reading localStorage here is safe.
  const [duration, setDuration] = useState<number>(() => readStoredDuration());
  const [remaining, setRemaining] = useState<number>(() => readStoredDuration());
  const [resetKey, setResetKey] = useState(0);
  const [showPresets, setShowPresets] = useState(false);
  const [flash, setFlash] = useState(false);

  const onCompleteRef = useRef(onComplete);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep callback ref up to date without re-triggering the interval effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // Countdown interval — restarts whenever resetKey changes
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          // Defer side effects outside of the updater function
          setTimeout(() => {
            try {
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
              }
            } catch {
              // vibrate not supported
            }
            setFlash(true);
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            flashTimerRef.current = setTimeout(() => setFlash(false), 600);
            onCompleteRef.current();
          }, 0);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resetKey]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  function handleSelectPreset(p: number) {
    try {
      localStorage.setItem(STORAGE_KEY, String(p));
    } catch {
      // localStorage not available
    }
    setDuration(p);
    setRemaining(p);
    setFlash(false);
    setShowPresets(false);
    setResetKey((k) => k + 1);
  }

  function handleReset() {
    setRemaining(duration);
    setFlash(false);
    setResetKey((k) => k + 1);
  }

  const progress = duration > 0 ? remaining / duration : 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors duration-300",
        flash && "border-emerald-500/40 bg-emerald-500/10",
      )}
    >
      {/* Circular countdown */}
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
          {/* Track */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            strokeWidth="3"
            stroke="currentColor"
            className="text-muted-foreground/20"
          />
          {/* Progress */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              "transition-[stroke-dashoffset] duration-[950ms] ease-linear",
              remaining === 0 ? "text-emerald-500" : "text-primary",
            )}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums">
          {timeStr}
        </span>
      </div>

      {/* Label + preset selector */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{t("label")}</p>
        {showPresets ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                  p === duration
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/70",
                )}
              >
                {p < 60 ? `${p}s` : `${p / 60}m`}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {duration < 60 ? `${duration}s` : `${duration / 60}m`}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleReset}
          aria-label={t("resetAria")}
          className="h-8 w-8"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowPresets((v) => !v)}
          aria-label={t("adjustAria")}
          className="h-8 w-8"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onSkip}
          aria-label={t("skipAria")}
          className="h-8 w-8 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
