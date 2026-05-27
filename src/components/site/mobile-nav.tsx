"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV } from "@/components/site/sidebar";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { teams } = useSavedTeams();
  const { ids: wishlistIds } = useWishlist();

  function badgeValue(b: (typeof NAV)[number]["badge"]) {
    if (b === "teams" && teams.length > 0) return teams.length;
    if (b === "wishlist" && wishlistIds.length > 0) return wishlistIds.length;
    return null;
  }

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
          {NAV.map(({ href, label, icon: Icon, badge }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            const count = badgeValue(badge);
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
                <span className="flex-1">{label}</span>
                {count !== null && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-foreground">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
