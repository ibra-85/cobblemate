"use client";

import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import { analyzeTeam, resolveTeam } from "@/lib/team-analysis";
import type { PokemonTypeId } from "@/types";

/**
 * Smart insight card: picks the user's highest-scored team and surfaces
 * the most actionable advice (top shared weakness + first suggestion).
 * Stays silent if no teams exist — empty space invites focus elsewhere.
 */
export function SmartTips() {
  const { teams, hydrated } = useSavedTeams();
  if (!hydrated || teams.length === 0) return null;

  // Pick the most recently updated team — that's "the one being worked on".
  const focused = teams
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]!;
  const members = resolveTeam(focused.slots);
  if (members.length === 0) return null;

  const analysis = analyzeTeam(members);
  const topWeakness = (
    Object.entries(analysis.sharedWeaknesses) as [PokemonTypeId, number][]
  ).sort(([, a], [, b]) => b - a)[0];
  const suggestion = analysis.suggestions[0];

  // Nothing actionable? Skip.
  if (!topWeakness && !suggestion) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-primary" />
          <CardTitle className="text-base">
            Conseils pour « {focused.name} »
          </CardTitle>
        </div>
        <CardDescription>
          Basé sur l&apos;équipe la plus récemment éditée.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {topWeakness && topWeakness[1] >= 2 && (
          <div className="flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase text-destructive">
                Faiblesse partagée
              </p>
              <p>
                <strong>{topWeakness[1]} membres</strong> sont faibles au type
                ci-dessous.
              </p>
            </div>
            <TypeBadges types={[topWeakness[0]]} size="sm" />
          </div>
        )}

        {suggestion && (
          <Link
            href={`/pokedex/${suggestion.id}`}
            className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <PokemonSprite pokemon={suggestion} size="size-10" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase text-muted-foreground">
                  Recommandé à ajouter
                </span>
                <span className="font-medium">{suggestion.name}</span>
                <TypeBadges types={suggestion.types} size="sm" />
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Score actuel · {analysis.score}/100
          </span>
          <Badge
            variant={
              analysis.score >= 75
                ? "default"
                : analysis.score >= 50
                  ? "secondary"
                  : "destructive"
            }
            className="font-mono"
          >
            {analysis.score}/100
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
