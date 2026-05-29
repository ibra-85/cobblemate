import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { SmogonItemIcon } from "@/features/pokedex/smogon-item-icon";
import {
  lookupItem,
  getItemHolders,
  allHeldItemSlugs,
  type ItemHolder,
} from "@/data/items-pokeapi";
import { frItem } from "@/data/smogon";

export function generateStaticParams() {
  return allHeldItemSlugs().map((id) => ({ id }));
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = lookupItem(id);
  const holders = getItemHolders(id);

  if (!item && holders.length === 0) notFound();

  // The icon component expects the English Smogon name; we fall back
  // to humanising the slug when PokéAPI didn't have the item.
  const englishName = item?.nameEn ?? humanize(id);
  const display = item ? frItem(englishName).label : englishName;

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
            <div className="grid size-16 shrink-0 place-items-center rounded-md border bg-muted/30 p-1">
              <SmogonItemIcon name={englishName} size={56} />
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
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">{holders.length}</strong>{" "}
                Pokémon le portent fréquemment selon les ladders Smogon.
              </p>
            </div>
          </div>

          {(item?.shortEffect || item?.description) && (
            <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
              {item.shortEffect && (
                <p className="text-sm leading-relaxed">{item.shortEffect}</p>
              )}
              {item.description && item.description !== item.shortEffect && (
                <p className="flex items-start gap-1.5 text-xs italic text-muted-foreground">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                  {item.description}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
    .split("_")
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join(" ");
}
