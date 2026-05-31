"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { TypeBadges, TypeBadge } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { ItemIcon } from "@/components/site/minecraft-item";
import {
  findItemById,
  searchItems,
} from "@/data/competitive-items";
import {
  findMoveById,
  moveDisplayName,
  searchMoves,
} from "@/data/competitive-moves";
import { getSpeciesExtras } from "@/data/species-extras";
import type { Pokemon, TeamSlot } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  pokemon: Pokemon;
  slot: TeamSlot;
  onApply: (patch: Partial<TeamSlot>) => void;
}

/**
 * Per-Pokémon set configuration: talent + item (Phase 1).
 *
 * Talent rules (mirrors the strict policy the engine now enforces):
 *  - Single-ability mons auto-select → the dialog still lets the
 *    user *confirm* the choice but the selection is pre-filled.
 *  - Multi-ability mons must be picked explicitly; the engine
 *    refuses to credit any ability bonus until the user chooses.
 *
 * Item: a curated list of competitive held items (Boots, Choice
 * trio, Leftovers, Life Orb, vests, sashes, plates, …). The user
 * can also type a free-text item id — the engine matches Boots by
 * id pattern, the other items are reserved for V3.x scoring hooks.
 */
// Item registry now lives in `src/data/competitive-items.ts` — the
// canonical source the slot card, this dialog, and any future picker
// all read from. Imported above.

export function SlotConfigDialog({ pokemon, slot, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [ability, setAbility] = useState<string | undefined>(
    slot.selectedAbility,
  );
  const [item, setItem] = useState<string>(slot.selectedItem ?? "");
  // Always 4 slots — empty strings represent "non choisi" slots so
  // the UI doesn't have to special-case length when reordering or
  // clearing. Saved teams persist only the non-empty entries.
  const [moves, setMoves] = useState<string[]>(() => {
    const arr = (slot.selectedMoves ?? []).slice(0, 4);
    while (arr.length < 4) arr.push("");
    return arr;
  });

  // Ability options — combine the regular slots with the hidden one,
  // dedup by name (some species list the same name in both fields).
  const abilityOptions = useMemo(() => {
    const opts: { name: string; hidden?: boolean }[] = [];
    const seen = new Set<string>();
    for (const a of pokemon.abilities) {
      if (a && !seen.has(a)) {
        opts.push({ name: a });
        seen.add(a);
      }
    }
    if (pokemon.hiddenAbility && !seen.has(pokemon.hiddenAbility)) {
      opts.push({ name: pokemon.hiddenAbility, hidden: true });
    }
    return opts;
  }, [pokemon.abilities, pokemon.hiddenAbility]);

  const singleOption =
    abilityOptions.length === 1 ? abilityOptions[0]!.name : undefined;
  const effectiveAbility = ability ?? singleOption;

  // Pokémon learnset — pulled once on dialog mount. Empty Set falls
  // back to "no filter" so the picker still works on species missing
  // from species-extras (rare edge case, future generations).
  const learnset = useMemo(() => {
    const m = getSpeciesExtras(pokemon.id)?.movesByMethod;
    if (!m) return new Set<string>();
    const out = new Set<string>();
    for (const lm of m.level) out.add(lm.move);
    for (const id of m.tm) out.add(id);
    for (const id of m.egg) out.add(id);
    for (const id of m.tutor) out.add(id);
    return out;
  }, [pokemon.id]);

  function reset() {
    setAbility(slot.selectedAbility);
    setItem(slot.selectedItem ?? "");
    const arr = (slot.selectedMoves ?? []).slice(0, 4);
    while (arr.length < 4) arr.push("");
    setMoves(arr);
  }

  function commit() {
    const cleanMoves = moves.filter((m) => m);
    onApply({
      selectedAbility: effectiveAbility,
      selectedItem: item || undefined,
      selectedMoves: cleanMoves.length > 0 ? cleanMoves : undefined,
    });
    setOpen(false);
  }

  function setMoveAt(index: number, id: string) {
    setMoves((prev) => prev.map((m, i) => (i === index ? id : m)));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Configurer ${pokemon.name}`}
            title="Configurer (talent, objet)"
            // Top-left corner of the slot card, mirrors the position
            // of the top-right ✕ (clear) button so both affordances
            // are obvious without explanation.
            className="absolute left-2 top-2 z-10 grid size-6 cursor-pointer place-items-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:text-primary group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Settings2 className="size-3.5" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PokemonSprite pokemon={pokemon} size="size-8" />
            <span>{pokemon.name}</span>
            <span className="font-mono text-xs text-muted-foreground">
              #{pokemon.dexNumber}
            </span>
          </DialogTitle>
          <DialogDescription>
            Configurer le talent, l&apos;objet et les 4 attaques du
            slot. Le scoring lit uniquement ce qui est défini ici —
            tant qu&apos;une zone est vide, les bonus liés restent
            potentiels.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* ─── Talent ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <Label>Talent actif</Label>
            <div className="flex flex-wrap gap-1.5">
              {abilityOptions.map((opt) => {
                const active = effectiveAbility === opt.name;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setAbility(opt.name)}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary/50 hover:bg-accent",
                    )}
                  >
                    {opt.name}
                    {opt.hidden && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-1 text-[9px]",
                          active && "border-primary-foreground/30 text-primary-foreground/80",
                        )}
                      >
                        caché
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
            {abilityOptions.length === 1 && (
              <p className="text-[10px] text-muted-foreground">
                Talent unique — auto-sélectionné. Le bonus stratégique
                associé est appliqué.
              </p>
            )}
            {abilityOptions.length > 1 && !ability && (
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                Plusieurs talents possibles. Choisis-en un pour que le
                scoring crédite le bonus.
              </p>
            )}
          </div>

          {/* ─── Objet ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <Label>Objet tenu</Label>
            <ItemPickerPopover
              selected={item}
              onChange={setItem}
            />
            <p className="text-[10px] text-muted-foreground">
              Le scoring détecte Grosses Bottes pour annuler la
              pénalité Piège de Roc. Les autres objets seront pondérés
              à la prochaine phase.
            </p>
          </div>

          {/* ─── Attaques (4 slots) ────────────────────────────────
              Each slot is its own Popover combobox — opening it
              surfaces the search input and the filtered move list in
              a popover rather than expanding inline, keeping the
              dialog compact when no slot is being edited. Filling
              moves flips the scoring engine into set-aware mode (role
              bonuses become "confirmed" instead of "potential"). */}
          <div className="flex flex-col gap-2">
            <Label>Attaques choisies</Label>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {moves.map((moveId, i) => (
                <MovePickerPopover
                  key={i}
                  index={i}
                  moveId={moveId}
                  learnset={learnset}
                  otherMoves={moves.filter((_, idx) => idx !== i).filter(Boolean)}
                  onChange={(id) => setMoveAt(i, id)}
                  onClear={() => setMoveAt(i, "")}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tant que les attaques ne sont pas définies, les rôles
              restent <em>potentiels</em>. Avec un set complet, ils
              deviennent <em>confirmés</em> et le scoring crédite
              fortement les bonus correspondants.
            </p>
          </div>

          {/* ─── Type recap ─────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Types</span>
            <TypeBadges types={pokemon.types} size="sm" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={commit}>Appliquer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Combobox-style item picker.
 *
 * A compact trigger button (showing the current selection: icon +
 * French name + ▼) opens a popover with `Command` inside — search
 * input on top, virtual-scrolled list of items below.
 *
 * Filtering routes through `searchItems` so the bilingual aliases
 * (`"boots"` ↔ `"bottes"` ↔ `"heavy_duty"`) keep working — `Command`
 * runs in `shouldFilter={false}` mode and we feed it the already
 * filtered results.
 */
function ItemPickerPopover({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => searchItems(query), [query]);
  const resolved = findItemById(selected);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent",
              selected ? "" : "text-muted-foreground italic",
            )}
          >
            {selected ? (
              <>
                <ItemIcon item={selected} size="size-5" />
                <span className="min-w-0 flex-1 truncate">
                  {resolved ? (
                    resolved.nameFr
                  ) : (
                    <em className="not-italic">{selected}</em>
                  )}
                </span>
                {resolved?.tag && (
                  <Badge variant="outline" className="shrink-0 text-[9px]">
                    {resolved.tag}
                  </Badge>
                )}
              </>
            ) : (
              <span className="flex-1 truncate">Choisir un objet…</span>
            )}
            <ChevronDown className="size-4 shrink-0 opacity-60" />
          </button>
        }
      />
      <PopoverContent
        className="w-[var(--anchor-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher (fr/en)…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {query.trim() ? (
                <span className="block px-2 text-xs italic text-muted-foreground">
                  Aucun objet trouvé. Tape <kbd className="rounded border bg-muted px-1">Entrée</kbd> pour utiliser «&nbsp;{query.trim()}&nbsp;» comme id custom.
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Aucun résultat.
                </span>
              )}
            </CommandEmpty>
            {selected && (
              <CommandGroup heading="Actuel">
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <X className="size-4 text-destructive" />
                  <span>Retirer l&apos;objet</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading={`${filtered.length} objet${filtered.length > 1 ? "s" : ""}`}>
              {filtered.map((it) => (
                <CommandItem
                  key={it.id}
                  value={it.id}
                  onSelect={(v) => {
                    onChange(v === selected ? "" : v);
                    setOpen(false);
                    setQuery("");
                  }}
                  data-checked={selected === it.id || undefined}
                >
                  <ItemIcon item={it.id} size="size-5" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{it.nameFr}</span>
                    <span className="truncate text-[10px] italic text-muted-foreground">
                      {it.nameEn}
                    </span>
                  </div>
                  {it.tag && (
                    <Badge variant="outline" className="shrink-0 text-[9px]">
                      {it.tag}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Combobox-style picker for one of the 4 move slots.
 *
 * Visually mirrors `ItemPickerPopover`: a compact trigger with
 * "1. Non choisi" / "1. ⚪ Danse Draco" + ▼. The popover lists moves
 * filtered to the Pokémon's learnset, with already-picked moves on
 * the *other* slots filtered out so duplicates can't be picked.
 */
function MovePickerPopover({
  index,
  moveId,
  learnset,
  otherMoves,
  onChange,
  onClear,
}: {
  index: number;
  moveId: string;
  learnset: Set<string>;
  otherMoves: string[];
  onChange: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const move = findMoveById(moveId);

  const filtered = useMemo(() => {
    const banned = new Set(otherMoves);
    const filter = learnset.size > 0 ? learnset : undefined;
    return searchMoves(query, filter).filter((m) => !banned.has(m.id));
  }, [query, learnset, otherMoves]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-left text-xs transition-colors",
              moveId
                ? "hover:border-primary/50 hover:bg-accent"
                : "border-dashed text-muted-foreground hover:border-primary/50 hover:bg-accent",
            )}
          >
            <span className="font-mono text-[10px] text-muted-foreground">
              {index + 1}.
            </span>
            {move ? (
              <>
                <TypeBadge type={move.type} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {move.nameFr}
                </span>
              </>
            ) : moveId ? (
              <span className="min-w-0 flex-1 truncate italic">
                {moveDisplayName(moveId)}
              </span>
            ) : (
              <span className="min-w-0 flex-1 truncate italic">Non choisi</span>
            )}
            {moveId ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                  setOpen(false);
                }}
                aria-label="Retirer le move"
                title="Retirer"
                className="cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            ) : (
              <ChevronDown className="size-3.5 shrink-0 opacity-60" />
            )}
          </button>
        }
      />
      <PopoverContent
        className="w-[var(--anchor-width)] min-w-72 p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher (fr/en)…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <span className="text-xs italic text-muted-foreground">
                {learnset.size === 0
                  ? "Aucun learnset connu pour ce Pokémon."
                  : query.trim()
                  ? "Aucun move stratégique ne correspond."
                  : "Aucun move stratégique au learnset."}
              </span>
            </CommandEmpty>
            <CommandGroup heading={`${filtered.length} move${filtered.length > 1 ? "s" : ""}`}>
              {filtered.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.id}
                  onSelect={(v) => {
                    onChange(v);
                    setOpen(false);
                    setQuery("");
                  }}
                  data-checked={moveId === m.id || undefined}
                >
                  <TypeBadge type={m.type} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{m.nameFr}</span>
                    <span className="truncate text-[10px] italic text-muted-foreground">
                      {m.nameEn}
                      {m.power ? ` · ${m.power} pwr` : ""}
                      {m.category === "status" ? " · statut" : ""}
                    </span>
                  </div>
                  {m.tags[0] && (
                    <Badge variant="outline" className="shrink-0 text-[9px]">
                      {prettyTag(m.tags[0])}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Convert a move tag to a short French label for the row chip. */
function prettyTag(tag: string): string {
  const map: Record<string, string> = {
    setup: "Setup",
    "boost-attack": "+Atk",
    "boost-spatk": "+SpA",
    "boost-speed": "+Vit",
    "boost-defense": "+Déf",
    "boost-spdef": "+DSp",
    priority: "Priorité",
    pivot: "Pivot",
    "hazard-setup": "Hazard",
    "hazard-removal": "Removal",
    recovery: "Récup",
    "wish-recovery": "Vœu",
    status: "Statut",
    burn: "Brûlure",
    paralysis: "Paralysie",
    sleep: "Sommeil",
    poison: "Poison",
    screen: "Écran",
    trap: "Piège",
    phaze: "Phaze",
    "stab-anchor": "STAB",
    "anti-setup": "Anti-setup",
  };
  return map[tag] ?? tag;
}
