"use client";

import { memo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Plus } from "lucide-react";
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
import type {
  TeamAnalysis,
  TeamReplacement,
  ThreatNote,
} from "@/lib/team-analysis";
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

const AXIS_LABEL: Record<keyof TeamAnalysis["breakdown"], string> = {
  offense: "Offense",
  defense: "Défense",
  speed: "Vitesse",
  hazard: "Hazard",
  utility: "Utility",
  synergy: "Synergie",
  reliability: "Fiabilité",
};

/**
 * Headline analysis — score + 6-axis breakdown + shared weaknesses.
 *
 * The breakdown is the post-V1 addition: instead of staring at a
 * single "61/100" number with no recourse, the player now sees
 * `Defense 52` standing out next to `Offense 96` and immediately
 * knows where to invest. Each bar is the axis value standalone — the
 * headline score is the weighted blend (see BREAKDOWN_WEIGHTS in
 * team-analysis.ts).
 */
export const TeamAnalysisHeader = memo(function TeamAnalysisHeader({ analysis }: { analysis: TeamAnalysis }) {
  const weakEntries = orderedEntries(analysis.sharedWeaknesses).filter(([, n]) => n >= 2);

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
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            {(Object.keys(AXIS_LABEL) as (keyof typeof AXIS_LABEL)[]).map(
              (k) => (
                <AxisBar
                  key={k}
                  label={AXIS_LABEL[k]}
                  axis={analysis.breakdown[k]}
                />
              ),
            )}
          </div>
          {analysis.missingRoles.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t pt-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Rôles manquants
              </p>
              <div className="flex flex-wrap gap-1">
                {analysis.missingRoles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-[10px]">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {analysis.threats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Menaces & forces</CardTitle>
            <CardDescription>
              Ce que l&apos;équipe craint et ce qu&apos;elle domine.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            {analysis.threats.map((t, i) => (
              <ThreatRow key={i} note={t} />
            ))}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
});

/**
 * Defensive + offensive coverage block. Lives below the slot grid in
 * the main column — it's the "what's covered, what isn't" surface,
 * dense but glanceable.
 */
export const TeamAnalysisCoverage = memo(function TeamAnalysisCoverage({ analysis }: { analysis: TeamAnalysis }) {
  const resistEntries = orderedEntries(analysis.resistanceCoverage);
  const immuneEntries = orderedEntries(analysis.immunityCoverage);

  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
});

/**
 * Concrete "do this to improve" card.
 *
 * Two visually distinct sub-lists:
 *  - **Remplacer** — swaps of mons currently in the team. Always
 *    rendered first so the player sees actionable changes to their
 *    actual roster before "fill empty slots" prompts.
 *  - **Ajouter** — only present when the team has < 6 mons. Splitting
 *    these out fixes the old bug where the +N gain from filling an
 *    empty slot ranked above real swaps, so the very first row read
 *    "Slot vide → X" and looked like a labelling glitch.
 *
 * Clicking a row applies the swap directly via `onApply` (no detour
 * through the Pokédex page anymore) — the optimiser already restricts
 * candidates to final evolutions, so there's no risk of accidentally
 * picking up a base form.
 */
export const TeamAnalysisSuggestions = memo(function TeamAnalysisSuggestions({
  analysis,
  onApply,
}: {
  analysis: TeamAnalysis;
  onApply: (replacement: TeamReplacement) => void;
}) {
  const swaps = analysis.replacements.filter((r) => r.current !== null);
  const adds = analysis.replacements.filter((r) => r.current === null);

  // The replacement search now filters out swaps below a quality
  // threshold (or with too much critical loss) — when the team is
  // already well-tuned the list comes back empty and we surface a
  // "nothing meaningful to suggest" state instead of staying silent.
  // The team-builder pipeline only mounts this component when the
  // team has ≥1 Pokémon, so we don't need to special-case the empty
  // team case here.
  if (analysis.members.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Améliorer l&apos;équipe</CardTitle>
        <CardDescription>
          Clique pour appliquer l&apos;échange directement. Évolutions finales
          uniquement.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {analysis.replacements.length === 0 && (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Aucune amélioration évidente trouvée — l&apos;équipe est
            cohérente. Les suggestions qui sacrifient un rôle critique
            (pivot, hazards, spinblocker…) sont filtrées par défaut.
          </p>
        )}
        {swaps.length > 0 && (
          <Section title="Remplacer">
            {swaps.map((r, i) => (
              <ReplacementRow
                key={`swap-${i}`}
                replacement={r}
                onApply={onApply}
              />
            ))}
          </Section>
        )}
        {adds.length > 0 && (
          <Section title="Ajouter">
            {adds.map((r, i) => (
              <ReplacementRow
                key={`add-${i}`}
                replacement={r}
                onApply={onApply}
              />
            ))}
          </Section>
        )}
      </CardContent>
    </Card>
  );
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

/**
 * One row in the score breakdown grid: label + numeric value +
 * coloured progress bar, with an expandable factor list.
 *
 * Coloured tone tells the eye where the score is being dragged down;
 * the toggle opens a list of the concrete bonuses/penalties that
 * produced the value — so the user can act on the cause, not just
 * stare at "Hazard 38" with no explanation.
 */
function AxisBar({
  label,
  axis,
}: {
  label: string;
  axis: { value: number; factors: { delta: number; label: string }[] };
}) {
  const [open, setOpen] = useState(false);
  const { value, factors } = axis;
  const tone =
    value >= 80
      ? "bg-emerald-500"
      : value >= 60
      ? "bg-blue-500"
      : value >= 40
      ? "bg-amber-500"
      : "bg-destructive";
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-baseline justify-between text-[10px]"
      >
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-foreground">
          {value}
          <ChevronDown
            className={cn(
              "ml-1 inline size-3 transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${value}%` }}
        />
      </div>
      {open && factors.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 rounded-md border bg-muted/40 px-2 py-1.5 text-[10px]">
          {factors.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="truncate text-muted-foreground">{f.label}</span>
              <span
                className={cn(
                  "shrink-0 font-mono",
                  f.delta > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : f.delta < 0
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {f.delta > 0 ? `+${f.delta}` : f.delta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One line in the "Menaces & forces" card. Yellow triangle for
 * warnings, green check for strengths — the icon carries the verdict
 * so the user can scan the column without reading every label.
 */
function ThreatRow({ note }: { note: ThreatNote }) {
  const isWarn = note.level === "warn";
  // Severity drives the border intensity for warn-level notes so the
  // user can scan severity ahead of reading the label — high = full
  // destructive border, medium = softer, low = barely visible. Good
  // notes always render at full emerald regardless.
  const severity = note.severity ?? "medium";
  const warnBorder = isWarn
    ? severity === "high"
      ? "border-destructive/60 bg-destructive/10"
      : severity === "medium"
        ? "border-destructive/30 bg-destructive/5"
        : "border-destructive/15 bg-destructive/5"
    : "border-emerald-500/30 bg-emerald-500/5";
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-md border px-2 py-1.5 text-xs",
        warnBorder,
      )}
    >
      <div className="flex items-center gap-2">
        {isWarn ? (
          <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
        ) : (
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        )}
        <span className="min-w-0 flex-1 font-medium">{note.label}</span>
        {isWarn && severity === "high" && (
          <span className="shrink-0 rounded bg-destructive/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-destructive">
            critique
          </span>
        )}
      </div>
      {note.reasons && note.reasons.length > 0 && (
        <ul className="flex flex-col gap-0.5 pl-5 text-[11px] text-muted-foreground">
          {note.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="list-disc">
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReplacementRow({
  replacement,
  onApply,
}: {
  replacement: TeamReplacement;
  onApply: (replacement: TeamReplacement) => void;
}) {
  const { current, candidate, gain, factors } = replacement;
  // Buttons (not Links) — the click applies the swap in-place rather
  // than navigating away. `cursor-pointer` + bordered hover state make
  // the affordance obvious in the narrow right rail.
  return (
    <button
      type="button"
      onClick={() => onApply(replacement)}
      className="flex w-full cursor-pointer flex-col gap-1.5 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:border-primary hover:bg-accent"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {current ? (
          <>
            <PokemonSprite pokemon={current} size="size-7" />
            <span className="min-w-0 flex-1 truncate text-xs">
              {current.name}
            </span>
          </>
        ) : (
          <>
            <span className="grid size-7 place-items-center rounded-md border border-dashed">
              <Plus className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 text-xs italic">
              Slot libre
            </span>
          </>
        )}
        <ArrowRight className="size-3.5 shrink-0 opacity-60" />
      </div>

      <div className="flex items-center gap-2">
        <PokemonSprite pokemon={candidate} size="size-9" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {candidate.name}
        </span>
        <TypeBadges types={candidate.types} size="sm" />
        <Badge variant="default" className="shrink-0 font-mono">
          +{gain}
        </Badge>
      </div>

      {/* Reasons strip — keeps the suggestion explainable. Tags are
          coloured by sign so "+ set Smogon viable" reads green and
          "− rôles déjà couverts" reads muted destructive at a glance. */}
      {factors && factors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {factors.map((f, i) => (
            <span
              key={i}
              className={
                f.sign === "+"
                  ? "inline-flex items-center gap-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300"
                  : "inline-flex items-center gap-0.5 rounded border border-destructive/30 bg-destructive/5 px-1.5 py-0.5 text-[10px] text-destructive"
              }
            >
              <span aria-hidden>{f.sign}</span>
              {f.label}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

/**
 * Backwards-compat: the full analysis stack stitched together. Kept
 * as a default export so any caller that hasn't moved to the split
 * components still works. `onApply` is required because the
 * suggestions are now interactive — there's no read-only mode.
 */
export function TeamAnalysisPanel({
  analysis,
  onApply,
}: {
  analysis: TeamAnalysis;
  onApply: (replacement: TeamReplacement) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <TeamAnalysisHeader analysis={analysis} />
      <TeamAnalysisCoverage analysis={analysis} />
      <TeamAnalysisSuggestions analysis={analysis} onApply={onApply} />
    </div>
  );
}
