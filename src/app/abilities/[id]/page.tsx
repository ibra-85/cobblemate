import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import {
  lookupAbility,
  getAbilityLearners,
  allAbilitySlugs,
  type AbilityLearner,
} from "@/data/abilities-pokeapi";
import { frAbility } from "@/data/smogon";

export function generateStaticParams() {
  return allAbilitySlugs().map((id) => ({ id }));
}

export default async function AbilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ability = lookupAbility(id);
  const learners = getAbilityLearners(id);

  if (!ability && learners.length === 0) notFound();

  const display = ability
    ? frAbility(ability.nameEn).label
    : humanize(id);

  const normalLearners = learners.filter((l) => !l.hidden);
  const hiddenLearners = learners.filter((l) => l.hidden);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/abilities"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour aux talents
      </Link>

      {/* Hero */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Wand2 className="size-5 text-amber-500" />
            <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
              {display}
            </h1>
            {ability?.nameEn && ability.nameEn !== display && (
              <span className="text-base italic text-muted-foreground">
                {ability.nameEn}
              </span>
            )}
          </div>

          {(ability?.shortEffect || ability?.description) && (
            <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
              {ability.shortEffect && (
                <p className="text-sm leading-relaxed">{ability.shortEffect}</p>
              )}
              {ability.description && ability.description !== ability.shortEffect && (
                <p className="flex items-start gap-1.5 text-xs italic text-muted-foreground">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                  {ability.description}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">{learners.length}</strong>{" "}
            Pokémon possèdent ce talent dans Cobblemon
            {hiddenLearners.length > 0 && (
              <>
                {" "}— dont{" "}
                <strong className="text-foreground">{hiddenLearners.length}</strong>{" "}
                en talent caché
              </>
            )}
            .
          </p>
        </CardContent>
      </Card>

      {/* Learners */}
      {normalLearners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Talent normal
              <Badge variant="secondary" className="font-mono text-[10px]">
                {normalLearners.length}
              </Badge>
            </CardTitle>
            <CardDescription>Disponible directement à la capture.</CardDescription>
          </CardHeader>
          <CardContent>
            <LearnerGrid learners={normalLearners} />
          </CardContent>
        </Card>
      )}

      {hiddenLearners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Talent caché
              <Badge
                variant="outline"
                className="border-primary/40 bg-primary/5 font-mono text-[10px] text-primary"
              >
                {hiddenLearners.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Rare, débloqué via certaines méthodes spécifiques (raids, capsule, …).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LearnerGrid learners={hiddenLearners} hidden />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LearnerGrid({
  learners,
  hidden,
}: {
  learners: AbilityLearner[];
  hidden?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {learners.map(({ pokemon: p }) => (
        <Link
          key={`${p.id}-${hidden ? "h" : "n"}`}
          href={`/pokedex/${p.id}`}
          className="group flex items-center gap-2 rounded-md border bg-card p-2 transition-colors hover:bg-accent/40"
        >
          <div className="size-10 shrink-0">
            <PokemonSprite pokemon={p} />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{p.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              #{p.dexNumber.toString().padStart(4, "0")}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function humanize(slug: string): string {
  return slug
    .split("_")
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join(" ");
}
