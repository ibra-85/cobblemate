"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Pokemon, PokemonTypeId } from "@/types";
import { ALL_TYPES, calculateTypeEffectiveness } from "@/lib/type-chart";
import { TYPES_META } from "@/data/types";
import { cn } from "@/lib/utils";

function bestOffense(p: Pokemon, def: PokemonTypeId): number {
  // STAB-only: assume the member can always reach a same-type coverage move.
  return Math.max(...p.types.map((t) => calculateTypeEffectiveness(t, [def])));
}

function cellClass(m: number) {
  if (m === 0) return "bg-foreground/80 text-background";
  if (m === 0.25) return "bg-destructive/30 text-destructive";
  if (m === 0.5) return "bg-destructive/15 text-destructive";
  if (m === 2) return "bg-primary/20 text-foreground";
  if (m === 4) return "bg-primary/40 text-foreground";
  return "text-muted-foreground";
}

/**
 * Sibling of the defensive matrix — shows, for each member, how hard its
 * STAB hits every defending type. Useful to spot offensive holes (a row
 * with no green at all means no one breaks that type).
 */
export function TeamOffensiveMatrix({ team }: { team: Pokemon[] }) {
  if (team.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matrice offensive (STAB)</CardTitle>
        <CardDescription>
          Multiplicateur du meilleur STAB de chaque membre contre chaque type.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card p-1 text-left text-muted-foreground">
                Membre / Type défenseur
              </th>
              {ALL_TYPES.map((def) => (
                <th key={def} className="p-1">
                  <span
                    className="block rounded px-1 py-0.5 text-[9px] font-bold uppercase"
                    style={{
                      backgroundColor: TYPES_META[def].color,
                      color: TYPES_META[def].fg,
                    }}
                  >
                    {TYPES_META[def].label.slice(0, 3)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {team.map((p) => (
              <tr key={p.id} className="border-t">
                <th className="sticky left-0 z-10 bg-card p-1 text-left">
                  <span className="block truncate text-xs font-medium">
                    {p.name}
                  </span>
                </th>
                {ALL_TYPES.map((def) => {
                  const m = bestOffense(p, def);
                  return (
                    <td
                      key={def}
                      className={cn(
                        "p-1 text-center font-mono",
                        cellClass(m),
                      )}
                      title={`${p.name} → ${TYPES_META[def].label} = ×${m}`}
                    >
                      {m === 1 ? "·" : `×${m}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
