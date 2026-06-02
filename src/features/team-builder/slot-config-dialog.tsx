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
  findPickableMove,
  moveDisplayName,
  searchPickableMoves,
} from "@/data/competitive-moves";
import { getSpeciesExtras } from "@/data/species-extras";
import {
  frAbility,
  getSmogonStats,
  smogonMoveToId,
  type SmogonSet,
  type SmogonStats,
} from "@/data/smogon";
import {
  smogonItemToAppId,
  smogonSetToSlotPatch,
} from "@/lib/smogon-set-mapping";
import {
  NATURES,
  findNature,
  natureEffectFr,
} from "@/lib/natures";
import {
  abilityDisplayFr,
  matchAbilityToPokemon,
} from "@/lib/ability-utils";
import type { EvSpread, Pokemon, TeamSlot } from "@/types";
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
  const [nature, setNature] = useState<string>(slot.nature ?? "");
  const [evs, setEvs] = useState<EvSpread>(slot.evs ?? {});
  const [ivs, setIvs] = useState<EvSpread>(slot.ivs ?? {});

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

  // Smogon usage + curated sets, keyed by the lowercase English id
  // which the app shares with Smogon's data dump. Drives the "Sets
  // populaires" panel + the ⭐ recommended markers on talent and item.
  // `null` for mons the Smogon dataset doesn't cover yet — the panel
  // simply doesn't render, no other surface is affected.
  const smogon: SmogonStats | null = useMemo(
    () => getSmogonStats(pokemon.id),
    [pokemon.id],
  );

  /**
   * Top-share Smogon ability that matches one of the Pokémon's actual
   * ability slots. Matching goes through `matchAbilityToPokemon` so
   * the EN-collapsed vs. EN-spaced vs. FR shapes don't trip up the
   * comparison — same helper the optimiser uses, so "⭐ Recommandé"
   * lights up exactly when "Optimiser sets" would apply the talent.
   */
  const recommendedAbility = useMemo(() => {
    if (!smogon) return null;
    const pokemonAbilities = [...pokemon.abilities, pokemon.hiddenAbility];
    for (const a of smogon.abilities) {
      const matched = matchAbilityToPokemon(a.name, pokemonAbilities);
      if (matched && abilityOptions.find((o) => o.name === matched)) {
        return { name: matched, share: a.share };
      }
    }
    return null;
  }, [smogon, abilityOptions, pokemon.abilities, pokemon.hiddenAbility]);

  /**
   * Up to 3 most-popular Smogon items, resolved to app ids. We surface
   * them as quick-pick chips below the item picker so the user can
   * one-click the meta choices without opening the full popover. Same
   * "stop at first match" logic isn't strictly needed here — we just
   * cap at 3 and let unknown items fall through to a slug-based id
   * that the icon component still recognises.
   */
  const recommendedItems = useMemo(() => {
    if (!smogon) return [] as { id: string; share: number; nameEn: string }[];
    return smogon.items
      .slice(0, 3)
      .map((it) => ({ id: smogonItemToAppId(it.name), share: it.share, nameEn: it.name }));
  }, [smogon]);

  // Pokémon learnset — pulled once on dialog mount. Empty Set falls
  // back to "no filter" so the picker still works on species missing
  // from species-extras (rare edge case, future generations).
  const learnset = useMemo(() => {
    const m = getSpeciesExtras(pokemon.id)?.movesByMethod;
    if (!m) return new Set<string>();
    const out = new Set<string>();
    // All six buckets contribute — `legacy` covers move tutors from
    // past gens (BDSP transfer-onlies, Let's Go moves that survived)
    // and `special` covers event-only moves. Excluding them used to
    // hide perfectly legal Cobblemon-supported sets (e.g. Dracolosse's
    // Extreme Speed comes via `legacy`/event in many move dumps).
    for (const lm of m.level) out.add(lm.move);
    for (const id of m.tm) out.add(id);
    for (const id of m.egg) out.add(id);
    for (const id of m.tutor) out.add(id);
    for (const id of m.legacy) out.add(id);
    for (const id of m.special) out.add(id);
    return out;
  }, [pokemon.id]);

  function reset() {
    setAbility(slot.selectedAbility);
    setItem(slot.selectedItem ?? "");
    const arr = (slot.selectedMoves ?? []).slice(0, 4);
    while (arr.length < 4) arr.push("");
    setMoves(arr);
    setNature(slot.nature ?? "");
    setEvs(slot.evs ?? {});
    setIvs(slot.ivs ?? {});
  }

  function commit() {
    const cleanMoves = moves.filter((m) => m);
    const hasEvs = Object.values(evs).some((v) => (v ?? 0) > 0);
    const hasIvs = Object.values(ivs).some((v) => v !== undefined && v < 31);
    onApply({
      selectedAbility: effectiveAbility,
      selectedItem: item || undefined,
      selectedMoves: cleanMoves.length > 0 ? cleanMoves : undefined,
      nature: nature || undefined,
      // Persist EVs only when at least one stat is non-zero — empty
      // spreads would clutter the JSON export needlessly.
      evs: hasEvs ? evs : undefined,
      // Persist IVs only when at least one is below the default 31.
      // The norm is "31 everywhere"; only deltas matter for storage.
      ivs: hasIvs ? ivs : undefined,
    });
    setOpen(false);
  }

  function setMoveAt(index: number, id: string) {
    setMoves((prev) => prev.map((m, i) => (i === index ? id : m)));
  }

  /**
   * One-click apply for a Smogon curated set. Translation logic lives
   * in `smogonSetToSlotPatch` so the team-wide "Optimiser sets"
   * button reuses the exact same mapping — no risk of the two
   * surfaces drifting on edge cases.
   *
   * Staging-only: this writes to the dialog's local form state. The
   * user still confirms via the dialog footer's "Appliquer" — matches
   * the "recommandation ≠ auto-remplissage" UX rule.
   */
  function applySet(set: SmogonSet) {
    // Pass `smogon` so the ability resolver can fall back to the
    // dex's most-used ability when the set's own `ability` is null
    // — same trick the team-wide "Optimiser sets" uses.
    const patch = smogonSetToSlotPatch(set, pokemon, smogon);
    if (patch.selectedAbility) setAbility(patch.selectedAbility);
    if (patch.selectedItem !== undefined) setItem(patch.selectedItem);
    if (patch.selectedMoves) {
      const padded = [...patch.selectedMoves];
      while (padded.length < 4) padded.push("");
      setMoves(padded);
    }
    if (patch.nature !== undefined) setNature(patch.nature);
    if (patch.evs) setEvs(patch.evs);
    if (patch.ivs) setIvs(patch.ivs);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Re-sync the form from the *current* slot prop on every
        // open transition — otherwise `useState` keeps the
        // initial-mount values and a slot that was edited via
        // "Optimiser sets" while the dialog was closed would show
        // empty data on first open (the user reported this: needed
        // to close+reopen to see the fresh data).
        if (o) reset();
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
      {/* `max-h-[90vh]` + `flex flex-col` so the dialog never exceeds
          the viewport. The body section scrolls internally while the
          header (title + description) and footer ("Annuler" /
          "Appliquer") stay pinned and always reachable — without this,
          the Sets populaires panel + talent + item + 4 moves could
          push the validate button off-screen. */}
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 sm:max-w-lg">
        <DialogHeader className="shrink-0">
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

        {/* Scrollable body — `min-h-0` is mandatory in a flex column
            so this child actually shrinks (the default `min-height:
            auto` would let it grow to its content and push the footer
            off-screen). `-mx-4 px-4` pulls the scrollbar to the edge
            of the dialog so the content keeps its 16px margin. */}
        <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-3">
          {/* ─── Sets populaires (Smogon) ───────────────────────────
              Curated sets from the Smogon analyses dump, surfaced as
              one-click "Appliquer" affordances. We never auto-apply on
              mount — the user explicitly chose to open the configurator
              and we stage their pick into form state so the bottom
              "Appliquer" button stays the single commit gesture. */}
          {smogon && smogon.sets.length > 0 && (
            <SmogonSetsPanel sets={smogon.sets} onApply={applySet} />
          )}

          {/* ─── Talent ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <Label>Talent actif</Label>
            <div className="flex flex-wrap gap-1.5">
              {abilityOptions.map((opt) => {
                const active = effectiveAbility === opt.name;
                const recommended = recommendedAbility?.name === opt.name;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setAbility(opt.name)}
                    title={
                      recommended
                        ? `Talent le plus joué sur Smogon · ${Math.round(recommendedAbility!.share * 100)}% des sets`
                        : undefined
                    }
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary/50 hover:bg-accent",
                    )}
                  >
                    {recommended && (
                      <span aria-hidden className="text-amber-500">
                        ★
                      </span>
                    )}
                    {abilityDisplayFr(opt.name)}
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
            {recommendedAbility && (
              <p className="text-[10px] text-muted-foreground">
                <span className="text-amber-600 dark:text-amber-400">★</span>{" "}
                <span className="font-medium">
                  {abilityDisplayFr(recommendedAbility.name)}
                </span>{" "}
                joué dans ~{Math.round(recommendedAbility.share * 100)}% des
                sets Smogon ({smogon!.tier}).
              </p>
            )}
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
            {recommendedItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Top Smogon
                </span>
                {recommendedItems.map((rec, i) => {
                  const known = findItemById(rec.id);
                  const active = item === rec.id;
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => setItem(rec.id)}
                      title={`${rec.nameEn} · ${Math.round(rec.share * 100)}% des sets`}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors",
                        active
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/50 hover:bg-accent",
                      )}
                    >
                      {i === 0 && (
                        <span aria-hidden className="text-amber-500">
                          ★
                        </span>
                      )}
                      <ItemIcon item={rec.id} size="size-4" />
                      <span className="max-w-[8rem] truncate">
                        {known?.nameFr ?? rec.nameEn}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {Math.round(rec.share * 100)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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

          {/* ─── Nature + EVs ───────────────────────────────────── */}
          <NatureAndEvs
            nature={nature}
            onNatureChange={setNature}
            evs={evs}
            onEvsChange={setEvs}
            ivs={ivs}
            onIvsChange={setIvs}
          />

          {/* ─── Type recap ─────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Types</span>
            <TypeBadges types={pokemon.types} size="sm" />
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t pt-3">
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
  // `findPickableMove` walks both the curated strategic registry and
  // the broader generated dump, so already-set moves like Rafale
  // Écailles / Crocs Feu render with their type badge + French name
  // even when the curated registry doesn't track them.
  const move = findPickableMove(moveId);

  const filtered = useMemo(() => {
    const banned = new Set(otherMoves);
    const filter = learnset.size > 0 ? learnset : undefined;
    return searchPickableMoves(query, filter).filter((m) => !banned.has(m.id));
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
              // Rendered as a `<span role="button">` because the popover
              // trigger above is already a `<button>` — nesting a real
              // `<button>` inside would trigger a hydration warning and
              // is invalid HTML. The span keeps full keyboard support
              // via the Enter/Space handler.
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onClear();
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    e.preventDefault();
                    onClear();
                    setOpen(false);
                  }
                }}
                aria-label="Retirer le move"
                title="Retirer"
                className="cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive"
              >
                <X className="size-3" />
              </span>
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
                  ? "Aucune attaque ne correspond."
                  : "Aucune attaque au learnset."}
              </span>
            </CommandEmpty>
            <CommandGroup heading={`${filtered.length} attaque${filtered.length > 1 ? "s" : ""}`}>
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

/**
 * Curated Smogon sets surfaced at the top of the dialog. Each row is
 * one set: name + ability + item + 4 moves + an "Appliquer" button
 * that stages the picks into the form (the user still commits via the
 * dialog footer). Compact by design — three columns on sm+ so the
 * panel doesn't push the talent/item/moves form below the fold.
 */
// ─── Nature + EVs / IVs editor ─────────────────────────────────────

// Natures data + helpers live in `@/lib/natures` — single source of
// truth shared with the slot card display.

/**
 * Common EV preset spreads. Lets the user one-click the 95% case
 * (offensive 252/252/4) without typing — Smogon sets ship the bespoke
 * numbers, but for an ad-hoc team build the user just wants "physical
 * sweeper EVs". Order = most popular first.
 */
const EV_PRESETS: { label: string; spread: EvSpread }[] = [
  { label: "Sweeper phys.", spread: { atk: 252, spe: 252, hp: 4 } },
  { label: "Sweeper spé.",  spread: { spa: 252, spe: 252, hp: 4 } },
  { label: "Mur phys.",     spread: { hp: 252, def: 252, spd: 4 } },
  { label: "Mur spé.",      spread: { hp: 252, spd: 252, def: 4 } },
  { label: "Mur mixte",     spread: { hp: 252, def: 128, spd: 128 } },
  { label: "Wallbreaker",   spread: { atk: 252, hp: 252, spe: 4 } },
];

const EV_STAT_KEYS: { key: keyof EvSpread; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "Atk" },
  { key: "def", label: "Déf" },
  { key: "spa", label: "AtS" },
  { key: "spd", label: "DéS" },
  { key: "spe", label: "Vit" },
];

const EV_TOTAL_CAP = 510;
const EV_STAT_CAP = 252;
const IV_STAT_CAP = 31;

/**
 * Nature select + 6 EV inputs with running total + 6 IV inputs in a
 * collapsed details block. Compact by design — the dialog already
 * carries Sets populaires + talent + item + 4 moves above this.
 *
 * EVs aren't hard-clamped to 510 in real time (Smogon sometimes ships
 * sums slightly off the cap due to legacy data), but the total label
 * goes amber when over-budget so the user knows.
 */
function NatureAndEvs({
  nature,
  onNatureChange,
  evs,
  onEvsChange,
  ivs,
  onIvsChange,
}: {
  nature: string;
  onNatureChange: (n: string) => void;
  evs: EvSpread;
  onEvsChange: (next: EvSpread) => void;
  ivs: EvSpread;
  onIvsChange: (next: EvSpread) => void;
}) {
  const totalEvs = EV_STAT_KEYS.reduce(
    (sum, { key }) => sum + (evs[key] ?? 0),
    0,
  );
  const overBudget = totalEvs > EV_TOTAL_CAP;

  function setEv(key: keyof EvSpread, value: number) {
    const clamped = Math.max(0, Math.min(EV_STAT_CAP, value || 0));
    onEvsChange({ ...evs, [key]: clamped });
  }
  function setIv(key: keyof EvSpread, value: number) {
    const clamped = Math.max(0, Math.min(IV_STAT_CAP, value || 0));
    onIvsChange({ ...ivs, [key]: clamped });
  }
  function resetEvs() {
    onEvsChange({});
  }
  function resetIvs() {
    onIvsChange({});
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Nature & stats</Label>

      {/* Nature row — searchable combobox (FR + EN) instead of a flat
          Select. 25 natures is short, but the FR/EN translation
          mismatch (e.g. user types "rigide" expecting Adamant) makes
          search essential. Stored as the EN name so Smogon round-trip
          stays lossless. */}
      <div className="flex items-center gap-2">
        <span className="w-14 text-[10px] uppercase tracking-wider text-muted-foreground">
          Nature
        </span>
        <NaturePicker value={nature} onChange={onNatureChange} />
      </div>

      {/* EVs grid */}
      <div className="flex flex-col gap-1.5 rounded-md border bg-muted/20 p-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Effort Values (EVs)
          </span>
          <span
            className={cn(
              "font-mono text-xs",
              overBudget ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
            )}
          >
            {totalEvs}/{EV_TOTAL_CAP}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {EV_STAT_KEYS.map(({ key, label }) => (
            <StatInput
              key={key}
              label={label}
              value={evs[key] ?? 0}
              max={EV_STAT_CAP}
              onChange={(v) => setEv(key, v)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {EV_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onEvsChange(p.spread)}
              className="rounded border bg-background px-1.5 py-0.5 text-[10px] hover:border-primary/50 hover:bg-accent"
              title={`Appliquer : ${EV_STAT_KEYS.map(({ key, label }) =>
                p.spread[key] ? `${p.spread[key]} ${label}` : null,
              )
                .filter(Boolean)
                .join(" / ")}`}
            >
              {p.label}
            </button>
          ))}
          {totalEvs > 0 && (
            <button
              type="button"
              onClick={resetEvs}
              className="ml-auto rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-destructive"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* IVs — collapsed by default. 31 is the universal sane default;
          users only touch this for niche stuff (0 Atk on special
          attackers, 0 Spe for Trick Room). */}
      <details className="rounded-md border bg-muted/20">
        <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          IVs avancés (31 par défaut)
        </summary>
        <div className="flex flex-col gap-1.5 border-t p-2">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {EV_STAT_KEYS.map(({ key, label }) => (
              <StatInput
                key={key}
                label={label}
                value={ivs[key] ?? IV_STAT_CAP}
                max={IV_STAT_CAP}
                onChange={(v) => setIv(key, v)}
              />
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={resetIvs}
              className="rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-destructive"
            >
              Reset (tout à 31)
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}

/** Single stat cell — label on top, number input below. */
function StatInput({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-center text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border bg-background px-1 py-0.5 text-center font-mono text-xs"
      />
    </label>
  );
}

/**
 * Combobox-style nature picker with bilingual search.
 *
 * Mirrors the structure of `ItemPickerPopover` / `MovePickerPopover`
 * elsewhere in this file — Popover trigger button + Command inside.
 * Filter walks both `fr` and `en` so the user can type "rigide" *or*
 * "adamant" and land on the same entry. Diacritics are stripped on
 * both sides of the comparison so "naif" matches "Naïf".
 *
 * Value is stored as the English name — the smog dump and our
 * `TeamSlot.nature` storage agree on EN as the canonical form.
 */
function NaturePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = findNature(value);

  const filtered = useMemo(() => {
    const q = stripDiacritics(query.trim().toLowerCase());
    if (!q) return NATURES;
    return NATURES.filter(
      (n) =>
        stripDiacritics(n.fr.toLowerCase()).includes(q) ||
        n.en.toLowerCase().includes(q),
    );
  }, [query]);

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
              "flex h-8 flex-1 cursor-pointer items-center gap-2 rounded-md border bg-background px-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-accent",
              !current && "italic text-muted-foreground",
            )}
          >
            {current ? (
              <>
                <span className="font-medium not-italic text-foreground">
                  {current.fr}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {natureEffectFr(current)}
                </span>
              </>
            ) : (
              <span className="flex-1 truncate">— Aucune —</span>
            )}
            <ChevronDown className="ml-auto size-3.5 shrink-0 opacity-60" />
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
            placeholder="Rechercher (fr / en)…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <span className="text-xs text-muted-foreground">
                Aucune nature.
              </span>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
              >
                <X className="size-4 text-muted-foreground" />
                <span className="italic text-muted-foreground">
                  Aucune nature
                </span>
              </CommandItem>
              {filtered.map((n) => {
                const active = n.en === value;
                return (
                  <CommandItem
                    key={n.en}
                    value={n.en}
                    onSelect={() => {
                      onChange(n.en === value ? "" : n.en);
                      setOpen(false);
                      setQuery("");
                    }}
                    data-checked={active || undefined}
                  >
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{n.fr}</span>
                        <span className="truncate text-[10px] italic text-muted-foreground">
                          {n.en}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-[10px]",
                          n.boost
                            ? "text-muted-foreground"
                            : "italic text-muted-foreground/70",
                        )}
                      >
                        {natureEffectFr(n)}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Strip combining diacritics so "naif" matches "Naïf". */
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function SmogonSetsPanel({
  sets,
  onApply,
}: {
  sets: SmogonSet[];
  onApply: (set: SmogonSet) => void;
}) {
  return (
    // Collapsible — Sets populaires are a "nice to have" reference;
    // the user is here primarily to configure *their* set. Collapsed
    // by default so Talent / Objet / Moves are visible above the fold,
    // expand with one click when the user wants to crib a meta set.
    <details className="group/sets rounded-md border bg-muted/20">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="text-amber-500">
            ★
          </span>
          Sets populaires
          <span className="text-[10px] font-normal text-muted-foreground">
            ({sets.length})
          </span>
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Smogon
        </span>
      </summary>
      {/* When opened, the list is height-capped (max-h-64 ≈ 2.5 sets
          visible at once) and scrolls internally — keeps the panel
          compact even with 4+ sets. ScrollArea swapped for a native
          overflow-y-auto: in a flex-column dialog body the base-ui
          ScrollArea's `size-full` viewport sometimes collapsed to 0
          height, here we just want plain scrolling. */}
      <div className="max-h-64 overflow-y-auto border-t px-3 py-2">
        <div className="flex flex-col gap-1.5">
          {sets.map((set, i) => (
            <SmogonSetCard key={`${set.name}-${i}`} set={set} onApply={onApply} />
          ))}
        </div>
      </div>
    </details>
  );
}

/**
 * One Smogon set card. The 4 moves are shown as inline chips (no type
 * tinting here — the card surface stays calm next to the rich move
 * grid on the Pokémon card). The "Appliquer" CTA is the only
 * affordance; the whole card is *not* clickable to avoid accidental
 * overwrites of in-progress configs.
 */
function SmogonSetCard({
  set,
  onApply,
}: {
  set: SmogonSet;
  onApply: (set: SmogonSet) => void;
}) {
  const abilityFr = set.ability ? frAbility(set.ability).label : null;
  const itemAppId = set.item ? smogonItemToAppId(set.item) : null;
  const itemFr = itemAppId ? findItemById(itemAppId)?.nameFr : null;

  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-muted/30 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold">{set.name}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 shrink-0 px-2 text-[10px]"
          onClick={() => onApply(set)}
        >
          Appliquer
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        {abilityFr && (
          <span className="inline-flex items-center gap-1">
            <span className="opacity-70">Talent</span>
            <span className="font-medium text-foreground">{abilityFr}</span>
          </span>
        )}
        {itemAppId && (
          <span className="inline-flex items-center gap-1">
            <ItemIcon item={itemAppId} size="size-3.5" />
            <span className="font-medium text-foreground">
              {itemFr ?? set.item}
            </span>
          </span>
        )}
        {set.nature && (
          <span className="inline-flex items-center gap-1">
            <span className="opacity-70">Nature</span>
            <span className="font-medium text-foreground">{set.nature}</span>
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {set.moves.map((m, i) => (
          <span
            key={`${m}-${i}`}
            className="rounded border bg-background px-1.5 py-0.5 text-[10px]"
          >
            {moveDisplayName(smogonMoveToId(m))}
          </span>
        ))}
      </div>
    </div>
  );
}
