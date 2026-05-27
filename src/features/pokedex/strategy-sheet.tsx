import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TypeBadge } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { MOVE_BY_ID } from "@/data/moves";
import type {
  Pokemon,
  PokemonUsage,
  StrategySet,
  UsageStat,
} from "@/types";

const fmt = (p: number) => `${p.toFixed(p < 1 ? 2 : 1)} %`;

/**
 * Horizontal "%" bar — visual weight matches the percentage on a 0–100
 * scale. We keep all rows the same height so they line up vertically.
 */
function UsageBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full bg-foreground/70"
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

interface UsageBlockProps<T extends string = string> {
  title: string;
  description?: string;
  stats: UsageStat<T>[];
  /** Custom renderer for the label of each row. */
  renderLabel?: (value: T) => React.ReactNode;
}

function UsageBlock<T extends string = string>({
  title,
  description,
  stats,
  renderLabel,
}: UsageBlockProps<T>) {
  if (stats.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {stats.map((s, i) => (
          <div key={`${s.value}-${i}`} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 truncate">
                {renderLabel ? renderLabel(s.value as T) : s.value}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {fmt(s.percent)}
              </span>
            </div>
            <UsageBar percent={s.percent} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MoveLabel({ id }: { id: string }) {
  const m = MOVE_BY_ID[id];
  if (!m) return <span>{id}</span>;
  return (
    <>
      <TypeBadge type={m.type} size="sm" />
      <span className="truncate">{m.name}</span>
    </>
  );
}

function TeammateLabel({ id }: { id: string }) {
  const p = POKEMON_BY_ID[id];
  if (!p) return <span>{id}</span>;
  return (
    <Link
      href={`/pokedex/${p.id}`}
      className="flex min-w-0 items-center gap-2 hover:underline"
    >
      <span className="grid size-6 place-items-center rounded-full bg-muted p-0.5">
        <PokemonSprite pokemon={p} size="size-full" />
      </span>
      <span className="truncate">{p.name}</span>
    </Link>
  );
}

function UsageGrid({ usage }: { usage: PokemonUsage }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Statistiques d&apos;utilisation</CardTitle>
          <CardDescription>
            Données agrégées (style Smogon). Les pourcentages reflètent la
            fréquence à laquelle l&apos;option est choisie.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Usage global</span>
          <Badge variant="default" className="font-mono text-base">
            {fmt(usage.usagePercent)}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <UsageBlock title="Talents" stats={usage.abilities} />
        <UsageBlock title="Objets tenus" stats={usage.items} />
        <UsageBlock
          title="Équipiers fréquents"
          stats={usage.teammates}
          renderLabel={(id) => <TeammateLabel id={id} />}
        />
        <UsageBlock
          title="Capacités portées"
          stats={usage.moves}
          renderLabel={(id) => <MoveLabel id={id} />}
        />
        <UsageBlock
          title="Reparts d'EVs"
          description="Distribution d'EVs la plus jouée."
          stats={usage.spreads}
        />
      </div>
    </div>
  );
}

function SetCard({ set }: { set: StrategySet }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{set.name}</CardTitle>
          <Badge variant="secondary">{set.ability}</Badge>
        </div>
        {set.notes && <CardDescription>{set.notes}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
          <span className="text-xs uppercase text-muted-foreground">Objet</span>
          <div className="flex flex-wrap gap-1">
            {set.items.map((it) => (
              <Badge key={it} variant="outline">{it}</Badge>
            ))}
          </div>
          <span className="text-xs uppercase text-muted-foreground">Nature</span>
          <span>{set.nature}</span>
          <span className="text-xs uppercase text-muted-foreground">EVs</span>
          <span className="font-mono text-xs">{set.evs}</span>
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase text-muted-foreground">Capacités</span>
          {set.moves.map((slot, i) => {
            const main = MOVE_BY_ID[slot.primary];
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                {main ? (
                  <>
                    <TypeBadge type={main.type} size="sm" />
                    <span className="font-medium">{main.name}</span>
                  </>
                ) : (
                  <span className="font-medium">{slot.primary}</span>
                )}
                {slot.alternatives && slot.alternatives.length > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">/</span>
                    {slot.alternatives.map((altId) => {
                      const alt = MOVE_BY_ID[altId];
                      return alt ? (
                        <span
                          key={altId}
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <TypeBadge type={alt.type} size="sm" /> {alt.name}
                        </span>
                      ) : (
                        <span
                          key={altId}
                          className="text-xs text-muted-foreground"
                        >
                          {altId}
                        </span>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function StrategySheet({ pokemon }: { pokemon: Pokemon }) {
  if (!pokemon.usage && (!pokemon.sets || pokemon.sets.length === 0)) {
    return null;
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-xl font-semibold">
          Fiche stratégique de {pokemon.name}
        </h2>
        <span className="text-xs text-muted-foreground">
          source : usage agrégé
        </span>
      </div>

      {pokemon.usage && <UsageGrid usage={pokemon.usage} />}

      {pokemon.sets && pokemon.sets.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-heading text-lg font-semibold">
            Sets stratégiques
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {pokemon.sets.map((s) => (
              <SetCard key={s.name} set={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
