import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, Package, ChefHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import {
  ItemIcon,
  MinecraftCraftingTable,
} from "@/components/site/minecraft-item";
import {
  lookupItem,
  getItemHolders,
  allHeldItemSlugs,
  type ItemHolder,
} from "@/data/items-pokeapi";
import { frItem } from "@/data/smogon";
import { ITEMS } from "@/data/items";
import type { Item } from "@/types";

export function generateStaticParams() {
  // We need to cover both the held-item slugs Smogon references AND
  // the curated catalogue ids ("poke-ball", "oran-berry", …) so the
  // app router can statically render every link that exists on the
  // /items grid. Set-dedupe in case the lists overlap.
  const ids = new Set<string>([
    ...allHeldItemSlugs(),
    ...ITEMS.map((i) => i.id),
  ]);
  return Array.from(ids).map((id) => ({ id }));
}

/**
 * Map a URL slug (hyphen or underscore) to the curated catalogue entry
 * when it exists. The curated `ITEMS` list uses hyphenated ids
 * (`poke-ball`); incoming PokéAPI slugs use underscores. Normalise both
 * before comparing.
 */
function curatedItem(slug: string): Item | undefined {
  const norm = slug.replace(/_/g, "-");
  return ITEMS.find((i) => i.id === norm || i.id === slug);
}

/**
 * Build the `cobblemon:`-prefixed id that the `ItemIcon` lookup chain
 * (registry → bundled sprite → PokéAPI → Minecraft Wiki → SVG) expects.
 * Mirrors the helper in `/items/page.tsx` so both pages render the
 * same artwork.
 */
function cobblemonItemId(id: string): string {
  return `cobblemon:${id.replace(/-/g, "_")}`;
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = lookupItem(id);
  const curated = curatedItem(id);
  const holders = getItemHolders(id);

  if (!item && holders.length === 0 && !curated) notFound();

  const englishName = item?.nameEn ?? humanize(id);
  // Prefer the curated French label (matches what the items grid
  // shows), then the Smogon FR table, then the English name. This way
  // "Poké Ball" stays "Poké Ball" on its detail page even when PokéAPI
  // dumped "Poke Ball" without the accent.
  const display = curated?.name ?? (item ? frItem(englishName).label : englishName);
  const description = curated?.description ?? item?.shortEffect ?? null;
  const flavor = item?.description && item.description !== description ? item.description : null;
  const iconId = cobblemonItemId(curated?.id ?? id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/items"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour aux objets
      </Link>

      {/* Hero */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Use the same fallback chain as the items grid — works
                for cobblemon-only items (apricorns, berries) that the
                Smogon icon set never had. */}
            <div className="grid size-16 shrink-0 place-items-center rounded-md border bg-muted/30 p-1">
              <ItemIcon item={iconId} size="size-12" />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <Package className="size-5 text-muted-foreground" />
                <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
                  {display}
                </h1>
                {englishName && englishName !== display && (
                  <span className="text-base italic text-muted-foreground">
                    {englishName}
                  </span>
                )}
              </div>
              {curated?.rarity && (
                <Badge variant="outline" className="w-fit text-[10px] uppercase">
                  {curated.rarity}
                </Badge>
              )}
              {holders.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{holders.length}</strong>{" "}
                  Pokémon le portent fréquemment selon les ladders Smogon.
                </p>
              )}
            </div>
          </div>

          {(description || flavor) && (
            <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
              {description && (
                <p className="text-sm leading-relaxed">{description}</p>
              )}
              {flavor && (
                <p className="flex items-start gap-1.5 text-xs italic text-muted-foreground">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                  {flavor}
                </p>
              )}
              {curated?.obtain && (
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Obtention :</strong>{" "}
                  {curated.obtain}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recipe — only when the curated catalogue carries a grid. The
          MinecraftPanel+Slot widgets are the same the snack section
          uses on /pokedex/[id] so the visual language stays uniform. */}
      {curated?.recipe && <RecipeCard item={curated} />}

      {/* Holders */}
      {holders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Pokémon qui le portent
              <Badge variant="secondary" className="font-mono text-[10px]">
                {holders.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Pourcentage = part de cet objet parmi les choix recordés pour
              le mon (Smogon gen 9).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HolderGrid holders={holders} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecipeCard({ item }: { item: Item }) {
  const recipe = item.recipe!;
  const isCooking = recipe.kind === "cooking";
  const isShapeless = recipe.shapeless === true;
  // Cooking recipes (Campfire Pot) render with the same widget the
  // PokéSnacks page uses — 3×3 ingredient grid, 3-slot seasoning
  // strip on the right (empty for food items, only Pokésnacks
  // fill it), then the result. Pass an empty 3-slot strip so the
  // result lines up with the Pot's in-game UI even when no
  // seasonings apply.
  const emptySeasonings = isCooking ? [null, null, null] : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ChefHat className="size-4 text-muted-foreground" />
          {isCooking ? "Recette (Campfire Pot)" : "Recette"}
          {recipe.output && recipe.output > 1 && (
            <Badge variant="secondary" className="font-mono text-[10px]">
              ×{recipe.output}
            </Badge>
          )}
          {isShapeless && (
            <Badge
              variant="outline"
              className="border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-300"
              title="Recette informe — les ingrédients peuvent être placés dans n'importe quel ordre"
            >
              Informe ⭍
            </Badge>
          )}
        </CardTitle>
        {recipe.note && <CardDescription>{recipe.note}</CardDescription>}
        {!recipe.note && isShapeless && (
          <CardDescription>
            Recette informe : les ingrédients peuvent être placés dans n&apos;importe quel ordre sur la grille.
          </CardDescription>
        )}
        {!recipe.note && !isShapeless && isCooking && (
          <CardDescription>
            Recette de cuisson du Campfire Pot.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {/* `overflow-x-auto` lets the crafting widget scroll
            horizontally on very narrow viewports without forcing the
            whole card to grow. `min-w-fit` on the inner widget keeps
            the bevel intact while it overflows. */}
        <div className="-mx-3 overflow-x-auto px-3 py-1">
          <MinecraftCraftingTable
            grid={recipe.grid}
            seasonings={emptySeasonings}
            result={`cobblemon:${item.id.replace(/-/g, "_")}`}
            resultCount={recipe.output}
            resultLabel={item.name}
            className="min-w-fit"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HolderGrid({ holders }: { holders: ItemHolder[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {holders.map(({ pokemon: p, share }) => (
        <Link
          key={p.id}
          href={`/pokedex/${p.id}`}
          className="group flex items-center gap-2 rounded-md border bg-card p-2 transition-colors hover:bg-accent/40"
        >
          <div className="size-10 shrink-0">
            <PokemonSprite pokemon={p} />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{p.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {(share * 100).toFixed(1)}%
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function humanize(slug: string): string {
  return slug
    .split(/[_-]/)
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join(" ");
}
