import Link from "next/link";
import { ArrowDown, ArrowRight, Check, GitBranch, Layers, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import {
  POKEMON_BY_ID,
  evolutionChain,
  resolveEvolutionTo,
  rootOf,
  type ChainStage,
} from "@/data/pokemon";
import { EvolutionMethod } from "@/features/pokedex/evolution-method";
import { displayName } from "@/lib/pokemon-form";
import type { Pokemon, EvolutionDetails } from "@/types";
import { cn } from "@/lib/utils";

// ─── Public helpers ───────────────────────────────────────────────────

/** True when the species has at least one evolutionary stage transition. */
export function hasEvolutions(pokemon: Pokemon): boolean {
  const stages = evolutionChain(rootOf(pokemon.id));
  return stages.length > 1 || (stages[0]?.length ?? 0) > 1;
}

// ─── Hub entry-point ─────────────────────────────────────────────────

/**
 * "Évolutions" — the section block on the Pokédex detail page.
 *
 * One layout, always: a Pokepedia-style HTML `<table>` IS the main
 * component (no outer SectionCard wrapper — that would read as a
 * card-inside-a-card). The thead "Famille d'évolution de X" plays
 * the role of the section title, and a footer row carries the
 * Base / Branches / Méthodes summary chips.
 *
 * Works for everything from a linear 1→1 chain (Magikarp) up to the
 * Eevee fork (8 branches). When the leaf count gets very wide the
 * outer wrapper's `overflow-x-auto` lets the user scroll, rather
 * than break the layout.
 */
/** Max leaf count we still render as the horizontal Pokepedia table.
 *  Beyond this the table doesn't fit (cards are 9rem each, plus
 *  gaps; 4 cols ≈ 600 px which is the comfortable max inside a
 *  standard section card on desktop). Wider chains fall back to the
 *  vertical 2-column layout. */
const WIDE_CHAIN_THRESHOLD = 4;

export function EvolutionHub({ pokemon }: { pokemon: Pokemon }) {
  if (!hasEvolutions(pokemon)) return null;
  const rootId = rootOf(pokemon.id);
  const root = buildTree(rootId);
  const stages = evolutionChain(rootId);
  const allForms: ChainStage[] = stages.flat();
  const methodFamilyCount = countMethodFamilies(allForms);
  const branchCount = allForms.length - 1;
  const leaves = countLeaves(root);

  return (
    <Card className="overflow-hidden p-0">
      {leaves > WIDE_CHAIN_THRESHOLD ? (
        // Wide chains (Évoli with 8 branches): vertical layout so
        // the section never overflows the card horizontally.
        <EvolutionTableVertical
          root={root}
          currentId={pokemon.id}
          branchCount={branchCount}
          methodCount={methodFamilyCount}
        />
      ) : (
        <EvolutionTable
          root={root}
          currentId={pokemon.id}
          branchCount={branchCount}
          methodCount={methodFamilyCount}
        />
      )}
    </Card>
  );
}

// ─── Recursive tree builder ─────────────────────────────────────────

interface TreeNode {
  /** Pokémon roster id. */
  id: string;
  /** Evolution method that brought us to THIS node from its parent.
   *  Null for the root. */
  method: string | null;
  details: EvolutionDetails | null;
  children: TreeNode[];
}

/**
 * Build the full evolution tree from a root id. Uses each species'
 * `evolutions[]` directly so branching is preserved natively (each
 * parent points to its real children, no flat-stage flattening). The
 * `visited` set prevents Cobblemon's rare loop-style data (form
 * cycles, demoted evolutions) from looping the renderer forever.
 */
function buildTree(rootId: string): TreeNode {
  const visited = new Set<string>();
  function walk(
    id: string,
    method: string | null,
    details: EvolutionDetails | null,
  ): TreeNode {
    visited.add(id);
    const p = POKEMON_BY_ID[id];
    const children: TreeNode[] = [];
    if (p) {
      for (const e of p.evolutions) {
        const target = resolveEvolutionTo(e.to);
        if (visited.has(target)) continue;
        children.push(walk(target, e.method, e.details ?? null));
      }
    }
    return { id, method, details, children };
  }
  return walk(rootId, null, null);
}

// ─── The table ───────────────────────────────────────────────────────

/**
 * Renders the evolution tree as a real HTML `<table>` — same shape as
 * the Pokepedia "Famille d'évolution" widget.
 *
 * Per row:
 *   - thead caption:    "Famille d'évolution de <root>" spanning N cols
 *   - row 1 (card):     root, colspan = N
 *   - row 2 (condition): one cell per direct child, colspan = leaves(child)
 *   - row 3 (cards):    direct children
 *   - row 4 (condition): grand-children conditions
 *   - row 5 (cards):    grand-children
 *   - …
 *   - footer:           Base / Branches / Méthodes meta chips
 *
 * `colspan` is computed from `countLeaves(subtree)` so each parent
 * cell sits exactly above its descendant cells. Native `<table>`
 * handles all the sizing — no manual grid maths, no flex drift.
 */
function EvolutionTable({
  root,
  currentId,
  branchCount,
  methodCount,
}: {
  root: TreeNode;
  currentId: string;
  branchCount: number;
  methodCount: number;
}) {
  const totalCols = countLeaves(root);
  const rootName = POKEMON_BY_ID[root.id]?.name ?? root.id;
  const byDepth = collectByDepth(root);

  return (
    // The parent <Card> already provides the chrome — table goes
    // edge-to-edge. `overflow-x-auto` is the safety net for very
    // wide chains (Eevee = 8 leaf columns).
    <div className="w-full overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-center align-middle">
        <thead>
          <tr>
            <th
              colSpan={totalCols}
              className="border-b bg-muted/60 px-3 py-3 font-heading text-sm font-semibold"
            >
              Famille d&apos;évolution de {rootName}
            </th>
          </tr>
        </thead>
        <tbody>
          {byDepth.map((nodes, depth) => (
            <Fragment key={depth}>
              {depth > 0 && (
                // Condition row — one cell per node at this depth,
                // each holding the method that brought us TO it.
                <tr>
                  {nodes.map((node, i) => (
                    <td
                      key={`cond-${node.id}-${i}`}
                      colSpan={countLeaves(node)}
                      className="border-b border-r border-border/60 bg-muted/20 px-2 py-2 last:border-r-0"
                    >
                      <BranchConnector
                        method={node.method}
                        details={node.details}
                        targetId={node.id}
                      />
                    </td>
                  ))}
                </tr>
              )}
              <tr>
                {nodes.map((node, i) => (
                  <td
                    key={`card-${node.id}-${i}`}
                    colSpan={countLeaves(node)}
                    className={cn(
                      "border-r border-border/60 px-3 py-3 last:border-r-0",
                      depth < byDepth.length - 1 && "border-b",
                    )}
                  >
                    <div className="flex justify-center">
                      <EvoCard
                        stage={{ id: node.id, method: null, details: null }}
                        current={node.id === currentId}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            </Fragment>
          ))}
          {/* Footer row — at-a-glance summary chips inside the same
              table chrome. */}
          <tr>
            <td colSpan={totalCols} className="border-t bg-muted/40 px-3 py-2">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Vertical layout for wide chains (Évoli & friends — anything past
 * the WIDE_CHAIN_THRESHOLD horizontal leaves). Three columns:
 *
 *   | Root (rowspan)  |  ↓ condition row 1  |  target card row 1  |
 *   |                 |  ↓ condition row 2  |  target card row 2  |
 *   |                 |  ↓ condition row 3  |  target card row 3  |
 *   |                 |  …                                        |
 *
 * The root sits on the left with a `rowSpan` covering every branch
 * row so the eye reads it as "from this Pokémon → these arrows →
 * those targets". For grandchildren we recurse with a small nested
 * 3-col table inside the target cell.
 *
 * This keeps the section comfortably narrow (3 fixed-width columns)
 * regardless of how many branches Évoli has — no horizontal scroll.
 */
function EvolutionTableVertical({
  root,
  currentId,
  branchCount,
  methodCount,
}: {
  root: TreeNode;
  currentId: string;
  branchCount: number;
  methodCount: number;
}) {
  const rootName = POKEMON_BY_ID[root.id]?.name ?? root.id;
  // Need at least 1 row for the rowSpan; defaults to a "no further
  // evolutions" placeholder if root somehow has no children (we
  // shouldn't reach this layout in that case, but be defensive).
  const branchRows = root.children.length || 1;

  return (
    <div className="w-full">
      <table className="w-full border-separate border-spacing-0 text-center align-middle">
        <thead>
          <tr>
            <th
              colSpan={3}
              className="border-b bg-muted/60 px-3 py-3 font-heading text-sm font-semibold"
            >
              Famille d&apos;évolution de {rootName}
            </th>
          </tr>
        </thead>
        <tbody>
          {root.children.map((child, i) => (
            <Fragment key={child.id}>
              <VerticalBranchRow3
                node={child}
                currentId={currentId}
                isLast={i === root.children.length - 1}
                // Only the FIRST branch row carries the root cell —
                // it uses rowSpan to stretch over every following
                // branch row so the root reads as the shared
                // ancestor of every target.
                rootCell={
                  i === 0 ? (
                    <td
                      rowSpan={branchRows}
                      className="w-[12rem] border-b border-r border-border/60 bg-muted/10 px-3 py-3 align-middle"
                    >
                      <div className="flex justify-center">
                        <EvoCard
                          stage={{ id: root.id, method: null, details: null }}
                          current={root.id === currentId}
                        />
                      </div>
                    </td>
                  ) : null
                }
              />
            </Fragment>
          ))}

          {/* Footer chips. */}
          <tr>
            <td colSpan={3} className="border-t bg-muted/40 px-3 py-2">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** One row of the 3-col vertical layout :
 *  `[root (rowspan, rendered only on first row)] | [condition] | [target card]`.
 *
 *  If the target has its own children we recurse with a nested
 *  3-col mini table inside the right cell — keeps the layout
 *  consistent at any depth without ever overflowing horizontally.
 */
function VerticalBranchRow3({
  node,
  currentId,
  isLast,
  rootCell,
}: {
  node: TreeNode;
  currentId: string;
  isLast: boolean;
  /** When non-null, this is the first branch row and the parent has
   *  asked us to render the rowspan'd root cell on the left. */
  rootCell: React.ReactNode;
}) {
  const borderBottom = isLast ? "" : "border-b";
  return (
    <tr>
      {rootCell}
      <td
        className={cn(
          "w-[12rem] border-r border-border/60 bg-muted/20 px-3 py-3",
          borderBottom,
        )}
      >
        <BranchConnector
          method={node.method}
          details={node.details}
          targetId={node.id}
          direction="right"
        />
      </td>
      <td className={cn("px-3 py-3", borderBottom)}>
        <div className="flex flex-col items-center gap-3">
          <EvoCard
            stage={{ id: node.id, method: null, details: null }}
            current={node.id === currentId}
          />
          {node.children.length > 0 && (
            // Nested mini 3-col table so grandchildren of a wide
            // branch keep the same visual rhythm.
            <div className="w-full">
              <table className="w-full border-separate border-spacing-0 text-center align-middle">
                <tbody>
                  {node.children.map((grand, i) => (
                    <VerticalBranchRow3
                      key={grand.id}
                      node={grand}
                      currentId={currentId}
                      isLast={i === node.children.length - 1}
                      rootCell={null}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Tree helpers ───────────────────────────────────────────────────

/** Count of leaves under `node` — drives the colspan maths. */
function countLeaves(node: TreeNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

/**
 * BFS by depth. Returns `[ [root], [depth-1 nodes], [depth-2 nodes], … ]`
 * in left-to-right tree-order so the cells naturally line up under
 * their ancestor's colspan slice without any explicit column maths.
 */
function collectByDepth(root: TreeNode): TreeNode[][] {
  const out: TreeNode[][] = [[root]];
  let frontier: TreeNode[] = [root];
  while (true) {
    const next: TreeNode[] = [];
    for (const n of frontier) for (const c of n.children) next.push(c);
    if (next.length === 0) break;
    out.push(next);
    frontier = next;
  }
  return out;
}

/**
 * Distinct method families across the chain — fed to the `MÉTHODES`
 * chip in the table footer. A chain with five "use stone" branches
 * reads as 1 method, not 5.
 */
function countMethodFamilies(forms: ChainStage[]): number {
  const families = new Set<string>();
  for (const s of forms) {
    if (!s.method) continue;
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

// ─── Cell renderers ─────────────────────────────────────────────────

/** The "arrow + condition chips" cell that sits between a parent
 *  card and its child card. `direction` switches the arrow icon to
 *  match the surrounding layout's flow:
 *   - `"down"` (default) for the horizontal Pokepedia table where
 *     children sit BELOW their parent rows;
 *   - `"right"` for the vertical 3-col layout where the root is on
 *     the left and the target is on the right (root → arrow →
 *     target). */
function BranchConnector({
  method,
  details,
  targetId,
  direction = "down",
}: {
  method: string | null;
  details: EvolutionDetails | null;
  targetId: string;
  direction?: "down" | "right";
}) {
  const Arrow = direction === "right" ? ArrowRight : ArrowDown;
  return (
    <div className="flex flex-col items-center gap-1">
      <Arrow className="size-4 shrink-0 text-muted-foreground" />
      {method && (
        <div className="max-w-full">
          <EvolutionMethod
            evolution={{
              to: targetId,
              method,
              details: details ?? undefined,
            }}
            size="sm"
            align="center"
          />
        </div>
      )}
    </div>
  );
}

/** Single Pokémon card — sprite + name + dex, fixed compact width
 *  so cards stay balanced regardless of how many leaf columns the
 *  cell spans. */
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
      <div className="flex min-h-[5rem] w-[9rem] flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/30 p-2 text-[10px] text-muted-foreground">
        {stage.id}
      </div>
    );
  }

  const identity = (
    <>
      <div className="size-14 shrink-0">
        <PokemonSprite pokemon={p} variant="sprite" />
      </div>
      <div className="flex min-w-0 flex-col items-center gap-0">
        <span className="line-clamp-2 w-full text-center text-xs font-medium capitalize">
          {/* `displayName` appends "(Galar)", "(Eau)" etc. for
              regional / Rotom / Deoxys variants so two entries
              sharing the same species name stay distinguishable. */}
          {displayName(p)}
        </span>
        <span className="font-mono text-[9px] text-muted-foreground">
          #{p.dexNumber.toString().padStart(4, "0")}
        </span>
      </div>
    </>
  );

  const cardClasses = cn(
    "group relative flex w-[9rem] flex-col items-center gap-1 rounded-md p-2 text-center transition-colors",
    current
      ? "bg-primary/10 ring-1 ring-primary"
      : "bg-muted/40 hover:bg-accent/60",
  );
  const identityWrapper = "flex flex-col items-center gap-0.5";

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
        <div className="mt-1 flex flex-wrap justify-center gap-0.5">
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

/**
 * Small icon-label-value chip used in the table footer.
 * Copied from `CatchingGuide` style.
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

// Tiny local Fragment alias — JSX `<>` works fine for in-line use,
// but we need a named child to give the linter a stable `key` target
// inside .map().
function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
