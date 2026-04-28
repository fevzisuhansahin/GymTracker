"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Copy, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  copyTemplateSplitAction,
  deleteSplitAction,
  setActiveSplitAction,
} from "../actions";

interface UserSplit {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  dayCount: number;
}

interface TemplateSplit {
  id: string;
  name: string;
  description: string | null;
  dayCount: number;
}

interface Props {
  userSplits: UserSplit[];
  templates: TemplateSplit[];
}

function safeT(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    return key;
  }
}

export function SplitsListClient({ userSplits, templates }: Props) {
  const t = useTranslations("splits");
  const tRoot = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleSetActive(splitId: string) {
    startTransition(async () => {
      const res = await setActiveSplitAction(splitId);
      if (res.ok) {
        toast.success(t("form.activeSuccess"));
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "splits.errors.generic"));
      }
    });
  }

  function handleCopyTemplate(templateId: string) {
    startTransition(async () => {
      const res = await copyTemplateSplitAction(templateId);
      if (res.ok && res.splitId) {
        toast.success(t("form.copySuccess"));
        router.push(`/splits/${res.splitId}/edit`);
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "splits.errors.generic"));
      }
    });
  }

  function handleDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    startTransition(async () => {
      const res = await deleteSplitAction(id);
      if (res.ok) {
        toast.success(t("form.deleteSuccess"));
        setConfirmDeleteId(null);
      } else {
        toast.error(safeT(tRoot, res.errorKey ?? "splits.errors.generic"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("yourSplitsTitle")}
        </h2>
        {userSplits.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("noUserSplits")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {userSplits.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "rounded-lg border bg-card p-4",
                  s.isActive && "ring-1 ring-primary/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{s.name}</h3>
                      {s.isActive && (
                        <Badge variant="success" className="shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("actions.isActive")}
                        </Badge>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("dayCount", { count: s.dayCount })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!s.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => handleSetActive(s.id)}
                    >
                      {t("actions.makeActive")}
                    </Button>
                  )}
                  <Link
                    href={`/splits/${s.id}/edit`}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    {t("actions.edit")}
                  </Link>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => setConfirmDeleteId(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("actions.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("templatesTitle")}
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("templatesSubtitle")}</p>
        <ul className="flex flex-col gap-3">
          {templates.map((tmpl) => (
            <li key={tmpl.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{tmpl.name}</h3>
                  {tmpl.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {tmpl.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("dayCount", { count: tmpl.dayCount })}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => handleCopyTemplate(tmpl.id)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("actions.copy")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actions.delete")}</DialogTitle>
            <DialogDescription>{t("form.deletePrompt")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              disabled={pending}
            >
              {tRoot("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {tRoot("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
