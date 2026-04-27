"use client";

import { Dumbbell, History, LayoutDashboard, Settings, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  username: string;
}

export function MobileNav({ username }: MobileNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/workout/new", label: t("newWorkoutShort"), icon: Dumbbell },
    { href: "/history", label: t("history"), icon: History },
    { href: `/u/${username}`, label: t("profile"), icon: User, dynamic: true as const },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.dynamic
            ? pathname.startsWith("/u/")
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
