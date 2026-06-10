"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPin, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TypeBadge } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { ItemIcon } from "@/components/site/minecraft-item";
import { POKEMON } from "@/data/pokemon";
import { SPAWNS_BY_ID, type SpawnAggregate } from "@/data/spawns";
import { SPECIES_EXTRAS_BY_ID, type EvYield } from "@/data/species-extras";
import { lookupItem } from "@/data/items-pokeapi";
import { biomeLabel } from "@/data/biomes";
import { cn } from "@/lib/utils";
import { foldDiacritics } from "@/lib/search";
import type { Pokemon, PokemonTypeId, Rarity } from "@/types";

type EvStat = keyof EvYield;

const STAT_META: Record<EvStat, { label: string; short: string; color: string }> = {
  hp:              { label: "PV",          short: "PV",  color: "#ef4444" },
  attack:          { label: "Attaque",     short: "Atq", color: "#f97316" },
  defence:         { label: "Défense",     short: "Déf", color: "#eab308" },
  special_attack:  { label: "Attaque Spé", short: "SpA", color: "#3b82f6" },
  special_defence: { label: "Défense Spé", short: "SpD", color: "#22c55e" },
  speed:           { label: "Vitesse",     short: "Vit", color: "#ec4899" },
};

const STAT_ORDER: EvStat[] = [
  "hp", "attack", "defence", "special_attack", "special_defence", "speed",
];

/** Power item held to gain bonus EVs of the matching stat per K.O. */
const POWER_ITEM_BY_STAT: Record<EvStat, string> = {
  hp:              "power_weight",
  attack:          "power_bracer",
  defence:         "power_belt",
  special_attack:  "power_lens",
  special_defence: "power_band",
  speed:           "power_anklet",
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Commun", uncommon: "Peu commun", rare: "Rare", "ultra-rare": "Ultra rare",
};

const RARITY_TONE: Record<Rarity, string> = {
  common: "bg-zinc-500", uncommon: "bg-emerald-600",
  rare: "bg-blue-600", "ultra-rare": "bg-amber-700",
};

/** common → 0 … ultra-rare → 3; spawnability rank for the sort. */
const RARITY_RANK: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, "ultra-rare": 3,
};

const INITIAL_VISIBLE = 18;

interface Candidate {
  pokemon: Pokemon;
  spawn: SpawnAggregate;
  /** EVs of the selected stat per K.O. (1–3). */
  yield_: number;
  /** Non-zero yields across all stats, for the mixed-yield badge. */
  allYields: [EvStat, number][];
  /** Best (most common) rarity bucket of the spawn. */
  rarityRank: number;
  rarity: Rarity;
  biomes: string[];
}

/**
 * Best farm targets for one stat: every species that yields EVs of
 * that stat AND actually spawns in the wild, ranked by how painless
 * the farm session is — highest yield first, then most-common rarity,
 * then breadth of biomes (easier to find a spot near your base),
 * then lowest level (faster K.O.s).
 */
function buildCandidates(stat: EvStat): Candidate[] {
  const out: Candidate[] = [];
  for (const p of POKEMON) {
    const yield_ = SPECIES_EXTRAS_BY_ID[p.id]?.evYield?.[stat] ?? 0;
    if (yield_ <= 0) continue;
    const spawn = SPAWNS_BY_ID[p.id];
    if (!spawn) continue;
    const biomes = spawn.biomes.filter(
      (b) => /(^|\/)is_/.test(b) && !b.includes(":"),
    );
    if (biomes.length === 0) continue;
    const rarity =
      (["common", "uncommon", "rare", "ultra-rare"] as Rarity[]).find((r) =>
        spawn.rarities.includes(r),
      ) ?? "ultra-rare";
    const evYield = SPECIES_EXTRAS_BY_ID[p.id]!.evYield!;
    const allYields = STAT_ORDER
      .map((s): [EvStat, number] => [s, evYield[s]])
      .filter(([, v]) => v > 0);
    out.push({
      pokemon: p,
      spawn,
      yield_,
      allYields,
      rarity,
      rarityRank: RARITY_RANK[rarity],
      biomes,
    });
  }
  out.sort(
    (a, b) =>
      b.yield_ - a.yield_ ||
      a.rarityRank - b.rarityRank ||
      b.biomes.length - a.biomes.length ||
      (a.spawn.levelRange?.[0] ?? 99) - (b.spawn.levelRange?.[0] ?? 99),
  );
  return out;
}

/**
 * "Farm d'EV" — pick a stat, get the wild Pokémon worth K.O.-ing for
 * it. The mirror of the Pokédex's EV-yield display: instead of "what
 * does this mon give?", it answers "I want +252 Vitesse, who do I
 * hunt and where?".
 */
export function EvGuide() {
  const [stat, setStat] = useState<EvStat>("attack");
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [rarities, setRarities] = useState<Set<Rarity>>(new Set());
  const [pureOnly, setPureOnly] = useState(false);

  const candidates = useMemo(() => buildCandidates(stat), [stat]);

  const filtered = useMemo(() => {
    const q = foldDiacritics(query.trim());
    return candidates.filter((c) => {
      if (q && !foldDiacritics(`${c.pokemon.name} ${c.pokemon.id}`).includes(q)) {
        return false;
      }
      if (rarities.size > 0 && !rarities.has(c.rarity)) return false;
      if (pureOnly && c.allYields.some(([s]) => s !== stat)) return false;
      return true;
    });
  }, [candidates, query, rarities, pureOnly, stat]);

  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hidden = filtered.length - visible.length;
  const hasFilters = query !== "" || rarities.size > 0 || pureOnly;

  function toggleRarity(r: Rarity) {
    setRarities((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  function resetFilters() {
    setQuery("");
    setRarities(new Set());
    setPureOnly(false);
  }

  const powerItem = POWER_ITEM_BY_STAT[stat];
  const powerItemName = lookupItem(powerItem)?.nameFr ?? powerItem;

  return (
    <div className="flex flex-col gap-5">
      {/* ─── Stat picker — tinted, not solid, so the row doesn't
            scream against the rest of the muted UI. ───────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {STAT_ORDER.map((s) => {
          const meta = STAT_META[s];
          const active = s === stat;
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStat(s);
                setShowAll(false);
              }}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                !active &&
                  "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
              style={
                active
                  ? {
                      // ~12 % tint + colored border/text — same visual
                      // weight as the "Légendaire"/"Paradoxe" badges.
                      backgroundColor: `${meta.color}1f`,
                      borderColor: `${meta.color}66`,
                      color: meta.color,
                    }
                  : undefined
              }
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* ─── Search + filters over the candidate pool ─────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-[12rem] flex-1 sm:max-w-xs">
          <InputGroupAddon>
            <Search className="size-4 opacity-60" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Rechercher un Pokémon…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <InputGroupAddon
              className="cursor-pointer"
              onClick={() => setQuery("")}
            >
              <X className="size-4 opacity-60 hover:opacity-100" />
            </InputGroupAddon>
          )}
        </InputGroup>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  rarities.size === 0 && "border-dashed text-muted-foreground",
                )}
              >
                Rareté
                {rarities.size > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 px-1.5 font-mono text-[10px]"
                  >
                    {rarities.size}
                  </Badge>
                )}
              </Button>
            }
          />
          <DropdownMenuContent className="min-w-44" align="start">
            {(["ultra-rare", "rare", "uncommon", "common"] as Rarity[]).map((r) => (
              <DropdownMenuCheckboxItem
                key={r}
                checked={rarities.has(r)}
                onCheckedChange={() => toggleRarity(r)}
                closeOnClick={false}
              >
                <span className={cn("size-2.5 rounded-full", RARITY_TONE[r])} />
                {RARITY_LABEL[r]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          aria-pressed={pureOnly}
          onClick={() => setPureOnly((v) => !v)}
          className={cn(
            !pureOnly && "border-dashed text-muted-foreground",
            pureOnly &&
              "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          )}
          title="Masquer les cibles qui donnent aussi des EVs d'autres stats"
        >
          Rendement pur
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-muted-foreground"
          >
            <X data-icon="inline-start" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* ─── Booster strip — power item + vitamins reminder ────────── */}
      <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:gap-4">
        <Link
          href={`/items/${powerItem}`}
          className="group inline-flex items-center gap-2 font-medium hover:underline"
        >
          <ItemIcon item={`cobblemon:${powerItem}`} size="size-6" />
          {powerItemName}
        </Link>
        <span className="text-muted-foreground">
          {lookupItem(powerItem)?.shortEffect ??
            "Objet tenu : EVs bonus de cette stat à chaque K.O."}{" "}
          Recette sur la fiche objet.
        </span>
      </div>

      {/* ─── Candidates ────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">
          Meilleures cibles pour{" "}
          <span style={{ color: STAT_META[stat].color }}>
            {STAT_META[stat].label}
          </span>
        </h2>
        <span className="text-xs text-muted-foreground">
          {hasFilters ? (
            <>
              <strong className="text-foreground">{filtered.length}</strong> /{" "}
              {candidates.length} cibles correspondant aux filtres
            </>
          ) : (
            <>
              {candidates.length} Pokémon sauvages donnent des EVs{" "}
              {STAT_META[stat].short}
            </>
          )}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {hasFilters
              ? "Aucune cible ne correspond à ces filtres — essaie d'en retirer un."
              : "Aucun Pokémon sauvage ne donne d'EVs de cette stat."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <CandidateCard key={c.pokemon.id} candidate={c} stat={stat} />
          ))}
        </div>
      )}

      {hidden > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-fit gap-1.5 self-center text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="size-4" />
          Voir les {hidden} autres
        </Button>
      )}
    </div>
  );
}

/**
 * One farm target. The headline is the EV payout ("+2 Atq" in the
 * stat colour); rarity + level window + the first biomes tell the
 * player how realistic the session is. Mixed yields (e.g. +1 Atq
 * +1 Vit) are spelled out so nobody pollutes a clean EV spread by
 * accident.
 */
function CandidateCard({
  candidate,
  stat,
}: {
  candidate: Candidate;
  stat: EvStat;
}) {
  const { pokemon, spawn, yield_, allYields, rarity, biomes } = candidate;
  const mixed = allYields.filter(([s]) => s !== stat);

  return (
    <Link
      href={`/pokedex/${pokemon.id}`}
      className="group flex items-center gap-3 rounded-md border bg-card p-2.5 transition-colors hover:bg-accent/40"
    >
      <div className="size-12 shrink-0">
        <PokemonSprite pokemon={pokemon} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium capitalize">
            {pokemon.name}
          </span>
          <span className="flex items-center gap-1">
            {pokemon.types.map((t) => (
              <TypeBadge key={t} type={t as PokemonTypeId} size="sm" />
            ))}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span
            className={cn(
              "rounded px-1.5 py-px font-medium text-white",
              RARITY_TONE[rarity],
            )}
          >
            {RARITY_LABEL[rarity]}
          </span>
          {spawn.levelRange && (
            <span className="font-mono">
              Lv. {spawn.levelRange[0]}–{spawn.levelRange[1]}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5 truncate">
            <MapPin className="size-3 shrink-0" />
            {biomes.slice(0, 2).map(biomeLabel).join(", ")}
            {biomes.length > 2 && ` +${biomes.length - 2}`}
          </span>
        </div>

        {mixed.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <Sparkles className="size-3 shrink-0" />
            Donne aussi{" "}
            {mixed
              .map(([s, v]) => `+${v} ${STAT_META[s].short}`)
              .join(", ")}
          </span>
        )}
      </div>

      <span
        className="shrink-0 rounded-md border px-2 py-1 font-mono text-sm font-bold"
        style={{
          // Tinted like the stat picker — the payout stays the focal
          // point without the solid flashy block.
          backgroundColor: `${STAT_META[stat].color}1f`,
          borderColor: `${STAT_META[stat].color}66`,
          color: STAT_META[stat].color,
        }}
      >
        +{yield_}
      </span>
    </Link>
  );
}
