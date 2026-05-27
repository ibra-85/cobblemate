"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON } from "@/data/pokemon";
import { TYPES_META } from "@/data/types";
import type { PokemonTypeId } from "@/types";
import { baseStatTotal } from "@/lib/pokemon-utils";
import { searchPokemon } from "@/lib/search";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (pokemonId: string) => void;
  trigger?: React.ReactNode;
  excludeIds?: string[];
}

const ALL_TYPES = Object.keys(TYPES_META) as PokemonTypeId[];

export function PokemonPicker({ onPick, trigger, excludeIds = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<PokemonTypeId | null>(null);

  const results = useMemo(() => {
    let list = searchPokemon(query).filter((p) => !excludeIds.includes(p.id));
    if (typeFilter) list = list.filter((p) => p.types.includes(typeFilter));
    return list;
  }, [query, typeFilter, excludeIds]);

  function pickAndClose(id: string) {
    onPick(id);
    setOpen(false);
    setQuery("");
    setTypeFilter(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQuery("");
          setTypeFilter(null);
        }
      }}
    >
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Choisir un Pokémon</DialogTitle>
          <DialogDescription>
            Recherche par nom ou filtre par type.
          </DialogDescription>
        </DialogHeader>

        <InputGroup>
          <InputGroupAddon>
            <Search className="size-4 opacity-60" />
          </InputGroupAddon>
          <InputGroupInput
            autoFocus
            placeholder="Tapez un nom…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <div className="-mx-1 flex flex-wrap gap-1">
          {ALL_TYPES.map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(active ? null : t)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition",
                  active
                    ? "ring-2 ring-offset-2 ring-offset-popover"
                    : "opacity-60 hover:opacity-100",
                )}
                style={{
                  backgroundColor: TYPES_META[t].color,
                  color: TYPES_META[t].fg,
                }}
              >
                {TYPES_META[t].label}
              </button>
            );
          })}
          {(typeFilter || query) && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter(null);
                setQuery("");
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              Reset
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {results.length} résultat{results.length > 1 ? "s" : ""}
          {excludeIds.length > 0 && ` · ${excludeIds.length} déjà dans l'équipe`}
        </p>

        <ScrollArea className="h-80">
          <div className="flex flex-col gap-1 pr-2">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickAndClose(p.id)}
                className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left hover:border-border hover:bg-accent"
              >
                <PokemonSprite pokemon={p} size="size-10" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    #{p.dexNumber} · BST {baseStatTotal(p)} · {p.roles[0] ?? "—"}
                  </span>
                </div>
                <TypeBadges types={p.types} size="sm" />
              </button>
            ))}
            {results.length === 0 && (
              <div className="flex flex-col items-center gap-1 py-10 text-center text-sm text-muted-foreground">
                <Badge variant="outline">Rien trouvé</Badge>
                <p>Essaie un autre nom ou retire le filtre de type.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
