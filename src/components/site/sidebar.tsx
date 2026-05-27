"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Swords,
  BookOpen,
  Heart,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import { useWishlist } from "@/hooks/use-wishlist";

export const NAV = [
  { href: "/",             label: "Dashboard", icon: LayoutDashboard, badge: "none" as const },
  { href: "/pokedex",      label: "Pokédex",   icon: BookOpen,        badge: "none" as const },
  { href: "/team-builder", label: "Builder",   icon: Users,           badge: "teams" as const },
  { href: "/battle",       label: "Combat",    icon: Swords,          badge: "none" as const },
  { href: "/items",        label: "Objets",    icon: Package,         badge: "none" as const },
  { href: "/wishlist",     label: "Wishlist",  icon: Heart,           badge: "wishlist" as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { teams } = useSavedTeams();
  const { ids: wishlistIds } = useWishlist();

  function badgeValue(b: (typeof NAV)[number]["badge"]) {
    if (b === "teams" && teams.length > 0) return teams.length;
    if (b === "wishlist" && wishlistIds.length > 0) return wishlistIds.length;
    return null;
  }

  return (
    <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:flex md:w-60 md:flex-col">
      <Link href="/" className="flex items-center gap-3 px-5 py-5">
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
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const count = badgeValue(badge);
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
              <span className="flex-1">{label}</span>
              {count !== null && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-semibold",
                    active
                      ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
