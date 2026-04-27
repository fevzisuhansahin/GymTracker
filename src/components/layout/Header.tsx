"use client";

import { Dumbbell, LogOut, Settings, User } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Container } from "./Container";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/[locale]/(auth)/actions";
import { cn } from "@/lib/utils";

interface HeaderProps {
  displayName: string;
  username: string;
}

export function Header({ displayName, username }: HeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/history", label: t("nav.history") },
    { href: "/splits", label: t("nav.splits") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <span className="font-bold tracking-tight">GymTracker</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "transition-colors hover:text-foreground",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                <span className="max-w-[8rem] truncate text-sm">{displayName}</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{displayName}</span>
                  <span className="text-xs text-muted-foreground">@{username}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push(`/u/${username}`)}
                className="cursor-pointer"
              >
                <User className="h-4 w-4" />
                {t("nav.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                {t("nav.settings")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  const fd = new FormData();
                  fd.set("locale", locale);
                  logoutAction(fd);
                }}
                className="cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {t("header.logout")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </Container>
    </header>
  );
}
