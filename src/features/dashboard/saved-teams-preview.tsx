"use client";

import Link from "next/link";
import { Users, ArrowRight, Plus, Dices } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import { analyzeTeam, resolveTeam } from "@/lib/team-analysis";
import { cn } from "@/lib/utils";

/**
 * Renders inside a ColumnCard. Returns content only (no outer Card) so
 * the parent controls width/height consistency with sibling columns.
 */
export function SavedTeamsPreview() {
  const { teams, hydrated } = useSavedTeams();

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Synchronisation…
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary">
          <Users className="size-5" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium">Aucune équipe sauvegardée</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Démarre une compo ou pioche au hasard pour tester ton premier
            matchup.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          <Link
            href="/team-builder"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-3" />
            Nouvelle
          </Link>
          <Link
            href="/team-builder?random=1"
            className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <Dices className="size-3" />
            Aléatoire
          </Link>
        </div>
      </div>
    );
  }

  const sorted = [...teams].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex flex-1 flex-col gap-2">
      {sorted.slice(0, 4).map((t) => {
        const members = resolveTeam(t.slots);
        const analysis = analyzeTeam(members);
        return (
          <Link
            key={t.id}
            href="/team-builder"
            className="group flex items-center gap-4 rounded-md border px-3 py-2.5 transition-colors hover:border-foreground/20 hover:bg-accent/40"
          >
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="grid size-9 place-items-center rounded-full border-2 border-background bg-muted p-0.5"
                  title={p.name}
                >
                  <PokemonSprite pokemon={p} />
                </div>
              ))}
              {members.length > 4 && (
                <div className="grid size-9 place-items-center rounded-full border-2 border-background bg-muted text-[10px] font-bold text-muted-foreground">
                  +{members.length - 4}
                </div>
              )}
              {members.length === 0 && (
                <div className="grid size-9 place-items-center rounded-full border-2 border-dashed border-border bg-muted text-muted-foreground">
                  <Plus className="size-4" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium group-hover:text-foreground">
                {t.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {members.length}/6 ·{" "}
                {new Date(t.updatedAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            <Badge
              variant={
                analysis.score >= 75
                  ? "default"
                  : analysis.score >= 50
                    ? "secondary"
                    : "destructive"
              }
              className={cn("shrink-0 font-mono")}
            >
              {analysis.score}
            </Badge>
          </Link>
        );
      })}
      {teams.length > 4 && (
        <Link
          href="/team-builder"
          className="mt-auto inline-flex items-center justify-center gap-1 rounded-md border border-dashed py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Voir les {teams.length - 4} autres
          <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}
