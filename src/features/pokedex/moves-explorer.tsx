"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/site/type-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { lookupMove } from "@/data/moves";
import { getSpeciesExtras, type MovesByMethod } from "@/data/species-extras";
import type { Move, PokemonTypeId } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  pokemonId: string;
}

type MethodKey = keyof MovesByMethod;
type CategoryFilter = "all" | "physical" | "special" | "status";

const METHOD_LABEL: Record<MethodKey, string> = {
  level: "Niveau", tm: "CT/CS", egg: "Œuf",
  tutor: "Tuteur", legacy: "Legacy", special: "Évent",
};

const CATEGORY_LABEL_FR: Record<string, string> = {
  physical: "Physique", special: "Spéciale", status: "Statut",
};

const CATEGORY_BADGE_LABEL: Record<string, string> = {
  physical: "Phys", special: "Spé", status: "Stat",
};

interface Row {
  method: MethodKey;
  level?: number;
  moveId: string;
  move: Move | null;
  /** French primary name, falls back to humanized id when unmatched. */
  nameFr: string;
  /** English name from PokeAPI, or humanized id when unmatched. */
  nameEn: string;
  /** Lowercase haystack for the search (FR + EN + raw id). */
  haystack: string;
}

/** Humanize a move id into a title-case display ("vinewhip" → "Vinewhip"). */
function humanizeMoveId(id: string): string {
  const noHyphens = id.replace(/-/g, " ");
  return noHyphens.charAt(0).toUpperCase() + noHyphens.slice(1);
}

export function MovesExplorer({ pokemonId }: Props) {
  const moves = getSpeciesExtras(pokemonId)?.movesByMethod;
  const [query, setQuery] = useState("");
  // Default to level moves only — the player almost always wants to
  // see "what does this guy learn naturally" first; CT/Œuf/Tuteur are
  // one click away.
  const [activeMethods, setActiveMethods] = useState<Set<MethodKey>>(
    new Set(["level"]),
  );
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  const allRows: Row[] = useMemo(() => {
    if (!moves) return [];
    const rows: Row[] = [];
    const make = (method: MethodKey, moveId: string, level?: number): Row => {
      const move = lookupMove(moveId);
      const fallback = humanizeMoveId(moveId);
      const nameFr = move?.name ?? fallback;
      const nameEn = move?.nameEn ?? fallback;
      const haystack = `${nameFr} ${nameEn} ${moveId}`.toLowerCase();
      return { method, level, moveId, move, nameFr, nameEn, haystack };
    };
    for (const { level, move } of moves.level) rows.push(make("level", move, level));
    for (const k of ["tm", "egg", "tutor", "legacy", "special"] as const) {
      for (const m of moves[k]) rows.push(make(k, m));
    }
    return rows;
  }, [moves]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((r) => {
      if (!activeMethods.has(r.method)) return false;
      if (activeCategory !== "all" && r.move?.category !== activeCategory) return false;
      if (!q) return true;
      return r.haystack.includes(q);
    });
  }, [allRows, query, activeMethods, activeCategory]);

  const methodCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const counts: Record<MethodKey, number> = {
      level: 0, tm: 0, egg: 0, tutor: 0, legacy: 0, special: 0,
    };
    for (const r of allRows) {
      if (activeCategory !== "all" && r.move?.category !== activeCategory) continue;
      if (q && !r.haystack.includes(q)) continue;
      counts[r.method] += 1;
    }
    return counts;
  }, [allRows, query, activeCategory]);

  if (!moves) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune liste d&apos;attaques disponible pour ce Pokémon.
      </p>
    );
  }

  function toggleMethod(m: MethodKey) {
    setActiveMethods((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-[16rem] flex-1 sm:max-w-sm">
          <InputGroupAddon>
            <Search className="size-4 opacity-60" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <div className="ml-auto flex flex-wrap gap-1.5">
          {(["all", "physical", "special", "status"] as const).map((c) => (
            <Button
              key={c}
              variant={activeCategory === c ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(c)}
            >
              {c === "all" ? "Toutes" : CATEGORY_LABEL_FR[c]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(METHOD_LABEL) as MethodKey[]).map((m) => {
          const active = activeMethods.has(m);
          const n = methodCounts[m];
          return (
            <button
              key={m}
              type="button"
              onClick={() => toggleMethod(m)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {METHOD_LABEL[m]}
              <span className="font-mono opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        <strong className="text-foreground">{filtered.length}</strong>{" "}
        attaque{filtered.length > 1 ? "s" : ""}
        {(query || activeCategory !== "all" || activeMethods.size !== 1 || !activeMethods.has("level")) &&
          " correspondant aux filtres"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune attaque ne correspond.
        </div>
      ) : (
        <div className="grid gap-1.5 md:grid-cols-2">
          {filtered.map((r, i) => (
            <MoveRow key={`${r.method}-${r.moveId}-${i}`} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function MoveRow({ row }: { row: Row }) {
  const { method, level, moveId, move, nameFr, nameEn } = row;
  // English label sits to the right as a muted secondary; suppress it
  // when the FR name happens to match (untranslated falls through).
  const showEn = nameEn && nameEn !== nameFr;

  // Click navigates to the dedicated /moves/[id] page; hover still
  // pops the FR description tooltip below.
  const inner = (
    <Link
      href={`/moves/${moveId}`}
      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/30"
    >
      <Badge variant="outline" className="px-1.5 text-[10px] uppercase">
        {METHOD_LABEL[method]}
      </Badge>
      {level != null && (
        <span className="font-mono text-xs text-muted-foreground">Lv.{level}</span>
      )}
      {move ? (
        <>
          <TypeBadge type={move.type as PokemonTypeId} size="sm" />
          <span className="truncate font-medium">{nameFr}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[10px] text-muted-foreground">
            {showEn && <span className="italic">{nameEn}</span>}
            <Badge variant="secondary" className="px-1.5">
              {CATEGORY_BADGE_LABEL[move.category] ?? move.category}
            </Badge>
            {move.power ?? "—"}p · {move.accuracy ?? "—"}%
          </span>
        </>
      ) : (
        <>
          <span className="truncate font-medium">{nameFr}</span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
            {moveId}
          </span>
        </>
      )}
    </Link>
  );

  // Pop the FR description on hover when we have one. The `effect`
  // field on hand-curated moves wins (more concise wording); generated
  // PokéAPI flavor / short_effect take over otherwise.
  const tip = move?.effect ?? move?.description ?? move?.shortEffect ?? null;
  if (!tip) return inner;

  return (
    <Tooltip>
      <TooltipTrigger render={inner} />
      <TooltipContent className="max-w-xs text-left leading-snug">
        <p className="font-semibold">{nameFr}</p>
        <p className="mt-0.5 text-xs">{tip}</p>
        {move?.shortEffect && move.shortEffect !== tip && (
          <p className="mt-1 text-[11px] italic opacity-80">{move.shortEffect}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
