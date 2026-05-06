"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, Download } from "lucide-react";
import {
  updateProfileAction,
  updatePreferencesAction,
  exportDataAction,
  deleteAccountAction,
} from "../actions";
import type { Profile } from "@/lib/supabase/queries/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  profile: Profile;
}

// ---------------------------------------------------------------------------
// Profile section
// ---------------------------------------------------------------------------

function ProfileSection({ profile }: { profile: Profile }) {
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [isPublic, setIsPublic] = useState(profile.is_public);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const fd = new FormData();
    fd.set("displayName", displayName);
    fd.set("username", username);
    fd.set("avatarUrl", avatarUrl);
    fd.set("isPublic", String(isPublic));

    startTransition(async () => {
      const result = await updateProfileAction(fd);
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        else toast.error(t(`errors.generic`));
      } else {
        toast.success(t("success.profileUpdated"));
      }
    });
  };

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{t("profile.title")}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">{t("profile.displayName")}</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isPending}
          />
          {fieldErrors.displayName && (
            <p className="text-xs text-destructive">{t(`errors.displayNameRequired`)}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="username">{t("profile.username")}</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">{t("profile.usernameHint")}</p>
          {fieldErrors.username && (
            <p className="text-xs text-destructive">{t(`errors.usernameTaken`)}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="avatarUrl">{t("profile.avatarUrl")}</Label>
          <Input
            id="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">{t("profile.avatarUrlHint")}</p>
        </div>

        <div className="space-y-2">
          <Label>{t("profile.visibility")}</Label>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">
                {isPublic ? t("profile.public") : t("profile.private")}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPublic ? t("profile.publicDesc") : t("profile.privateDesc")}
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isPending}
            />
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("profile.saving")}
            </>
          ) : (
            t("profile.save")
          )}
        </Button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Preferences section
// ---------------------------------------------------------------------------

function PreferencesSection({ profile }: { profile: Profile }) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  const [unit, setUnit] = useState(profile.unit_preference as "kg" | "lb");
  const [language, setLanguage] = useState(profile.language as "tr" | "en");

  const handleSave = () => {
    const fd = new FormData();
    fd.set("unitPreference", unit);
    fd.set("language", language);

    startTransition(async () => {
      const result = await updatePreferencesAction(fd);
      if (!result.ok) {
        toast.error(t("errors.generic"));
      } else {
        toast.success(t("success.preferencesUpdated"));
        if (result.newLanguage && result.newLanguage !== locale) {
          router.replace("/settings", { locale: result.newLanguage });
        }
      }
    });
  };

  const themeOptions: { value: string; label: string }[] = [
    { value: "light", label: t("preferences.themeLight") },
    { value: "dark", label: t("preferences.themeDark") },
    { value: "system", label: t("preferences.themeSystem") },
  ];

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{t("preferences.title")}</h2>
      <div className="space-y-4">
        {/* Unit */}
        <div className="space-y-1.5">
          <Label>{t("preferences.unit")}</Label>
          <div className="flex gap-2">
            {(["kg", "lb"] as const).map((u) => (
              <Button
                key={u}
                type="button"
                variant={unit === u ? "default" : "outline"}
                size="sm"
                onClick={() => setUnit(u)}
                disabled={isPending}
              >
                {u}
              </Button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <Label>{t("preferences.language")}</Label>
          <div className="flex gap-2">
            {(["tr", "en"] as const).map((l) => (
              <Button
                key={l}
                type="button"
                variant={language === l ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage(l)}
                disabled={isPending}
              >
                {l.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="space-y-1.5">
          <Label>{t("preferences.theme")}</Label>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={theme === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-auto">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("profile.saving")}
            </>
          ) : (
            t("profile.save")
          )}
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Account section
// ---------------------------------------------------------------------------

function AccountSection() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isExporting, startExport] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleExport = () => {
    startExport(async () => {
      const result = await exportDataAction();
      if (!result.ok || !result.data) {
        toast.error(t("errors.generic"));
        return;
      }
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gymtracker-export.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      const result = await deleteAccountAction();
      if (!result.ok) {
        toast.error(t("errors.generic"));
        setDeleteDialogOpen(false);
        return;
      }
      // Supabase invalidates the session automatically; redirect to login
      router.replace(`/${locale}/login` as Parameters<typeof router.replace>[0]);
    });
  };

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{t("account.title")}</h2>
      <div className="space-y-4">
        {/* Export */}
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">{t("account.export")}</p>
            <p className="text-xs text-muted-foreground">{t("account.exportHint")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="shrink-0"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ml-2">
              {isExporting ? t("account.exporting") : t("account.export")}
            </span>
          </Button>
        </div>

        {/* Delete */}
        <div className="flex items-start justify-between gap-4 rounded-lg border border-destructive/30 p-4">
          <div>
            <p className="text-sm font-medium text-destructive">{t("account.delete")}</p>
            <p className="text-xs text-muted-foreground">{t("account.deleteHint")}</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            <span className="ml-2">{t("account.delete")}</span>
          </Button>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("account.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("account.deleteConfirmBody")}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("account.deleting")}
                </>
              ) : (
                t("account.deleteConfirm")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export function SettingsClient({ profile }: Props) {
  return (
    <div className="space-y-8">
      <ProfileSection profile={profile} />
      <Separator />
      <PreferencesSection profile={profile} />
      <Separator />
      <AccountSection />
    </div>
  );
}
