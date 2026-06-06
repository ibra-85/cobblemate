"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Cookie } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ItemIcon } from "@/components/site/minecraft-item";
import { ITEMS } from "@/data/items";
import { cn } from "@/lib/utils";
import type { Item, ItemCategory } from "@/types";

/** Most curated items map to Cobblemon items. Prefix with the
 *  `cobblemon:` namespace + underscore the id so `ItemIcon` can
 *  resolve a real texture via its lookup chain (registry → bundled
 *  sprite → PokéAPI → SVG fallback). Items the chain can't find
 *  fall back to the hand-drawn pixel-art sprite — never broken. */
function cobblemonItemId(id: string): string {
  return `cobblemon:${id.replace(/-/g, "_")}`;
}

const RARITY_TONE: Record<string, string> = {
  common:      "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
  uncommon:    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  rare:        "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "ultra-rare": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

const RARITY_LABEL: Record<string, string> = {
  common:       "Commun",
  uncommon:     "Peu commun",
  rare:         "Rare",
  "ultra-rare": "Ultra rare",
};

const CATEGORIES: { id: ItemCategory | "all"; label: string }[] = [
  { id: "all",       label: "Tout" },
  { id: "ball",      label: "Apricorn Balls" },
  { id: "held",      label: "Tenus" },
  { id: "evolution", label: "Évolution" },
  { id: "healing",   label: "Soins" },
  { id: "berry",     label: "Baies" },
];

export default function ItemsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof CATEGORIES)[number]["id"]>("all");

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ITEMS.filter((i) => {
      if (tab !== "all" && i.category !== tab) return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.id.includes(q))
        return false;
      return true;
    });
  }, [query, tab]);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Objets
        </h1>
        <p className="text-sm text-muted-foreground">
          Apricorn Balls, objets tenus, pierres évolutives, soins et baies.
          Pour les snacks (recettes pour attirer des Pokémon), va sur la
          page dédiée.
        </p>
      </header>

      {/* CTA — PokéSnacks now lives on its own page. We surface it as
          a banner-style card so first-time visitors can find it
          without hunting through tabs. */}
      <Link
        href="/pokesnacks"
        className="group flex items-center gap-3 rounded-lg border bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-3 transition-colors hover:border-amber-500/40"
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Cookie className="size-5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">PokéSnacks</span>
          <span className="text-xs text-muted-foreground">
            Recettes pour attirer un type, un Pokémon précis ou un biome
            entier. Filtres avancés disponibles.
          </span>
        </div>
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" tabIndex={-1}>
          Explorer →
        </Button>
      </Link>

      <div className="flex flex-col gap-3">
        <InputGroup className="max-w-md">
          <InputGroupAddon>
            <Search className="size-4 opacity-60" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Rechercher un objet…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <Tabs
          value={tab}
          onValueChange={(v) =>
            v && setTab(v as (typeof CATEGORIES)[number]["id"])
          }
        >
          <TabsList>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-4 flex flex-col gap-6">
            {filteredItems.length > 0 ? (
              // `auto-rows-fr` (fractional, not min) forces every row
              // in the grid to be the same height — paired with
              // `h-full` on each card, every card in a row stretches
              // to match the tallest in that row. We also fix the
              // description to a `min-h-[2.5rem]` slot so cards with
              // shorter descriptions don't collapse the title row
              // and break vertical alignment between rows.
              <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredItems.map((it) => (
                  <ItemCard key={it.id} item={it} />
                ))}
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Rien à afficher</EmptyTitle>
                  <EmptyDescription>
                    Aucun résultat pour ces filtres. Essaie une autre catégorie.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * Item catalogue card. Visual chrome inspired by the `CompetitorCard`
 * from the "Où le trouver" section — same `rounded-md`, accent
 * hover, hover-lift — so the items page reads as part of the same
 * design system as the Pokédex detail pages.
 *
 * The whole card is a `<Link>` to `/items/<id>`. Related-Pokémon
 * badges are rendered *outside* that link (as siblings inside the
 * outer container) to avoid the nested-anchor hydration error that
 * bit the evolution panel earlier — invalid HTML, dev mode warning,
 * and Safari renders the inner anchor as inert.
 */
/**
 * Item catalogue card — same shape for every entry so the grid stays
 * uniform regardless of which optional fields the item carries.
 *
 * Visible info: icon, name, rarity badge, 2-line description, and a
 * "Recette" / "Drop" / "Loot" badge that signals what's on the
 * detail page. Everything else (obtain text, related Pokémon, the
 * recipe grid itself, holders) lives on `/items/[id]` to keep the
 * card heights consistent. The whole tile is one `<Link>` so taps
 * always go to the detail page — no nested anchors, no hydration
 * warnings.
 */
function ItemCard({ item }: { item: Item }) {
  const rawId = cobblemonItemId(item.id);
  return (
    <Link
      href={`/items/${item.id}`}
      title={`Voir le détail de ${item.name}`}
      className="group/card flex h-full min-h-30 flex-col gap-2 rounded-lg border bg-card p-3 no-underline transition-colors hover:border-foreground/20 hover:bg-accent/30"
    >
      <div className="flex items-start gap-3">
        <ItemIcon item={rawId} size="size-10" className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap justify-between">
            <h3 className="line-clamp-1 text-sm font-semibold leading-tight">
              {item.name}
            </h3>
            {item.rarity && (
              // `inline-flex items-center` + `leading-none` centres
              // the uppercase label inside the pill — the old
              // baseline/inline-block layout left the text glued to
              // the top edge because uppercase letters have no
              // descender to balance the cap-height.
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide",
                  RARITY_TONE[item.rarity] ?? "bg-muted/40",
                )}
              >
                {RARITY_LABEL[item.rarity] ?? item.rarity}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 min-h-[2.25rem] text-xs leading-snug text-muted-foreground">
            {item.description}
          </p>
        </div>
      </div>
      {/* Bottom strip — always shows "Détails →" on the right, plus a
          green "Recette" pill on the left when the item has one. The
          strip is always rendered so card heights stay aligned across
          the grid regardless of which optional fields are present. */}
      <div className="mt-auto flex justify-end">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 transition-colors group-hover/card:text-foreground">
          Détails →
        </span>
      </div>
    </Link>
  );
}
