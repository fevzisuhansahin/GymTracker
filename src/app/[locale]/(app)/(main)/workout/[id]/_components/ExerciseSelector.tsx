"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { addExercisesToWorkoutAction } from "../../actions";
import {
  getRecommendedExercisesForSelectorAction,
  searchExercisesAction,
} from "../selector-actions";

import { CustomExerciseForm } from "./CustomExerciseForm";

interface ExerciseLite {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  splitDayId: string | null;
  excludeExerciseIds: string[];
  onAdded: () => void;
  isAdmin: boolean;
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

export function ExerciseSelector({
  open,
  onOpenChange,
  workoutId,
  splitDayId,
  excludeExerciseIds,
  onAdded,
  isAdmin,
}: Props) {
  const t = useTranslations("workouts.selector");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-hidden">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>
        {open && (
          <SelectorBody
            workoutId={workoutId}
            splitDayId={splitDayId}
            excludeExerciseIds={excludeExerciseIds}
            onAdded={onAdded}
            isAdmin={isAdmin}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface BodyProps {
  workoutId: string;
  splitDayId: string | null;
  excludeExerciseIds: string[];
  onAdded: () => void;
  isAdmin: boolean;
}

function SelectorBody({
  workoutId,
  splitDayId,
  excludeExerciseIds,
  onAdded,
  isAdmin,
}: BodyProps) {
  const t = useTranslations("workouts.selector");
  const tRoot = useTranslations();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"recommended" | "all" | "new">("recommended");
  const [recommended, setRecommended] = useState<ExerciseLite[] | null>(null);
  const [allResults, setAllResults] = useState<ExerciseLite[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const searchInputRef = useRef<HTMLInputElement>(null);

  // "Tümü" tab'ına geçince (veya açılışta zaten "all" ise) arama input'una focus
  useEffect(() => {
    if (tab !== "all") return;
    const id = setTimeout(() => { searchInputRef.current?.focus(); }, 50);
    return () => clearTimeout(id);
  }, [tab]);

  // Mount-only fetch; component remounts each time the sheet opens.
  useEffect(() => {
    void (async () => {
      const res = await getRecommendedExercisesForSelectorAction(splitDayId);
      setRecommended(res);
    })();
  }, [splitDayId]);

  // Load all on switching to "all" tab or when query changes
  useEffect(() => {
    if (tab !== "all") return;
    const handle = setTimeout(() => {
      void (async () => {
        const res = await searchExercisesAction(query);
        setAllResults(res);
      })();
    }, query ? 250 : 0);
    return () => clearTimeout(handle);
  }, [tab, query]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await addExercisesToWorkoutAction({
        workoutId,
        exerciseIds: ids,
      });
      if (res.ok) {
        onAdded();
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "workouts.errors.generic"));
      }
    });
  }

  const exclude = new Set(excludeExerciseIds);

  return (
    <>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList
          className={cn(
            "mx-4 mt-2 grid",
            isAdmin ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          <TabsTrigger value="recommended">{t("tabRecommended")}</TabsTrigger>
          <TabsTrigger value="all">{t("tabAll")}</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="new">{t("tabNew")}</TabsTrigger>
          )}
        </TabsList>

        <SheetBody className="flex-1 px-0 py-0">
          <TabsContent value="recommended" className="m-0 px-4 py-3">
            {recommended === null ? (
              <LoadingRow />
            ) : recommended.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noRecommended")}</p>
            ) : (
              <ExerciseList
                items={recommended}
                selected={selected}
                exclude={exclude}
                onToggle={toggle}
              />
            )}
          </TabsContent>

          <TabsContent value="all" className="m-0 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-10 pl-9"
              />
            </div>
            <div className="mt-3">
              {allResults.length === 0 && query !== "" ? (
                <p className="text-sm text-muted-foreground">{t("noResults")}</p>
              ) : (
                <ExerciseList
                  items={allResults}
                  selected={selected}
                  exclude={exclude}
                  onToggle={toggle}
                />
              )}
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="new" className="m-0 px-4 py-3">
              <CustomExerciseForm
                workoutId={workoutId}
                onCreated={onAdded}
                isAdmin={isAdmin}
              />
            </TabsContent>
          )}
        </SheetBody>
      </Tabs>

      {tab !== "new" && (
        <SheetFooter>
          <Button
            onClick={handleAdd}
            disabled={pending || selected.size === 0}
            className="w-full"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("addCount", { count: selected.size })}
          </Button>
        </SheetFooter>
      )}
    </>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function ExerciseList({
  items,
  selected,
  exclude,
  onToggle,
}: {
  items: ExerciseLite[];
  selected: Set<string>;
  exclude: Set<string>;
  onToggle: (id: string) => void;
}) {
  const tEquipment = useTranslations("equipment");
  const tMuscles = useTranslations("muscles");
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((ex) => {
        const isExcluded = exclude.has(ex.id);
        const isSel = selected.has(ex.id);
        return (
          <li key={ex.id}>
            <button
              type="button"
              onClick={() => !isExcluded && onToggle(ex.id)}
              disabled={isExcluded}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                isSel
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted",
                isExcluded && "cursor-not-allowed opacity-50",
              )}
            >
              <Checkbox checked={isSel} className="pointer-events-none" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ex.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {tMuscles(ex.primary_muscle as never)}
                  {ex.equipment ? ` · ${tEquipment(ex.equipment as never)}` : ""}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
