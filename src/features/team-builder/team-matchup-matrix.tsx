"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Pokemon } from "@/types";
import { ALL_TYPES, calculateTypeEffectiveness } from "@/lib/type-chart";
import { TYPES_META } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * Defensive matrix: each row is an offensive type, each column is a team
 * member. Helps spot at a glance whether the whole team is weak to one
 * type (rows full of red) or whether a specific member is the "Fire pivot"
 * (their column has the Fire row green).
 */
function cellClass(m: number) {
  if (m === 0) return "bg-foreground/80 text-background";
  if (m === 0.25) return "bg-primary/30 text-foreground";
  if (m === 0.5) return "bg-primary/15 text-foreground";
  if (m === 2) return "bg-destructive/20 text-destructive";
  if (m === 4) return "bg-destructive/40 text-destructive-foreground";
  return "text-muted-foreground";
}

export function TeamMatchupMatrix({ team }: { team: Pokemon[] }) {
  if (team.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matrice défensive</CardTitle>
        <CardDescription>
          Multiplicateur subi par chaque membre, type par type.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card p-1 text-left text-muted-foreground">
                Type / Membre
              </th>
              {team.map((p) => (
                <th key={p.id} className="p-1 text-center">
                  <span className="block truncate text-xs font-medium">
                    {p.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_TYPES.map((t) => (
              <tr key={t} className="border-t">
                <th className="sticky left-0 z-10 bg-card p-1 text-left">
                  <span
                    className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                    style={{
                      backgroundColor: TYPES_META[t].color,
                      color: TYPES_META[t].fg,
                    }}
                  >
                    {TYPES_META[t].label}
                  </span>
                </th>
                {team.map((p) => {
                  const m = calculateTypeEffectiveness(t, p.types);
                  return (
                    <td
                      key={p.id}
                      className={cn(
                        "p-1 text-center font-mono",
                        cellClass(m),
                      )}
                      title={`${p.name} prend ×${m} contre ${TYPES_META[t].label}`}
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
