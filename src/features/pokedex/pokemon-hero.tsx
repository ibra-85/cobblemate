import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { WishlistButton } from "@/components/site/wishlist-button";
import { CompareDialog } from "@/features/pokedex/compare-dialog";
import { PokemonDetailsModal } from "@/features/pokedex/pokemon-details-modal";
import { getSpeciesExtras } from "@/data/species-extras";
import { isSoloSpecies } from "@/data/pokemon";
import { lookupAbility } from "@/data/abilities-pokeapi";
import { abilityDisplayFr } from "@/lib/ability-utils";
import { baseStatTotal } from "@/lib/pokemon-utils";
import type { SpawnAggregate } from "@/data/spawns";
import type { Pokemon, Rarity } from "@/types";

const CATEGORY_LABEL: Record<string, { label: string; tone: string }> = {
  legendary:   { label: "Légendaire",   tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40" },
  mythical:    { label: "Mythique",     tone: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/40" },
  paradox:     { label: "Paradoxe",     tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40" },
  ultra_beast: { label: "Ultra-Chimère", tone: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40" },
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Commun", uncommon: "Peu commun", rare: "Rare", "ultra-rare": "Ultra rare",
};

const RARITY_TONE: Record<Rarity, string> = {
  common:       "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 ring-zinc-500/30",
  uncommon:     "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
  rare:         "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-500/30",
  "ultra-rare": "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
};

const STAT_LABEL: Record<keyof Pokemon["baseStats"], string> = {
  hp:      "PV",
  attack:  "Attaque",
  defense: "Défense",
  spAtk:   "Attaque Spé",
  spDef:   "Défense Spé",
  speed:   "Vitesse",
};

interface Props {
  pokemon: Pokemon;
  spawn?: SpawnAggregate;
}

/**
 * Hero card v4 — one self-contained card. The top line stitches the
 * full identity together ("Bulbasaur · #0001 · Gen 1 · Plante / Poison
 * · Ultra rare") followed by the three icon actions. The body sits
 * underneath as artwork + two columns (Details and Stats) side by side.
 */
export function PokemonHero({ pokemon, spawn }: Props) {
  const extras = getSpeciesExtras(pokemon.id);
  const categories = (extras?.labels ?? []).filter((l) => CATEGORY_LABEL[l]);
  const bst = baseStatTotal(pokemon);

  const rarityOrder: Rarity[] = ["ultra-rare", "rare", "uncommon", "common"];
  const headlineRarity = spawn
    ? rarityOrder.find((r) => spawn.rarities.includes(r))
    : undefined;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        {/* ─── Identity line ─────────────────────────────────────────
            Name + dex + gen + types + rarity + actions all inline. */}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
            {pokemon.name}
          </h1>
          <span className="font-mono text-sm text-muted-foreground">
            #{pokemon.dexNumber.toString().padStart(4, "0")}
          </span>
          <Badge variant="secondary">Gen {pokemon.generation}</Badge>
          <TypeBadges types={pokemon.types} size="sm" />
          {headlineRarity && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${RARITY_TONE[headlineRarity]}`}
            >
              {RARITY_LABEL[headlineRarity]}
            </span>
          )}
          {categories.map((c) => (
            <span
              key={c}
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_LABEL[c].tone}`}
            >
              {CATEGORY_LABEL[c].label}
            </span>
          ))}

          {/* Icon actions on the right edge of the same line */}
          <div className="ml-auto flex items-center gap-1">
            <PokemonDetailsModal pokemon={pokemon} iconOnly />
            <WishlistButton
              pokemonId={pokemon.id}
              pokemonName={pokemon.name}
              size="icon"
            />
            <CompareDialog pokemon={pokemon} iconOnly />
          </div>
        </div>

        {/* ─── Body: artwork + stacked details/stats column ───────────
            On mobile everything stacks; from `md` up the layout is a
            2-column grid (artwork | info), with the info column
            internally stacking Détails on top and Stats de base
            underneath so each section gets the full available width. */}
        <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-start">
          {/* Artwork */}
          <div className="relative mx-auto size-40 md:size-44">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full bg-foreground/5 blur-2xl"
            />
            <div className="relative size-full">
              <PokemonSprite pokemon={pokemon} variant="artwork" priority />
            </div>
          </div>

          {/* Info column — Détails on top, Stats de base underneath. */}
          <div className="flex flex-col gap-5">
            <Column title="Détails">
              <DetailRows pokemon={pokemon} spawn={spawn} />
            </Column>
            <Column title="Stats de base">
              <StatsColumn pokemon={pokemon} bst={bst} />
            </Column>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Detail rows (vertical key/value list) ─────────────────────────────

function DetailRows({
  pokemon,
  spawn,
}: {
  pokemon: Pokemon;
  spawn?: SpawnAggregate;
}) {
  // The hero only carries identity-level data: who is this mon. The
  // weakness preview moved to the Faiblesses & résistances card,
  // spawn meta (niveau, biome, contexte, heure, météo, objet-clé,
  // catch-rate) moved to "Où le trouver", so the header isn't a wall
  // of rows anymore. Talents stay because they're the one piece of
  // identity that doesn't have its own section.
  const rows: { label: string; value: React.ReactNode }[] = [];

  rows.push({
    label: "Talents",
    value: (
      <div className="flex flex-wrap gap-2">
        {pokemon.abilities.map((a) => (
          <AbilityBadge key={a} stored={a} />
        ))}
        {pokemon.hiddenAbility && (
          <AbilityBadge stored={pokemon.hiddenAbility} hidden />
        )}
      </div>
    ),
  });

  if (!spawn) {
    rows.push({
      label: "Spawn",
      value: <span className="italic text-muted-foreground">Pas de spawn naturel</span>,
    });
  }

  if (isSoloSpecies(pokemon.id)) {
    rows.push({
      label: "Évolution",
      value: (
        <span className="italic text-muted-foreground">
          Pas d&apos;évolution
        </span>
      ),
    });
  }

  return (
    <dl className="flex flex-col divide-y divide-border/40 text-sm py-1.5">
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1.5 first:pt-0 last:pb-0"
        >
          <dt className="min-w-20 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {r.label}
          </dt>
          <dd className="flex-1">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Stats column ──────────────────────────────────────────────────────

function StatsColumn({ pokemon, bst }: { pokemon: Pokemon; bst: number }) {
  const keys: (keyof Pokemon["baseStats"])[] = [
    "hp", "attack", "defense", "spAtk", "spDef", "speed",
  ];
  const max = Math.max(...Object.values(pokemon.baseStats));
  // Stats above 150 are exceptional; cap the visual scale there so the
  // bars stay readable.
  const denom = Math.max(150, max);

  return (
    <div className="flex flex-col text-sm">
      {keys.map((k) => {
        const v = pokemon.baseStats[k];
        const w = Math.min(100, Math.round((v / denom) * 100));
        return (
          <div
            key={k}
            className="flex items-center gap-2 border-b border-border/40 py-1.5 last:border-0"
          >
            <span className="w-24 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
              {STAT_LABEL[k]}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${w}%`, backgroundColor: barColor(v) }}
              />
            </div>
            <strong
              className="w-7 shrink-0 text-right font-mono text-sm tabular-nums"
              style={{ color: barColor(v) }}
            >
              {v}
            </strong>
          </div>
        );
      })}
      <div className="mt-2 flex items-center justify-between rounded-md bg-muted px-2 py-1.5">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Total
        </span>
        <strong className="font-mono tabular-nums">{bst}</strong>
      </div>
    </div>
  );
}

function barColor(v: number): string {
  if (v >= 130) return "#16a34a";
  if (v >= 90)  return "#3b82f6";
  if (v >= 60)  return "#eab308";
  return "#dc2626";
}

/**
 * Bilingual talent badge. Shows the French label first (what the
 * player sees in-game / on the Smogon FR side), with the canonical
 * English ability name in parentheses next to it — power-users
 * cross-reference Smogon / Bulbapedia / community guides by EN
 * name. When the FR translation falls back to the EN string
 * (rare — about a dozen abilities in the dump have no FR), we drop
 * the parenthetical so the badge doesn't read "Foo (Foo)".
 *
 * Hidden talents append "caché" after the parentheses so the
 * disambiguation reads as "Anticipation (Anticipation) · caché"
 * rather than wrapping the marker inside.
 */
function AbilityBadge({
  stored,
  hidden,
}: {
  stored: string;
  hidden?: boolean;
}) {
  const fr = abilityDisplayFr(stored);
  // `lookupAbility` indexes by FR, EN and slug — passing the stored
  // Cobblemon name (typically EN PascalCase) resolves the PokéAPI
  // entry that carries both name fields.
  const en = lookupAbility(stored)?.nameEn ?? stored;
  const sameFrEn = fr.toLowerCase() === en.toLowerCase();
  return (
    <Badge
      variant="outline"
      className={
        hidden
          ? "border-primary/40 bg-primary/5 text-[11px] text-primary"
          : "text-[11px]"
      }
      title={
        hidden
          ? `${en} — Talent caché, rare, à débloquer`
          : en
      }
    >
      {sameFrEn ? fr : `${fr} (${en})`}
      {hidden && <span className="ml-1 opacity-70">· caché</span>}
    </Badge>
  );
}
