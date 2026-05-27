"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { POKEMON } from "@/data/pokemon";
import { MOVES } from "@/data/moves";
import { MOVE_BY_ID } from "@/data/moves";
import { MobileNav } from "@/components/site/mobile-nav";
import { ThemeToggle } from "@/components/site/theme-toggle";

export function Header() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const pokemon = useMemo(() => POKEMON, []);
  const moves = useMemo(() => MOVES, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <MobileNav />

      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground md:max-w-md"
        onClick={() => setOpen(true)}
      >
        <Search data-icon="inline-start" />
        Rechercher Pokémon, attaque, type…
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] md:inline-flex">
          Ctrl K
        </kbd>
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Tapez le nom d'un Pokémon ou d'une attaque…" />
          <CommandList>
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            <CommandGroup heading="Pokémon">
              {pokemon.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.id} ${p.dexNumber}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/pokedex/${p.id}`);
                  }}
                >
                  <span className="mr-2 font-mono text-xs text-muted-foreground">
                    #{p.dexNumber}
                  </span>
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Attaques">
              {moves.map((m) => {
                const move = MOVE_BY_ID[m.id];
                return (
                  <CommandItem
                    key={m.id}
                    value={`${m.name} ${m.id}`}
                    onSelect={() => {
                      setOpen(false);
                      // Moves no longer have a dedicated page — surface the
                      // first Pokémon that knows the move so the user gets
                      // somewhere useful.
                      const learner = POKEMON.find((p) =>
                        p.notableMoves.includes(m.id),
                      );
                      router.push(
                        learner ? `/pokedex/${learner.id}` : "/pokedex",
                      );
                    }}
                  >
                    {move?.name ?? m.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {m.type} · {m.category}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  );
}
