import Link from "next/link";
import { Check, GitBranch, Layers, Wand2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import {
  POKEMON_BY_ID,
  evolutionChain,
  rootOf,
  type ChainStage,
} from "@/data/pokemon";
import { EvolutionMethod } from "@/features/pokedex/evolution-method";
import type { Pokemon } from "@/types";
import { cn } from "@/lib/utils";

// ─── Public helpers ───────────────────────────────────────────────────

/** True when the species has at least one evolutionary stage transition. */
export function hasEvolutions(pokemon: Pokemon): boolean {
  const stages = evolutionChain(rootOf(pokemon.id));
  return stages.length > 1 || (stages[0]?.length ?? 0) > 1;
}

/**
 * True when *any* stage in the chain branches into 5+ evolutions —
 * Eevee territory. The hub switches from a flat "all evolutions in
 * one grid" layout to method-family groups at this threshold.
 */
export function hasHeavyBranch(pokemon: Pokemon): boolean {
  const stages = evolutionChain(rootOf(pokemon.id));
  return stages.some((s) => s.length >= HEAVY_BRANCH_THRESHOLD);
}

const HEAVY_BRANCH_THRESHOLD = 5;

// ─── Hub entry-point ─────────────────────────────────────────────────

/**
 * Catalogue-style rendering for the "Évolutions" SectionCard.
 * Modelled on the "Où le trouver" section (CatchingGuide):
 *
 *   1. Top strip of summary `MetaChip`s (base form, branch count,
 *      distinct method families).
 *   2. Either a single flat grid of cards (chains under the heavy
 *      threshold) or grouped grids by method family (Eevee).
 *
 * No timeline, no connectors, no arrows — every evolution is a
 * regular tile carrying its own condition chip. The page reads as
 * "here are the available evolutions and what triggers them",
 * matching the user's stated mental model.
 */
export function EvolutionHub({ pokemon }: { pokemon: Pokemon }) {
  if (!hasEvolutions(pokemon)) return null;
  const stages = evolutionChain(rootOf(pokemon.id));
  const rootId = rootOf(pokemon.id);
  const root = POKEMON_BY_ID[rootId];
  const heavy = stages.some((s) => s.length >= HEAVY_BRANCH_THRESHOLD);

  // Flatten every reachable form. The root sits at stage 0 with no
  // method; every other stage carries the method that brought it
  // there. Both go into the same render pipeline so the visual
  // language stays uniform.
  const allForms: ChainStage[] = stages.flat();

  // Method-family count drives the `MÉTHODES` summary chip. Only the
  // forms with a method contribute (the root has none). We count
  // *distinct* families so a chain with five "use stone" branches
  // reads as 1 method, not 5.
  const methodFamilyCount = countMethodFamilies(allForms);

  // Branch count = everything minus the root (= every reachable
  // post-root form).
  const branchCount = allForms.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <SummaryStrip
        rootName={root?.name ?? rootId}
        branchCount={branchCount}
        methodCount={methodFamilyCount}
      />

      {heavy ? (
        <GroupedGrid
          stages={stages}
          currentId={pokemon.id}
        />
      ) : (
        <FlatGrid
          forms={allForms}
          currentId={pokemon.id}
        />
      )}
    </div>
  );
}

// ─── Top summary strip ───────────────────────────────────────────────

function SummaryStrip({
  rootName,
  branchCount,
  methodCount,
}: {
  rootName: string;
  branchCount: number;
  methodCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <MetaChip icon={<GitBranch className="size-3.5" />} label="Base">
        {rootName}
      </MetaChip>
      <MetaChip icon={<Layers className="size-3.5" />} label="Branches">
        <span className="font-mono">{branchCount}</span>
      </MetaChip>
      <MetaChip icon={<Wand2 className="size-3.5" />} label="Méthodes">
        <span className="font-mono">{methodCount || 1}</span>
      </MetaChip>
    </div>
  );
}

/**
 * Copied verbatim from `CatchingGuide.MetaChip` (kept inline rather
 * than promoted to a shared component because the catching-guide one
 * is local to that file and small enough to mirror cleanly — saves a
 * cross-feature dependency just to dedupe ten lines of CSS).
 */
function MetaChip({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-foreground">{children}</span>
    </span>
  );
}

// ─── Grids ───────────────────────────────────────────────────────────

function FlatGrid({
  forms,
  currentId,
}: {
  forms: ChainStage[];
  currentId: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-6">
      {forms.map((s) => (
        <EvoCard key={s.id} stage={s} current={s.id === currentId} />
      ))}
    </div>
  );
}

function GroupedGrid({
  stages,
  currentId,
}: {
  stages: ChainStage[][];
  currentId: string;
}) {
  // For the heavy/grouped layout we keep the root visible as its own
  // group ("Forme de base") so the user always sees Évoli first, then
  // the method-family groups for the fork.
  const rootStage = stages[0] ?? [];
  const heavyIdx = stages.findIndex(
    (s) => s.length >= HEAVY_BRANCH_THRESHOLD,
  );
  // Linear intermediate stages between the root and the heavy fork
  // (rare — Eevee jumps straight from root to fork). Surface them as
  // a "Forme intermédiaire" group so they don't get lost.
  const intermediates = stages.slice(1, heavyIdx).flat();
  const branched = stages[heavyIdx] ?? [];
  const families = groupBranchesByFamily(branched);

  return (
    <div className="flex flex-col gap-3">
      {rootStage.length > 0 && (
        <Group label="Forme de base">
          <FlatGrid forms={rootStage} currentId={currentId} />
        </Group>
      )}
      {intermediates.length > 0 && (
        <>
          <Separator />
          <Group label="Étape intermédiaire">
            <FlatGrid forms={intermediates} currentId={currentId} />
          </Group>
        </>
      )}
      {families.map((g) => (
        <Fragment key={g.label}>
          <Separator />
          <Group label={g.label} count={g.items.length}>
            <FlatGrid forms={g.items} currentId={currentId} />
          </Group>
        </Fragment>
      ))}
    </div>
  );
}

function Group({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">{label}</h4>
        {count != null && (
          <span className="font-mono text-xs text-muted-foreground">
            ×{count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────

/**
 * Single evolution tile. Visual chrome matches the `CompetitorCard`
 * used by "Où le trouver" (`bg-muted/40` surface, sprite top, name,
 * condition badge at the bottom) so the Pokédex page reads as one
 * coherent catalogue layout. Method chip stands in for the
 * CompetitorCard's rarity badge.
 */
function EvoCard({
  stage,
  current,
}: {
  stage: ChainStage;
  current: boolean;
}) {
  const p = POKEMON_BY_ID[stage.id];
  if (!p) {
    return (
      <div className="flex h-full min-h-[6rem] flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/30 p-2 text-[10px] text-muted-foreground">
        {stage.id}
      </div>
    );
  }

  // Pokémon identity (sprite + name + dex) — this is the part that
  // navigates to /pokedex/<id>. The method chip lives *outside* this
  // Link as a sibling because the chip itself wraps its item icon in
  // a `<Link href="/items/...">`, and nesting two anchors is invalid
  // HTML — that was the hydration error the user hit.
  const identity = (
    <>
      <div className="size-14">
        <PokemonSprite pokemon={p} variant="sprite" />
      </div>
      <div className="flex flex-col items-center gap-0">
        <span className="line-clamp-1 w-full text-center text-xs font-medium capitalize">
          {p.name}
        </span>
        <span className="font-mono text-[9px] text-muted-foreground">
          #{p.dexNumber.toString().padStart(4, "0")}
        </span>
      </div>
    </>
  );

  // Outer card chrome — sets the tile surface, holds the absolute
  // "current" badge, and stacks the identity link + method chip as
  // siblings.
  const cardClasses = cn(
    "group relative flex h-full flex-col items-center gap-1 rounded-md p-2 text-center transition-colors",
    current
      ? "bg-primary/10 ring-1 ring-primary"
      : "bg-muted/40 hover:bg-accent/60",
  );
  // Identity gets `flex-1` so the method chip docks to the bottom of
  // the tile even when names take different vertical space.
  const identityWrapper = "flex flex-1 flex-col items-center gap-0.5";

  return (
    <div className={cardClasses}>
      {current && (
        <span
          aria-label="Forme actuelle"
          title="Forme actuelle"
          className="absolute right-1.5 top-1.5 z-10 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="size-2.5" strokeWidth={3} />
        </span>
      )}
      {current ? (
        <div className={identityWrapper}>{identity}</div>
      ) : (
        <Link
          href={`/pokedex/${stage.id}`}
          className={cn(identityWrapper, "no-underline")}
        >
          {identity}
        </Link>
      )}
      {stage.method && (
        <div className="mt-auto flex flex-wrap justify-center gap-0.5 pt-1">
          <EvolutionMethod
            evolution={{
              to: stage.id,
              method: stage.method,
              details: stage.details ?? undefined,
            }}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}

// ─── Method family grouping + counting ──────────────────────────────

interface BranchGroup {
  label: string;
  items: ChainStage[];
}

function groupBranchesByFamily(stage: ChainStage[]): BranchGroup[] {
  const items: ChainStage[] = [];
  const friendship: ChainStage[] = [];
  const trade: ChainStage[] = [];
  const level: ChainStage[] = [];
  const other: ChainStage[] = [];

  for (const s of stage) {
    const v = s.details?.variant;
    const reqs = s.details?.requirements ?? [];
    const hasFriendship = reqs.some((r) => r.variant === "friendship");
    const hasLevel = reqs.some((r) => r.variant === "level");
    if (v === "item_interact" || v === "use_item") items.push(s);
    else if (v === "trade") trade.push(s);
    else if (hasFriendship) friendship.push(s);
    else if (hasLevel) level.push(s);
    else other.push(s);
  }

  const out: BranchGroup[] = [];
  if (items.length) out.push({ label: "Avec un objet", items });
  if (friendship.length) out.push({ label: "Par amitié", items: friendship });
  if (trade.length) out.push({ label: "Par échange", items: trade });
  if (level.length) out.push({ label: "Par montée de niveau", items: level });
  if (other.length) out.push({ label: "Autres conditions", items: other });
  return out;
}

/**
 * Distinct method families across the whole chain — fed to the
 * `MÉTHODES` chip in the summary strip. We re-use the same family
 * buckets `groupBranchesByFamily` walks, so the count is always
 * consistent with what the grouped layout actually surfaces.
 */
function countMethodFamilies(forms: ChainStage[]): number {
  const families = new Set<string>();
  for (const s of forms) {
    if (!s.method) continue; // root: no method, no family
    const v = s.details?.variant;
    const reqs = s.details?.requirements ?? [];
    if (v === "item_interact" || v === "use_item") families.add("item");
    else if (v === "trade") families.add("trade");
    else if (reqs.some((r) => r.variant === "friendship"))
      families.add("friendship");
    else if (reqs.some((r) => r.variant === "level")) families.add("level");
    else families.add("other");
  }
  return families.size;
}

// Tiny local Fragment alias so we don't import React just for one
// type — the JSX runtime handles `Fragment` shorthand `<>` for the
// JSX side, but we use it explicitly here as a map child to give the
// linter a stable `key` target.
function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
