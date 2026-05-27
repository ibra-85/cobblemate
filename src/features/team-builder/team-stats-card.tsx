"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Pokemon } from "@/types";
import { getTeamStats } from "@/lib/team-analysis";

/**
 * Snapshot KPI card: average BST, HP pool, speed range and offensive
 * balance. Reveals at-a-glance "all-physical" / "all-slow" pitfalls.
 */
export function TeamStatsCard({ team }: { team: Pokemon[] }) {
  if (team.length === 0) return null;
  const s = getTeamStats(team);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Snapshot d&apos;équipe</CardTitle>
        <CardDescription>
          Statistiques agrégées pour repérer rapidement les déséquilibres.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="BST moyen" value={s.avgBst} />
        <Kpi label="Pool de PV" value={s.hpPool} sub={`${s.count}/6 membres`} />
        <Kpi
          label="Speed tier"
          value={s.fastestSpeed}
          sub={`min ${s.slowestSpeed}`}
        />
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Balance offensive
          </p>
          <div className="flex flex-wrap gap-1">
            {s.physical > 0 && (
              <Badge variant="secondary">{s.physical} phys</Badge>
            )}
            {s.specialAttackers > 0 && (
              <Badge variant="secondary">{s.specialAttackers} spé</Badge>
            )}
            {s.mixed > 0 && <Badge variant="outline">{s.mixed} mixed</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-heading text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
