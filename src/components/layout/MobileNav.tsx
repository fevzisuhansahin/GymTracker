"use client";

import { Dumbbell, History, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { label: "History", icon: History, href: "/history" },
  { label: "Workout", icon: Dumbbell, href: "/workout/new" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <div className="grid grid-cols-4">
        {navItems.map((item) => (
          <button
            key={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground",
              "hover:text-foreground transition-colors",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
