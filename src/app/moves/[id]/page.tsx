import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Swords, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TypeBadge } from "@/components/site/type-badge";
import { lookupMove } from "@/data/moves";
import { getMoveLearners, allLearnableMoveIds } from "@/data/move-learners";
import { LearnersPanel } from "@/features/moves/learners-panel";
import type { PokemonTypeId } from "@/types";

export function generateStaticParams() {
  return allLearnableMoveIds().map((id) => ({ id }));
}

const CATEGORY_BADGE_LABEL: Record<string, string> = {
  physical: "Physique", special: "Spéciale", status: "Statut",
};

export default async function MoveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const move = lookupMove(id);
  const learners = getMoveLearners(id);

  // If the move id has no metadata AND no learners, this isn't a real
  // move — 404 rather than serve an empty page.
  const hasAnyLearner =
    learners.level.length +
      learners.tm.length +
      learners.egg.length +
      learners.tutor.length +
      learners.legacy.length +
      learners.special.length >
    0;
  if (!move && !hasAnyLearner) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/moves"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour aux attaques
      </Link>

      <MoveHero move={move} id={id} learnerCount={countLearners(learners)} />

      <LearnersPanel learners={learners} />
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────

function MoveHero({
  move,
  id,
  learnerCount,
}: {
  move: ReturnType<typeof lookupMove>;
  id: string;
  learnerCount: number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Swords className="size-5 text-muted-foreground" />
          <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
            {move?.name ?? humanizeId(id)}
          </h1>
          {move?.nameEn && move.nameEn !== move.name && (
            <span className="text-base italic text-muted-foreground">
              {move.nameEn}
            </span>
          )}
          {move && (
            <TypeBadge type={move.type as PokemonTypeId} className="ml-2" />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Stat label="Catégorie">
            {move ? (
              <Badge variant="secondary" className="text-xs">
                {CATEGORY_BADGE_LABEL[move.category] ?? move.category}
              </Badge>
            ) : (
              <Muted>—</Muted>
            )}
          </Stat>
          <Stat label="Puissance">
            <Big>{move?.power ?? "—"}</Big>
          </Stat>
          <Stat label="Précision">
            <Big>{move?.accuracy != null ? `${move.accuracy}%` : "—"}</Big>
          </Stat>
          <Stat label="PP">
            <Big>{move?.pp ?? "—"}</Big>
          </Stat>
        </div>

        {(move?.effect || move?.shortEffect || move?.description) && (
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
            {(move.effect || move.description) && (
              <p className="text-sm leading-relaxed">
                {move.effect ?? move.description}
              </p>
            )}
            {move.shortEffect && move.shortEffect !== (move.effect ?? move.description) && (
              <p className="flex items-start gap-1.5 text-xs italic text-muted-foreground">
                <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                {move.shortEffect}
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{learnerCount}</strong>{" "}
          Pokémon apprennent cette attaque dans Cobblemon.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Primitives ────────────────────────────────────────────────────────

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border bg-muted/30 p-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-lg font-bold">{children}</span>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="italic text-muted-foreground">{children}</span>;
}

function humanizeId(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function countLearners(learners: ReturnType<typeof getMoveLearners>): number {
  // A Pokémon could appear in multiple methods (level + TM); we still
  // sum naively because the user is interested in "how many slots in
  // Cobblemon teach this", not the distinct mon count.
  return (
    learners.level.length +
    learners.tm.length +
    learners.egg.length +
    learners.tutor.length +
    learners.legacy.length +
    learners.special.length
  );
}
