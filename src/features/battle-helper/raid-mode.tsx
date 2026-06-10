"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Flame,
  ShieldCheck,
  Skull,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TypeBadge, TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { TYPES_META } from "@/data/types";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import {
  EMPTY_COMBAT_SLOTS,
  useCombatStore,
} from "@/lib/combat-store";
import { rankAgainstTypes } from "@/lib/battle";
import { resolveTeam } from "@/lib/team-analysis";
import { cn } from "@/lib/utils";
import type { Pokemon, PokemonTypeId } from "@/types";

const ALL_TYPES: PokemonTypeId[] = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

const TYPE_LABEL: Record<PokemonTypeId, string> = {
  normal: "Normal", fire: "Feu", water: "Eau", electric: "Électrik",
  grass: "Plante", ice: "Glace", fighting: "Combat", poison: "Poison",
  ground: "Sol", flying: "Vol", psychic: "Psy", bug: "Insecte",
  rock: "Roche", ghost: "Spectre", dragon: "Dragon", dark: "Ténèbres",
  steel: "Acier", fairy: "Fée",
};

const TEAM_SIZE_OPTIONS = [3, 6] as const;
type TeamSize = (typeof TEAM_SIZE_OPTIONS)[number];
type Source = "team" | "roster";

/**
 * Mode Raid : recommandation contre un adversaire dont on ne connaît
 * que le **type** (cas Cobblemon Academy : portails de raid qui ne
 * révèlent ni l'espèce ni le moveset). On range les candidats sur le
 * même score que l'assistant standard, mais l'incoming est calculé
 * sur les STAB du type seul (worst-case), et l'offense sur les STAB
 * de chaque candidat.
 *
 * Deux sources :
 *  - **Équipe** : top N de l'équipe sauvegardée / ad-hoc actuelle
 *    (utile si tu joues sur le serveur et veux savoir qui sortir).
 *  - **Roster** : top N de tous les Pokémon (utile en planification
 *    avant de monter une équipe dédiée aux raids).
 */
export function RaidMode() {
  const [type1, setType1] = useState<PokemonTypeId>("fire");
  const [type2, setType2] = useState<PokemonTypeId | "none">("none");
  const [level, setLevel] = useState<string>("");
  const [teamSize, setTeamSize] = useState<TeamSize>(6);
  const [source, setSource] = useState<Source>("team");

  const { teams, hydrated } = useSavedTeams();
  const { myTeamId, myAdHocSlots } = useCombatStore();

  const slots = myTeamId
    ? teams.find((t) => t.id === myTeamId)?.slots ?? EMPTY_COMBAT_SLOTS()
    : myAdHocSlots;
  const team = resolveTeam(slots);

  // Build the per-Pokémon move override from the slot config so the
  // engine respects the user's actual moveset (same approach as the
  // standard assistant).
  const movesOverride = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of slots) {
      if (s.pokemonId && s.selectedMoves && s.selectedMoves.length > 0) {
        m.set(s.pokemonId, s.selectedMoves);
      }
    }
    return m.size > 0 ? m : undefined;
  }, [slots]);

  const defenderTypes: PokemonTypeId[] =
    type2 === "none" || type2 === type1 ? [type1] : [type1, type2];

  const teamRanking = useMemo(
    () =>
      team.length > 0
        ? rankAgainstTypes(defenderTypes, team, movesOverride)
        : null,
    [team, defenderTypes.join(","), movesOverride],
  );

  const rosterRanking = useMemo(
    () => rankAgainstTypes(defenderTypes),
    [defenderTypes.join(",")],
  );

  const active =
    source === "team" && teamRanking ? teamRanking : rosterRanking;
  const top = active.ranked.slice(0, teamSize);

  return (
    <div className="flex flex-col gap-4">
      {/* Setup */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Flame className="size-4 text-orange-500" />
              Raid (type seul)
            </h2>
            <p className="text-xs text-muted-foreground">
              Pour les portails de raid Academy : on ne connaît que le type
              de l&apos;ennemi. Pas de moveset, BST inflaté, boost à chaque tour.
            </p>
          </div>
        </div>

        {/* Type pickers + size + level */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Type principal
            </label>
            <Select value={type1} onValueChange={(v) => setType1(v as PokemonTypeId)}>
              <SelectTrigger>
                <SelectValue>
                  {(value: string) => (
                    <span className="inline-flex items-center gap-1.5">
                      <TypeBadge type={value as PokemonTypeId} size="sm" />
                      {TYPE_LABEL[value as PokemonTypeId]}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ALL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="inline-flex items-center gap-1.5">
                        <TypeBadge type={t} size="sm" />
                        {TYPE_LABEL[t]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Type secondaire (option.)
            </label>
            <Select value={type2} onValueChange={(v) => setType2(v as PokemonTypeId | "none")}>
              <SelectTrigger>
                <SelectValue>
                  {(value: string) =>
                    value === "none" ? (
                      <span className="text-muted-foreground">Aucun</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <TypeBadge type={value as PokemonTypeId} size="sm" />
                        {TYPE_LABEL[value as PokemonTypeId]}
                      </span>
                    )
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Aucun</SelectItem>
                  {ALL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="inline-flex items-center gap-1.5">
                        <TypeBadge type={t} size="sm" />
                        {TYPE_LABEL[t]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Niveau (info)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              placeholder="—"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Taille d&apos;équipe
            </label>
            <Tabs value={String(teamSize)} onValueChange={(v) => v && setTeamSize(Number(v) as TeamSize)}>
              <TabsList className="w-full">
                {TEAM_SIZE_OPTIONS.map((n) => (
                  <TabsTrigger key={n} value={String(n)} className="flex-1">
                    {n}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Strategy note */}
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
          <strong>Stratégie raid :</strong> l&apos;ennemi se boost à chaque tour
          → privilégie le burst sur la durabilité. Les coups super-efficaces
          de haute puissance valent mieux que les setup moves. Évite les
          status moves (annulés par les boosts de stats).
        </div>

        {/* Source toggle */}
        <Tabs value={source} onValueChange={(v) => v && setSource(v as Source)}>
          <TabsList>
            <TabsTrigger value="team" disabled={!hydrated || team.length === 0}>
              <Users className="size-3.5" />
              Mon équipe ({team.length})
            </TabsTrigger>
            <TabsTrigger value="roster">
              <Swords className="size-3.5" />
              Tout le roster
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Defender meta */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Meta
          title="Vulnérable à"
          icon={<Zap className="size-4 text-yellow-500" />}
          types={active.weaknesses}
          accent="bg-yellow-500/10 border-yellow-500/30"
          empty="Aucune faiblesse."
        />
        <Meta
          title="Résiste à"
          icon={<ShieldCheck className="size-4" />}
          types={active.resistances}
          accent="bg-muted/40"
          empty="Aucune résistance."
        />
        <Meta
          title="Immunisé contre"
          icon={<Skull className="size-4" />}
          types={active.immunities}
          accent="bg-destructive/5 border-destructive/30"
          empty="Aucune immunité."
        />
      </div>

      {/* Top team */}
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">
            Top {teamSize}{" "}
            {source === "team" ? "de ton équipe" : "du roster"} contre{" "}
            <span className="inline-flex items-center gap-1">
              <TypeBadge type={defenderTypes[0]!} size="sm" />
              {defenderTypes[1] && <TypeBadge type={defenderTypes[1]} size="sm" />}
            </span>
          </h3>
          {level && (
            <span className="text-[10px] text-muted-foreground">
              Lvl {level} ·
              {" "}contraintes : burst &gt; durabilité
            </span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {top.length === 0 ? (
            <p className="col-span-full px-2 py-1.5 text-xs text-muted-foreground">
              Aucun candidat — vide ?
            </p>
          ) : (
            top.map((r) => (
              <RaidCounterRow key={r.pokemon.id} score={r} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────

function Meta({
  title,
  icon,
  types,
  accent,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  types: PokemonTypeId[];
  accent: string;
  empty: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border p-3", accent)}>
      <div className="flex items-center gap-2 text-xs font-semibold">
        {icon}
        {title}
      </div>
      {types.length > 0 ? (
        <TypeBadges types={types} size="sm" />
      ) : (
        <p className="text-[11px] text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function RaidCounterRow({
  score,
}: {
  score: { pokemon: Pokemon; bestOffense: number; worstIncoming: number; bestMove?: { id?: string; name: string; type: PokemonTypeId } };
}) {
  const { pokemon, bestOffense, worstIncoming, bestMove } = score;
  const c1 = TYPES_META[pokemon.types[0] as PokemonTypeId]?.color ?? "#888";

  const offenseTone =
    bestOffense >= 2
      ? "text-emerald-600 dark:text-emerald-300"
      : bestOffense >= 1
        ? "text-amber-600 dark:text-amber-300"
        : "text-destructive";
  const defenseTone =
    worstIncoming <= 0.5
      ? "text-emerald-600 dark:text-emerald-300"
      : worstIncoming <= 1
        ? "text-amber-600 dark:text-amber-300"
        : "text-destructive";

  return (
    <Link
      href={`/pokedex/${pokemon.id}`}
      className="group/row relative flex items-center gap-3 overflow-hidden rounded-lg border bg-background/60 px-3 py-2 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow"
      style={{
        background: `linear-gradient(135deg, ${c1}0a 0%, transparent 60%)`,
      }}
    >
      <PokemonSprite pokemon={pokemon} size="size-12" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="truncate text-sm font-semibold">{pokemon.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            #{String(pokemon.dexNumber).padStart(4, "0")}
          </span>
        </div>
        <TypeBadges types={pokemon.types} size="sm" />
        {bestMove && (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <TypeBadge type={bestMove.type} size="sm" />
            <span className="truncate font-medium text-foreground">
              {bestMove.name}
            </span>
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5 font-mono text-[10px]">
        <span className={offenseTone} title="Multiplicateur offensif">
          ×{bestOffense}
        </span>
        <span className={defenseTone} title="Multiplicateur subi">
          ×{worstIncoming}
        </span>
        <ChevronRight className="size-3 text-muted-foreground transition-transform group-hover/row:translate-x-0.5" />
      </div>
    </Link>
  );
}
