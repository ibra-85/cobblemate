import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TypeBadge } from "@/components/site/type-badge";
import { lookupMove } from "@/data/moves";
import { getSpeciesExtras } from "@/data/species-extras";

interface Props {
  pokemonId: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  physical: "Phys",
  special:  "Spé",
  status:   "Stat",
};

/**
 * Move learnsets split by source (level / TM / tutor / egg / legacy /
 * special). Mirrors how Pokémon games surface this — "how do I get
 * this move?" is the first question a player asks.
 *
 * `level` is the only tab that carries the level alongside the move.
 * The others are flat lists ranked alphabetically by translated name.
 */
export function MovesTable({ pokemonId }: Props) {
  const moves = getSpeciesExtras(pokemonId)?.movesByMethod;
  if (!moves) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune liste d&apos;attaques disponible pour ce Pokémon.
      </p>
    );
  }

  const tabs = [
    { id: "level", label: "Niveau",  count: moves.level.length },
    { id: "tm",    label: "CT/CS",   count: moves.tm.length },
    { id: "egg",   label: "Œuf",     count: moves.egg.length },
    { id: "tutor", label: "Tuteur",  count: moves.tutor.length },
    { id: "legacy",label: "Legacy",  count: moves.legacy.length },
    { id: "special",label: "Évent",  count: moves.special.length },
  ].filter((t) => t.count > 0);

  if (tabs.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune attaque référencée.</p>;
  }

  return (
    <Tabs defaultValue={tabs[0].id}>
      <TabsList className="flex-wrap">
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
            {t.label}
            <Badge variant="secondary" className="px-1.5 font-mono text-[10px]">
              {t.count}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Level-up — show level in the first column. */}
      {moves.level.length > 0 && (
        <TabsContent value="level" className="mt-3">
          <MoveList
            entries={moves.level.map(({ level, move }) => ({
              moveId: move,
              prefix: <span className="font-mono text-xs text-muted-foreground">Lv.{level}</span>,
            }))}
          />
        </TabsContent>
      )}

      {(["tm", "egg", "tutor", "legacy", "special"] as const).map((kind) =>
        moves[kind].length > 0 ? (
          <TabsContent key={kind} value={kind} className="mt-3">
            <MoveList
              entries={moves[kind].map((move) => ({ moveId: move }))}
            />
          </TabsContent>
        ) : null,
      )}
    </Tabs>
  );
}

function MoveList({
  entries,
}: {
  entries: { moveId: string; prefix?: React.ReactNode }[];
}) {
  return (
    <div className="grid gap-1.5 md:grid-cols-2">
      {entries.map(({ moveId, prefix }, i) => {
        const m = lookupMove(moveId);
        if (!m) {
          return (
            <div
              key={`${moveId}-${i}`}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground"
            >
              {prefix}
              <span className="font-mono text-xs">{moveId}</span>
              <span className="ml-auto text-[10px] uppercase">à venir</span>
            </div>
          );
        }
        return (
          <Link
            key={`${moveId}-${i}`}
            href={`/moves/${m.id}`}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/30"
          >
            {prefix}
            <TypeBadge type={m.type} size="sm" />
            <span className="font-medium">{m.name}</span>
            <span className="ml-auto flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Badge variant="outline" className="px-1.5">
                {CATEGORY_LABEL[m.category] ?? m.category}
              </Badge>
              {m.power ?? "—"} pwr
              <span aria-hidden>·</span>
              {m.accuracy ?? "—"}%
            </span>
          </Link>
        );
      })}
    </div>
  );
}
