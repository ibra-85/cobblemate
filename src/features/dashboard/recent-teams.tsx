"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import { analyzeTeam, resolveTeam } from "@/lib/team-analysis";

/**
 * Compact dashboard widget: shows up to 3 most recently updated teams,
 * each with its current balance score and a sprite preview.
 */
export function RecentTeams() {
  const { teams, hydrated } = useSavedTeams();

  if (!hydrated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes équipes</CardTitle>
          <CardDescription>Chargement…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes équipes</CardTitle>
          <CardDescription>Aucune équipe sauvegardée.</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Pas encore d&apos;équipe</EmptyTitle>
              <EmptyDescription>
                Ouvre le builder pour en créer une.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const recent = [...teams]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4" />
            <CardTitle>Mes équipes</CardTitle>
          </div>
          <Link
            href="/team-builder"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Toutes <ArrowRight className="size-3" />
          </Link>
        </div>
        <CardDescription>
          Tes 3 équipes les plus récentes, avec leur note d&apos;équilibre.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {recent.map((t) => {
          const members = resolveTeam(t.slots);
          const score = analyzeTeam(members).score;
          return (
            <Link
              key={t.id}
              href="/team-builder"
              className="flex items-center gap-3 rounded-md border bg-card p-3 hover:bg-accent/50"
            >
              <div className="flex -space-x-3">
                {members.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="grid size-9 place-items-center rounded-full border-2 border-background bg-muted p-0.5"
                  >
                    <PokemonSprite pokemon={p} size="size-full" />
                  </div>
                ))}
                {members.length === 0 && (
                  <span className="text-xs text-muted-foreground">vide</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold">{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {members.length}/6 · maj {new Date(t.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <Badge
                variant={score >= 75 ? "default" : score >= 50 ? "secondary" : "destructive"}
              >
                {score}/100
              </Badge>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

