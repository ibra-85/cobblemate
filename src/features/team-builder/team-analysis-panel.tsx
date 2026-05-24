"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TypeBadges } from "@/components/site/type-badge";
import type { TeamAnalysis } from "@/lib/team-analysis";
import type { PokemonTypeId } from "@/types";
import { cn } from "@/lib/utils";

const orderedEntries = (
  map: Partial<Record<PokemonTypeId, number>>,
): [PokemonTypeId, number][] =>
  (Object.entries(map) as [PokemonTypeId, number][]).sort(([, a], [, b]) => b - a);

function scoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 75) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}

export function TeamAnalysisPanel({ analysis }: { analysis: TeamAnalysis }) {
  const weakEntries = orderedEntries(analysis.sharedWeaknesses).filter(([, n]) => n >= 2);
  const resistEntries = orderedEntries(analysis.resistanceCoverage);
  const immuneEntries = orderedEntries(analysis.immunityCoverage);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Note d&apos;équilibre</CardTitle>
            <Badge variant={scoreBadgeVariant(analysis.score)} className="text-base">
              {analysis.score}/100
            </Badge>
          </div>
          <CardDescription>
            {analysis.members.length}/6 Pokémon · {analysis.presentRoles.length} rôles couverts.
          </CardDescription>
        </CardHeader>
        {analysis.missingRoles.length > 0 && (
          <CardContent className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Rôles manquants
            </p>
            <div className="flex flex-wrap gap-1">
              {analysis.missingRoles.map((r) => (
                <Badge key={r} variant="secondary">{r}</Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faiblesses partagées</CardTitle>
          <CardDescription>
            Types contre lesquels plusieurs membres souffrent.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          {weakEntries.length === 0 && (
            <p className="text-muted-foreground">
              Pas de faiblesse partagée par 2 Pokémon ou plus. Excellent !
            </p>
          )}
          {weakEntries.map(([t, n]) => (
            <div
              key={t}
              className="flex items-center justify-between rounded-md border px-2 py-1"
            >
              <TypeBadges types={[t]} size="sm" />
              <span
                className={cn(
                  "font-mono text-xs",
                  n >= 3 ? "text-destructive" : "text-foreground",
                )}
              >
                {n} membres
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Résistances</CardTitle>
            <CardDescription>Couvertes par au moins un membre.</CardDescription>
          </CardHeader>
          <CardContent>
            <TypeBadges types={resistEntries.map(([t]) => t)} size="sm" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Immunités</CardTitle>
            <CardDescription>0× pour ces types.</CardDescription>
          </CardHeader>
          <CardContent>
            {immuneEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune immunité.</p>
            ) : (
              <TypeBadges types={immuneEntries.map(([t]) => t)} size="sm" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Couverture offensive</CardTitle>
          <CardDescription>
            Types frappés ≥×2 par au moins un STAB de l&apos;équipe.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <TypeBadges types={analysis.offensiveCoverage} size="sm" />
          {analysis.missingOffensiveTypes.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase text-destructive">
                Types non couverts
              </p>
              <TypeBadges types={analysis.missingOffensiveTypes} size="sm" />
            </div>
          )}
        </CardContent>
      </Card>

      {analysis.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pokémon à ajouter</CardTitle>
            <CardDescription>
              Boucher les trous défensifs et de rôle.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {analysis.suggestions.map((p) => (
              <Link
                key={p.id}
                href={`/pokedex/${p.id}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-accent"
              >
                <span className="font-medium">{p.name}</span>
                <TypeBadges types={p.types} size="sm" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
