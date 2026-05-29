import Link from "next/link";
import { Sparkles, Swords, Heart, Info, Trophy, TrendingUp, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TypeBadge } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { ROLE_META } from "@/data/roles";
import {
  getSmogonStats,
  smogonTypeToId,
  frAbility,
  frItem,
  frTeraType,
  lookupItem,
  lookupAbility,
  type SmogonStats,
  type SmogonSet,
  type SmogonEvs,
} from "@/data/smogon";
import { abilitySlug } from "@/data/abilities-pokeapi";
import { itemSlug } from "@/data/items-pokeapi";
import { lookupMove } from "@/data/moves";
import {
  ROLE_LABEL,
  ROLE_DESCRIPTION,
  buildStrategy,
  suggestMoves,
} from "@/lib/strategy-inference";
import type { Pokemon, PokemonTypeId, PokemonRole } from "@/types";
import { SmogonItemIcon } from "./smogon-item-icon";

interface Props {
  pokemon: Pokemon;
}

const EV_LABEL: Record<string, string> = {
  hp: "PV", atk: "Atk", def: "Déf", spa: "Atk.Sp", spd: "Déf.Sp", spe: "Vit",
};

const CATEGORY_BADGE: Record<string, string> = {
  physical: "Phys", special: "Spé", status: "Stat",
};

/**
 * Strategy block for the Pokémon detail page. Three layers, all
 * optional and rendered independently:
 *
 *   1. Curated overrides — strategy tips + roles + partners + counters
 *      lifted from `POKEMON_OVERRIDES`.
 *   2. Smogon meta — real usage stats from the gen 9 ladders, baked
 *      into `smogon-generated.json` at build time. Splits into three
 *      cards (set / breakdown / teammates) so each piece reads on its
 *      own.
 *   3. Inferred build — `buildStrategy` derives a sensible role and
 *      EV spread from base stats when no Smogon data exists.
 */
export function StrategySection({ pokemon }: Props) {
  const smogon = getSmogonStats(pokemon.id);

  const hasTips = Boolean(pokemon.strategyTips);
  const hasRoles = (pokemon.roles?.length ?? 0) > 0;

  // Curated `goodPartners` / `dangerousCounters` aren't rendered here
  // anymore — the Coéquipiers fréquents section (Smogon ladder data)
  // covers the same need with richer, automatic coverage. The fields
  // are kept on the Pokémon type in case they're useful elsewhere.
  return (
    <div className="flex flex-col gap-5">
      {(hasTips || hasRoles) && (
        <CuratedBlock pokemon={pokemon} hasTips={hasTips} hasRoles={hasRoles} />
      )}

      {smogon ? (
        <SmogonPanel stats={smogon} pokemonId={pokemon.id} />
      ) : (
        <InferredPanel pokemon={pokemon} />
      )}
    </div>
  );
}

// ─── Smogon panel ──────────────────────────────────────────────────────

function SmogonPanel({
  stats,
  pokemonId,
}: {
  stats: SmogonStats;
  pokemonId: string;
}) {
  // Curated sets are the primary source — when Smogon ships multiple
  // for a mon, surface every one (tabs). When none exists (lower
  // tiers without analyst coverage), fall back to a derived "most
  // popular item / ability / moves" card.
  const sets: SmogonSet[] =
    stats.sets.length > 0
      ? stats.sets
      : [
          {
            name: "Plus joué",
            ability: stats.abilities[0]?.name ?? null,
            item: stats.items[0]?.name ?? null,
            nature: stats.spread?.nature ?? null,
            evs: stats.spread?.evs ?? {},
            moves: stats.moves.slice(0, 4).map((m) => m.name),
            teraType: stats.teraTypes[0]?.name ?? null,
          },
        ];

  return (
    <div className="flex flex-col gap-4">
      <SetsCard sets={sets} pokemonId={pokemonId} />
      <UsageCard stats={stats} />
    </div>
  );
}

/**
 * Standalone Coéquipiers panel — promoted out of the Stratégie card so
 * the page can place it as a top-level section between Cuisine and
 * Évolution. Renders nothing when no Smogon data exists for the mon
 * (Cobblemon-only forms, paradox without ladder data, …).
 */
export function TeammatesSection({ pokemon }: { pokemon: Pokemon }) {
  const stats = getSmogonStats(pokemon.id);
  if (!stats || stats.teammates.length === 0) return null;
  return <TeammatesCard teammates={stats.teammates} />;
}

/** Quick predicate for the page — should the Coéquipiers SectionCard be rendered? */
export function hasTeammates(pokemonId: string): boolean {
  const stats = getSmogonStats(pokemonId);
  return Boolean(stats && stats.teammates.length > 0);
}

/**
 * Sets card — switches between Tabs (when Smogon ships multiple sets
 * for a mon, e.g. Dragonite: Dragon Dance / Choice Band / Bulky Phazer)
 * and a single card layout when there's only one. The "Tester ce set"
 * deeplink follows the active tab.
 */
function SetsCard({
  sets,
  pokemonId,
}: {
  sets: SmogonSet[];
  pokemonId: string;
}) {
  if (sets.length === 1) {
    return <SingleSetCard set={sets[0]!} pokemonId={pokemonId} />;
  }

  // Multiple curated sets — surface every one as a tab so the user
  // can see the spread of viable builds.
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Trophy className="size-4 text-amber-500" />
          Sets recommandés
          <Badge variant="secondary" className="font-mono text-[10px]">
            {sets.length} variantes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={sets[0]!.name}>
          <TabsList className="flex-wrap">
            {sets.map((s) => (
              <TabsTrigger key={s.name} value={s.name}>
                {s.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {sets.map((s) => (
            <TabsContent key={s.name} value={s.name} className="mt-4">
              <SetBody set={s} pokemonId={pokemonId} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SingleSetCard({
  set,
  pokemonId,
}: {
  set: SmogonSet;
  pokemonId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            Set recommandé
            <Badge variant="outline" className="text-[10px] uppercase">
              {set.name}
            </Badge>
          </span>
          <TestSetLink set={set} pokemonId={pokemonId} />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <SetBody set={set} pokemonId={pokemonId} hideTestButton />
      </CardContent>
    </Card>
  );
}

function SetBody({
  set,
  pokemonId,
  hideTestButton,
}: {
  set: SmogonSet;
  pokemonId: string;
  hideTestButton?: boolean;
}) {
  return (
    <>
      {!hideTestButton && (
        <div className="mb-3 flex justify-end">
          <TestSetLink set={set} pokemonId={pokemonId} />
        </div>
      )}
      <dl className="divide-y divide-border/60">
        {set.item && (
          <DefRow label="Objet">
            <ItemLink name={set.item}>
              <span className="flex items-center gap-2">
                <SmogonItemIcon name={set.item} size={28} />
                <span className="font-medium">{frItem(set.item).label}</span>
                {!frItem(set.item).translated && (
                  <span className="text-[11px] italic text-muted-foreground">
                    ({set.item})
                  </span>
                )}
              </span>
            </ItemLink>
          </DefRow>
        )}
        {set.ability && (
          <DefRow label="Talent">
            <AbilityLink name={set.ability}>
              <span className="inline-flex items-baseline gap-2">
                <span className="font-medium">{frAbility(set.ability).label}</span>
                {!frAbility(set.ability).translated && (
                  <span className="text-[11px] italic text-muted-foreground">
                    ({set.ability})
                  </span>
                )}
              </span>
            </AbilityLink>
          </DefRow>
        )}
        {set.nature && (
          <DefRow label="Nature">
            <span className="font-medium">{set.nature}</span>
          </DefRow>
        )}
        <DefRow label="EVs">
          <EvSpread evs={set.evs} />
        </DefRow>
        {set.teraType && (
          <DefRow label="Tera">
            <span className="inline-flex items-center gap-2">
              <TypeBadge
                type={smogonTypeToId(set.teraType) as PokemonTypeId}
                size="sm"
              />
              <span className="text-sm">{frTeraType(set.teraType)}</span>
            </span>
          </DefRow>
        )}
        <DefRow label={`Attaques (${set.moves.length}/4)`} stack>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {set.moves.map((m) => (
              <BigMoveCard key={m} smogonName={m} />
            ))}
          </div>
        </DefRow>
      </dl>
    </>
  );
}

function TestSetLink({
  set,
  pokemonId,
}: {
  set: SmogonSet;
  pokemonId: string;
}) {
  // First move from the set powers the "Tester ce set" deeplink. We
  // resolve through lookupMove first so the calc receives a known id
  // (the set ships English Smogon names like "Fire Blast").
  const firstMoveId = set.moves[0] ? lookupMove(set.moves[0])?.id : undefined;
  const href = firstMoveId
    ? `/battle?tab=calc&attacker=${encodeURIComponent(pokemonId)}&move=${encodeURIComponent(firstMoveId)}`
    : `/battle?tab=calc&attacker=${encodeURIComponent(pokemonId)}`;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs font-normal text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
    >
      <Calculator className="size-3.5" />
      Tester ce set
    </Link>
  );
}

function UsageCard({ stats }: { stats: SmogonStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-muted-foreground" />
          Stats d&apos;utilisation
          <Badge variant="secondary" className="font-mono text-[10px]">
            {(stats.usage * 100).toFixed(1)}% des équipes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-3">
          <ShareCard title="Talents les + joués">
            {stats.abilities.map((a) => (
              <ShareRow key={a.name} share={a.share}>
                <AbilityLink name={a.name}>
                  <span className="truncate text-sm">
                    {frAbility(a.name).label}
                  </span>
                </AbilityLink>
              </ShareRow>
            ))}
          </ShareCard>

          <ShareCard title="Objets les + portés">
            {stats.items.map((it) => (
              <ShareRow key={it.name} share={it.share}>
                <ItemLink name={it.name}>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <SmogonItemIcon name={it.name} size={20} />
                    <span className="truncate text-sm">{frItem(it.name).label}</span>
                  </span>
                </ItemLink>
              </ShareRow>
            ))}
          </ShareCard>

          <ShareCard title="Attaques les + jouées">
            {stats.moves.slice(0, 6).map((m) => (
              <ShareRow key={m.name} share={m.share}>
                <SmallMove smogonName={m.name} />
              </ShareRow>
            ))}
          </ShareCard>
        </div>
      </CardContent>
    </Card>
  );
}

function TeammatesCard({ teammates }: { teammates: SmogonStats["teammates"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="size-4 text-pink-500" />
          Coéquipiers fréquents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {teammates.map((t) => {
            const p = POKEMON_BY_ID[t.id];
            if (!p) return null;
            return (
              <Link
                key={t.id}
                href={`/pokedex/${t.id}`}
                className="group flex items-center gap-3 rounded-md border bg-card p-2 transition-colors hover:bg-accent/40"
              >
                <div className="size-14 shrink-0">
                  <PokemonSprite pokemon={p} />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {(t.share * 100).toFixed(1)}%
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Inferred panel (fallback when no Smogon data) ─────────────────────

function InferredPanel({ pokemon }: { pokemon: Pokemon }) {
  const build = buildStrategy(pokemon);
  const movesetIds = suggestMoves(pokemon);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-amber-500" />
            Build conseillé
            <Badge variant="outline" className="text-[10px] uppercase">
              auto-déduit
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <dl className="divide-y divide-border/60">
            <DefRow label="Rôle">
              <span
                className="font-medium"
                title={ROLE_DESCRIPTION[build.role]}
              >
                {ROLE_LABEL[build.role]}
              </span>
            </DefRow>
            <DefRow label="Nature">
              <span className="font-medium">{build.nature.name}</span>
              <span className="ml-2 text-[11px] text-muted-foreground">
                {build.nature.effect}
              </span>
            </DefRow>
            <DefRow label="EVs">
              <EvSpread evs={build.evs} />
            </DefRow>
            <DefRow label="Objets" stack>
              <ul className="flex flex-col gap-1 text-sm">
                {build.items.map((it) => (
                  <li key={it.id}>
                    <span className="font-medium">{it.id}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {it.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </DefRow>
          </dl>

          <p className="mt-4 flex items-start gap-1.5 rounded-md bg-muted/40 p-2.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {build.rationale}
          </p>
        </CardContent>
      </Card>

      <InferredMoveset pokemon={pokemon} ids={movesetIds} />
    </>
  );
}

function InferredMoveset({
  pokemon,
  ids,
}: {
  pokemon: Pokemon;
  ids: ReturnType<typeof suggestMoves>;
}) {
  const all = [...ids.stab, ...ids.coverage, ...ids.utility];
  if (all.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moveset conseillé</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pas assez d&apos;attaques notables connues pour suggérer un build.
            Consulte la liste complète sur la{" "}
            <Link
              href={`/pokedex/${pokemon.id}/attaques`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              page d&apos;attaques
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Swords className="size-4 text-muted-foreground" />
            Moveset conseillé
            <Badge variant="outline" className="text-[10px] uppercase">
              depuis attaques notables
            </Badge>
          </span>
          <Link
            href={`/pokedex/${pokemon.id}/attaques`}
            className="text-xs font-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Voir toutes les attaques →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <MoveColumn title="STAB" hint="Attaques du même type que le Pokémon" ids={ids.stab} />
          <MoveColumn title="Coverage" hint="Couvre les faiblesses des types adverses" ids={ids.coverage} />
          <MoveColumn title="Utilité" hint="Statuts, soin, setup" ids={ids.utility} />
        </div>
      </CardContent>
    </Card>
  );
}

function MoveColumn({ title, hint, ids }: { title: string; hint: string; ids: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="text-[10px] text-muted-foreground/80">{hint}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {ids.length === 0 ? (
          <p className="text-xs italic text-muted-foreground/70">— aucune —</p>
        ) : (
          ids.map((id) => <InferredMoveCard key={id} id={id} />)
        )}
      </div>
    </div>
  );
}

function InferredMoveCard({ id }: { id: string }) {
  const m = lookupMove(id);
  if (!m) {
    return (
      <div className="rounded-md border px-2.5 py-1.5 text-xs">
        <span className="font-mono text-muted-foreground">{id}</span>
      </div>
    );
  }
  return (
    <Link
      href={`/moves/${m.id}`}
      className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent/30"
    >
      <TypeBadge type={m.type as PokemonTypeId} size="sm" />
      <span className="truncate font-medium">{m.name}</span>
      <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground">
        <Badge variant="secondary" className="px-1">
          {CATEGORY_BADGE[m.category] ?? m.category}
        </Badge>
        {m.power ?? "—"}p
      </span>
    </Link>
  );
}

// ─── Shared primitives ─────────────────────────────────────────────────

function CuratedBlock({
  pokemon,
  hasTips,
  hasRoles,
}: {
  pokemon: Pokemon;
  hasTips: boolean;
  hasRoles: boolean;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Swords className="size-4 text-primary" />
        <h3 className="font-heading text-base font-semibold">Notes du compagnon</h3>
        <Badge className="text-[10px] uppercase">curaté</Badge>
      </div>

      {hasRoles && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(pokemon.roles as PokemonRole[]).map((r) => (
            <Badge
              key={r}
              variant="outline"
              className="border-primary/40 bg-background text-xs"
              title={ROLE_META[r]?.description}
            >
              {ROLE_META[r]?.label ?? r}
            </Badge>
          ))}
        </div>
      )}

      {hasTips && (
        <p className="text-sm leading-relaxed text-foreground/90">
          {pokemon.strategyTips}
        </p>
      )}
    </div>
  );
}

/**
 * One row in the definition-list set layout: label sticks to the
 * left at a fixed width, value flows to the right. `stack` flips it
 * to a vertical block (label above, full-width content below) — used
 * when the value is itself a grid (the 4-move row).
 */
function DefRow({
  label,
  children,
  stack,
}: {
  label: string;
  children: React.ReactNode;
  stack?: boolean;
}) {
  if (stack) {
    return (
      <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd>{children}</dd>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-1 text-sm">{children}</dd>
    </div>
  );
}

function EvSpread({ evs }: { evs: SmogonEvs }) {
  const entries = Object.entries(evs).filter(([, v]) => Boolean(v));
  if (entries.length === 0) {
    return <span className="text-[11px] italic text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([k, v]) => (
        <Badge key={k} variant="secondary" className="font-mono text-[10px]">
          {v} {EV_LABEL[k] ?? k}
        </Badge>
      ))}
    </div>
  );
}

function ShareCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}

function ShareRow({ share, children }: { share: number; children: React.ReactNode }) {
  const pct = Math.min(100, Math.round(share * 100));
  return (
    <li className="relative isolate flex items-center justify-between gap-2 overflow-hidden rounded px-1.5 py-1 text-sm">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 -z-10 rounded bg-primary/10"
        style={{ width: `${pct}%` }}
      />
      <span className="flex min-w-0 flex-1 items-center gap-1.5">{children}</span>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </li>
  );
}

function BigMoveCard({ smogonName }: { smogonName: string }) {
  const m = lookupMove(smogonName);
  // When we have a resolved move, the whole card becomes a link to the
  // dedicated /moves/[id] page; unresolved moves stay as plain divs
  // (no slug to navigate to).
  const inner = (
    <>
      <div className="flex items-center justify-between gap-1">
        {m ? (
          <TypeBadge type={m.type as PokemonTypeId} size="sm" />
        ) : (
          <Badge variant="outline" className="text-[10px]">?</Badge>
        )}
        {m && (
          <Badge variant="secondary" className="px-1 font-mono text-[10px]">
            {CATEGORY_BADGE[m.category] ?? m.category}
          </Badge>
        )}
      </div>
      <span className="truncate text-sm font-medium">{m?.name ?? smogonName}</span>
      {m && (
        <span className="font-mono text-[10px] text-muted-foreground">
          {m.power ? `${m.power}p` : "—"} / {m.accuracy ?? "—"}%
        </span>
      )}
    </>
  );
  const card = m ? (
    <Link
      href={`/moves/${m.id}`}
      className="flex flex-col gap-1 rounded-md border bg-muted/30 p-2 transition-colors hover:bg-muted/50"
    >
      {inner}
    </Link>
  ) : (
    <div className="flex flex-col gap-1 rounded-md border bg-muted/30 p-2">
      {inner}
    </div>
  );
  return <MoveTooltip move={m} fallback={smogonName}>{card}</MoveTooltip>;
}

function SmallMove({ smogonName }: { smogonName: string }) {
  const m = lookupMove(smogonName);
  const inner = (
    <>
      {m ? (
        <TypeBadge type={m.type as PokemonTypeId} size="sm" />
      ) : (
        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-muted text-[8px] text-muted-foreground">
          ?
        </span>
      )}
      <span className="truncate">{m?.name ?? smogonName}</span>
    </>
  );
  const inline = m ? (
    <Link
      href={`/moves/${m.id}`}
      className="flex min-w-0 items-center gap-1.5 hover:underline"
    >
      {inner}
    </Link>
  ) : (
    <span className="flex min-w-0 items-center gap-1.5">{inner}</span>
  );
  return <MoveTooltip move={m} fallback={smogonName}>{inline}</MoveTooltip>;
}

/**
 * Wrap any ability-displaying element with a hover tooltip showing
 * its French effect (PokéAPI flavor + short_effect). Falls through
 * to plain children when no description is available.
 */
function AbilityTooltip({
  name,
  children,
}: {
  name: string;
  children: React.ReactElement;
}) {
  const data = lookupAbility(name);
  const tip = data?.shortEffect ?? data?.description ?? null;
  if (!tip) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="max-w-xs text-left leading-snug">
        <p className="font-semibold">{frAbility(name).label}</p>
        <p className="mt-0.5 text-xs">{tip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Wrap an ability label with both the tooltip *and* a navigation Link
 * to `/abilities/<slug>`. Falls through to a tooltip-only render when
 * PokéAPI doesn't carry a canonical slug for this name.
 */
function AbilityLink({
  name,
  children,
}: {
  name: string;
  children: React.ReactElement;
}) {
  const slug = abilitySlug(name);
  if (!slug) return <AbilityTooltip name={name}>{children}</AbilityTooltip>;
  // The cursor-help cue from before doubles as a click affordance —
  // the underline shows up on hover so it stays subtle when idle.
  const linked = (
    <Link
      href={`/abilities/${slug}`}
      className="inline-flex items-baseline gap-1 cursor-pointer hover:underline"
    >
      {children}
    </Link>
  );
  return <AbilityTooltip name={name}>{linked}</AbilityTooltip>;
}

/**
 * Wrap any item-displaying element with a hover tooltip showing the
 * French description (PokéAPI flavor text + short effect). Falls
 * through to plain children when neither copy is available — but
 * still wraps so the trigger surface gets a hover transition.
 */
function ItemTooltip({
  name,
  children,
}: {
  name: string;
  children: React.ReactElement;
}) {
  const data = lookupItem(name);
  const tip = data?.description ?? data?.shortEffect ?? null;
  if (!tip) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="max-w-xs text-left leading-snug">
        <p className="font-semibold">{frItem(name).label}</p>
        <p className="mt-0.5 text-xs">{tip}</p>
        {data?.shortEffect && data.shortEffect !== tip && (
          <p className="mt-1 text-[11px] italic opacity-80">
            {data.shortEffect}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Wraps an item label with both the tooltip *and* a navigation Link
 * to `/items/<slug>`. Falls through to a tooltip-only render when
 * PokéAPI doesn't carry a canonical slug for this item.
 */
function ItemLink({
  name,
  children,
}: {
  name: string;
  children: React.ReactElement;
}) {
  const slug = itemSlug(name);
  if (!slug) return <ItemTooltip name={name}>{children}</ItemTooltip>;
  const linked = (
    <Link
      href={`/items/${slug}`}
      className="inline-flex items-center cursor-pointer hover:underline"
    >
      {children}
    </Link>
  );
  return <ItemTooltip name={name}>{linked}</ItemTooltip>;
}

/**
 * Wrap any move-displaying element with a hover tooltip showing the
 * French description. Curated `effect` wins over PokéAPI text. Falls
 * through to plain children when no copy is available.
 */
function MoveTooltip({
  move,
  fallback,
  children,
}: {
  move: ReturnType<typeof lookupMove>;
  fallback: string;
  children: React.ReactElement;
}) {
  const tip = move?.effect ?? move?.description ?? move?.shortEffect ?? null;
  if (!tip) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="max-w-xs text-left leading-snug">
        <p className="font-semibold">{move?.name ?? fallback}</p>
        <p className="mt-0.5 text-xs">{tip}</p>
        {move?.shortEffect && move.shortEffect !== tip && (
          <p className="mt-1 text-[11px] italic opacity-80">{move.shortEffect}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

