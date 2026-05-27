"use client";

import Link from "next/link";
import { Dices, Plus, Swords, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON } from "@/data/pokemon";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import { useWishlist } from "@/hooks/use-wishlist";

/**
 * Adaptive hero: greeting + headline counters depend on what the user
 * already has. Sprites on the right form a dynamic floating mosaic with
 * varied sizes / rotations / z-indexes for a "game launcher" feel.
 */
export function HeroBanner() {
  const { teams, hydrated: teamsReady } = useSavedTeams();
  const { ids: wishlistIds, hydrated: wishlistReady } = useWishlist();

  const teamCount = teams.length;
  const wishlistCount = wishlistIds.length;
  const hasData = teamCount > 0 || wishlistCount > 0;
  const hydrated = teamsReady && wishlistReady;

  // Hand-picked sprites for the floating mosaic; each tile defines its own
  // size + offset for visual depth.
  const mosaic = [
    { p: POKEMON.find((x) => x.id === "charizard") ?? POKEMON[0], size: "size-32", offset: "right-4 top-6 rotate-[-6deg]" },
    { p: POKEMON.find((x) => x.id === "lucario") ?? POKEMON[1],   size: "size-28", offset: "right-36 top-2 rotate-[8deg]" },
    { p: POKEMON.find((x) => x.id === "gengar") ?? POKEMON[2],    size: "size-24", offset: "right-60 top-12 rotate-[-4deg]" },
    { p: POKEMON.find((x) => x.id === "togekiss") ?? POKEMON[3],  size: "size-20", offset: "right-2 bottom-2 rotate-[10deg]" },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/10 p-6 md:p-10">
      <div className="relative z-10 flex max-w-2xl flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="size-3" />
            Compagnon Cobblemon 1.7.3
          </Badge>
          {hydrated && hasData && (
            <Badge variant="outline" className="font-mono">
              {teamCount} équipe{teamCount > 1 ? "s" : ""} · {wishlistCount} wishlist
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">
            {!hydrated
              ? "CobbleMate"
              : hasData
                ? "Re-bienvenue, dresseur"
                : "Bienvenue sur CobbleMate"}
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            {!hydrated
              ? "Chargement de ton historique…"
              : hasData
                ? "Reprends là où tu t'étais arrêté ou explore un nouveau matchup."
                : "Compose ta première équipe, analyse les matchups et trouve la prochaine capture en un clic."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/team-builder" />}>
            <Plus data-icon="inline-start" />
            Nouvelle équipe
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/team-builder?random=1" />}
          >
            <Dices data-icon="inline-start" />
            Équipe aléatoire
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/battle" />}
          >
            <Swords data-icon="inline-start" />
            Combat
          </Button>
        </div>
      </div>

      {/* Sprite mosaic — purely decorative, hidden on mobile/tablet. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        {mosaic.map(({ p, size, offset }, i) => (
          <div
            key={p.id}
            className={`absolute ${offset} ${size} grid place-items-center rounded-2xl border bg-background/50 p-2 shadow-xl backdrop-blur transition-transform`}
          >
            {/* First mosaic tile is often the LCP — preload it. */}
            <PokemonSprite pokemon={p} variant="artwork" priority={i === 0} />
          </div>
        ))}
      </div>
    </section>
  );
}
