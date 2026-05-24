"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Swords,
  BookOpen,
  MapPin,
  Cookie,
  Sparkles,
  Flame,
} from "lucide-react";
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

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:flex md:w-60 md:flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid size-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Swords className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-base font-semibold leading-none">
            CobbleMate
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Cobblemon 1.7
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
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

      <div className="border-t px-3 py-3 text-[10px] text-muted-foreground">
        Données locales · prêt pour API / Supabase
      </div>
    </aside>
  );
}
