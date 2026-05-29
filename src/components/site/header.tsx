"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  BookOpen,
  Users,
  Swords,
  Package,
  Heart,
  LayoutDashboard,
  Calculator,
  Wand2,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/site/type-badge";
import { POKEMON } from "@/data/pokemon";
import { MOVES, lookupMove } from "@/data/moves";
import {
  allAbilitySlugs,
  lookupAbility,
} from "@/data/abilities-pokeapi";
import {
  allHeldItemSlugs,
  lookupItem,
} from "@/data/items-pokeapi";
import { frAbility, frItem } from "@/data/smogon";
import { SmogonItemIcon } from "@/features/pokedex/smogon-item-icon";
import { MobileNav } from "@/components/site/mobile-nav";
import { ThemeToggle } from "@/components/site/theme-toggle";
import type { PokemonTypeId } from "@/types";

const CATEGORY_BADGE_LABEL: Record<string, string> = {
  physical: "Phys", special: "Spé", status: "Stat",
};

const QUICK_ACTIONS = [
  { href: "/",                label: "Dashboard",      icon: LayoutDashboard, hint: "Vue d'ensemble" },
  { href: "/pokedex",         label: "Pokédex",        icon: BookOpen,        hint: "Parcourir 1186 Pokémon" },
  { href: "/battle",          label: "Combat",         icon: Swords,          hint: "Assistant + matrice team-vs-team" },
  { href: "/battle?tab=calc", label: "Calc de dégâts", icon: Calculator,      hint: "Simuler un coup" },
  { href: "/team-builder",    label: "Team Builder",   icon: Users,           hint: "Composer son équipe" },
  { href: "/items",           label: "Objets",         icon: Package,         hint: "Catalogue Cobblemon" },
  { href: "/wishlist",        label: "Wishlist",       icon: Heart,           hint: "Mons à attraper" },
];

export function Header() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const pokemon = useMemo(() => POKEMON, []);
  const moves = useMemo(() => MOVES, []);

  // Pre-resolve once: abilities and held items keyed by slug, each
  // with their FR + EN label so cmdk can match either spelling.
  const abilities = useMemo(
    () =>
      allAbilitySlugs().map((slug) => {
        const a = lookupAbility(slug);
        return {
          slug,
          labelFr: a ? frAbility(a.nameEn).label : slug,
          labelEn: a?.nameEn ?? slug,
        };
      }),
    [],
  );
  const items = useMemo(
    () =>
      allHeldItemSlugs().map((slug) => {
        const it = lookupItem(slug);
        return {
          slug,
          name: it?.nameEn ?? slug,
          labelFr: it ? frItem(it.nameEn).label : slug,
        };
      }),
    [],
  );

  const isSearching = query.trim().length > 0;

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

      <CommandDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        <Command>
          <CommandInput
            placeholder="Tapez le nom d'un Pokémon ou d'une attaque…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Aucun résultat.</CommandEmpty>

            {/* Default view — quick links to the major sections. The
                CommandShortcut child carries data-slot="command-shortcut"
                which the CommandItem styles use to hide the trailing
                invisible check icon (otherwise it'd push real content
                off the right edge). */}
            {!isSearching && (
              <CommandGroup heading="Actions rapides">
                {QUICK_ACTIONS.map((a) => (
                  <CommandItem
                    key={a.href}
                    value={`${a.label} ${a.hint}`}
                    onSelect={() => {
                      setOpen(false);
                      router.push(a.href);
                    }}
                  >
                    <a.icon />
                    <span>{a.label}</span>
                    <CommandShortcut className="text-muted-foreground">
                      {a.hint}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Search-time results — Pokémon + attaques. cmdk filters
                via its internal value match; we leave it to score and
                hide non-matches. */}
            {isSearching && (
              <>
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
                      <span className="font-mono text-xs text-muted-foreground">
                        #{p.dexNumber}
                      </span>
                      <span>{p.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Attaques">
                  {moves.map((m) => {
                    const move = lookupMove(m.id);
                    return (
                      <CommandItem
                        key={m.id}
                        value={`${m.name} ${m.id}`}
                        onSelect={() => {
                          setOpen(false);
                          router.push(`/moves/${m.id}`);
                        }}
                      >
                        <span className="truncate">{move?.name ?? m.name}</span>
                        <CommandShortcut className="flex items-center gap-1.5">
                          <TypeBadge type={m.type as PokemonTypeId} size="sm" />
                          <Badge
                            variant="secondary"
                            className="px-1.5 font-mono text-[10px]"
                          >
                            {CATEGORY_BADGE_LABEL[m.category] ?? m.category}
                          </Badge>
                        </CommandShortcut>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                <CommandGroup heading="Talents">
                  {abilities.map((a) => (
                    <CommandItem
                      key={a.slug}
                      value={`${a.labelFr} ${a.labelEn} ${a.slug}`}
                      onSelect={() => {
                        setOpen(false);
                        router.push(`/abilities/${a.slug}`);
                      }}
                    >
                      <Wand2 className="size-3.5 text-amber-500/70" />
                      <span className="truncate">{a.labelFr}</span>
                      {a.labelEn && a.labelEn !== a.labelFr && (
                        <CommandShortcut className="italic">
                          {a.labelEn}
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandGroup heading="Objets">
                  {items.map((it) => (
                    <CommandItem
                      key={it.slug}
                      value={`${it.labelFr} ${it.name} ${it.slug}`}
                      onSelect={() => {
                        setOpen(false);
                        router.push(`/items/${it.slug}`);
                      }}
                    >
                      <span className="grid size-5 shrink-0 place-items-center">
                        <SmogonItemIcon name={it.name} size={18} />
                      </span>
                      <span className="truncate">{it.labelFr}</span>
                      {it.name && it.name !== it.labelFr && (
                        <CommandShortcut className="italic">
                          {it.name}
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  );
}
