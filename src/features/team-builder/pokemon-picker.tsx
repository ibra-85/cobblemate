"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON } from "@/data/pokemon";
import { searchPokemon } from "@/lib/search";

interface Props {
  onPick: (pokemonId: string) => void;
  /** Render-prop trigger; falls back to a dashed "+" tile. */
  trigger?: React.ReactNode;
  excludeIds?: string[];
}

export function PokemonPicker({ onPick, trigger, excludeIds = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = searchPokemon(query).filter((p) => !excludeIds.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <button
              type="button"
              className="grid h-32 w-full place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Plus className="size-6" />
            </button>
          )
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choisir un Pokémon</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Tapez un nom…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ScrollArea className="h-80">
          <div className="space-y-1 pr-2">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onPick(p.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left hover:border-border hover:bg-accent"
              >
                <PokemonSprite pokemon={p} size="size-10" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">#{p.dexNumber}</p>
                </div>
                <TypeBadges types={p.types} size="sm" />
              </button>
            ))}
            {results.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun résultat.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
