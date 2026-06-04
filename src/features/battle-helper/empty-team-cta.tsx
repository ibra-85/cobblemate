"use client";

import Link from "next/link";
import { Hammer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PokemonPicker } from "@/features/team-builder/pokemon-picker";
import { cn } from "@/lib/utils";

/**
 * Empty-state banner shown in the Combat tabs (Assistant + Team vs
 * Team) when the user has zero saved teams *and* zero Pokémon in the
 * ad-hoc grid. The previous default — six dashed "Ajouter" slots —
 * reads as a broken half-built UI; playtesters kept clicking expecting
 * them to be pre-populated.
 *
 * Two CTAs, both intentional:
 *   - **Primary** ("Aller au Builder") — the canonical path for
 *     anything the user wants to keep across sessions.
 *   - **Secondary** ("Composer à la volée") — the escape hatch for a
 *     one-shot test. Opens the PokemonPicker and drops the result in
 *     slot 0; as soon as that lands the grid takes over and the CTA
 *     disappears.
 */
export function EmptyTeamCTA({
  onCompose,
}: {
  onCompose: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/30 px-4 py-6 text-center">
      <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Hammer className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">Aucune équipe enregistrée</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Crée et sauvegarde une équipe dans le Builder pour la charger
          ici en un clic — ou compose rapidement une équipe de test.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* base-ui's Button doesn't expose `asChild`, so we paint the
            button styles directly on a `<Link>`. Cleaner than wrapping
            a Link inside a Button — the anchor stays the keyboard /
            screen-reader-visible target. */}
        <Link href="/team-builder" className={cn(buttonVariants({ size: "sm" }))}>
          Aller au Builder
        </Link>
        <PokemonPicker
          onPick={onCompose}
          trigger={
            <Button variant="outline" size="sm">
              Composer à la volée
            </Button>
          }
        />
      </div>
    </div>
  );
}
