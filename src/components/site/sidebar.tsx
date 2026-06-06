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
  Zap,
  Wand2,
  Cookie,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import { useWishlist } from "@/hooks/use-wishlist";
import { NotesPanel } from "@/features/notes/notes-panel";

export const NAV = [
  { href: "/",             label: "Dashboard", icon: LayoutDashboard, badge: "none" as const },
  { href: "/pokedex",      label: "Pokédex",   icon: BookOpen,        badge: "none" as const },
  { href: "/moves",        label: "Attaques",  icon: Zap,             badge: "none" as const },
  { href: "/abilities",    label: "Talents",   icon: Wand2,           badge: "none" as const },
  { href: "/team-builder", label: "Builder",   icon: Users,           badge: "teams" as const },
  { href: "/battle",       label: "Combat",    icon: Swords,          badge: "none" as const },
  { href: "/items",        label: "Objets",    icon: Package,         badge: "none" as const },
  { href: "/pokesnacks",   label: "PokéSnacks",icon: Cookie,          badge: "none" as const },
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
    // `sticky` so the sidebar stays anchored to the viewport while the
    // main content scrolls. `h-screen` reserves the full viewport
    // height; inner `min-h-0` + `overflow-y-auto` on the <nav> keep
    // long nav lists scrollable independently of the main page.
    <aside className="sticky top-0 hidden h-screen shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:w-60 md:flex-col">
      <Link href="/" className="flex shrink-0 items-center gap-3 px-5 py-5">
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

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
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

      {/* Pinned to the bottom — the Notes panel is a global utility
          that doesn't belong with the page-level nav. */}
      <div className="shrink-0 border-t p-2">
        <NotesPanel variant="sidebar" />
      </div>
    </aside>
  );
}
