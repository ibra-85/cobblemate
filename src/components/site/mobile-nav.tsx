"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Swords,
  BookOpen,
  MapPin,
  Cookie,
  Sparkles,
  Flame,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",             label: "Dashboard",  icon: LayoutDashboard },
  { href: "/pokedex",      label: "Pokédex",    icon: BookOpen },
  { href: "/team-builder", label: "Builder",    icon: Users },
  { href: "/battle",       label: "Combat",     icon: Swords },
  { href: "/types",        label: "Types",      icon: Sparkles },
  { href: "/moves",        label: "Attaques",   icon: Flame },
  { href: "/spawns",       label: "Spawns",     icon: MapPin },
  { href: "/pokesnacks",   label: "PokéSnacks", icon: Cookie },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu />
            <span className="sr-only">Ouvrir la navigation</span>
          </Button>
        }
      />
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-heading">CobbleMate</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
