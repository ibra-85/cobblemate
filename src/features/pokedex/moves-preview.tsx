import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/site/type-badge";
import { lookupMove } from "@/data/moves";
import { getSpeciesExtras } from "@/data/species-extras";

interface Props {
  pokemonId: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  physical: "Phys", special: "Spé", status: "Stat",
};

/**
 * Quick teaser of the move pool — just the 5 first level-up moves and
 * counters for the other learn sources. Players who want the full
 * table follow the link to `/pokedex/<id>/attaques`.
 *
 * Keeping the preview tight on purpose: the detail page already pushes
 * a lot of content above this section, and the dedicated page handles
 * search/filter much better than a cramped inline tabset.
 */
export function MovesPreview({ pokemonId }: Props) {
  const moves = getSpeciesExtras(pokemonId)?.movesByMethod;
  if (!moves) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune liste d&apos;attaques disponible.
      </p>
    );
  }

  const previewLevel = moves.level.slice(0, 5);
  const counters = [
    { label: "Niveau", count: moves.level.length },
    { label: "CT/CS", count: moves.tm.length },
    { label: "Œuf",   count: moves.egg.length },
    { label: "Tuteur",count: moves.tutor.length },
    { label: "Évent", count: moves.special.length },
  ].filter((c) => c.count > 0);

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap gap-1.5">
        {counters.map((c) => (
          <Badge key={c.label} variant="secondary" className="gap-1.5">
            {c.label}
            <span className="font-mono opacity-70">{c.count}</span>
          </Badge>
        ))}
      </div>

      {previewLevel.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Premières attaques apprises
          </p>
          <div className="grid gap-1.5 md:grid-cols-2">
            {previewLevel.map(({ level, move }) => {
              const m = lookupMove(move);
              const body = (
                <>
                  <span className="font-mono text-xs text-muted-foreground">
                    Lv.{level}
                  </span>
                  {m ? (
                    <>
                      <TypeBadge type={m.type} size="sm" />
                      <span className="font-medium">{m.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                        {CATEGORY_LABEL[m.category]}
                      </span>
                    </>
                  ) : (
                    <span className="font-mono text-xs">{move}</span>
                  )}
                </>
              );
              return m ? (
                <Link
                  key={`${level}-${move}`}
                  href={`/moves/${m.id}`}
                  className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors hover:bg-accent/30"
                >
                  {body}
                </Link>
              ) : (
                <div
                  key={`${level}-${move}`}
                  className="flex items-center gap-2 rounded-md border px-2.5 py-1.5"
                >
                  {body}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button
        nativeButton={false}
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        render={
          <Link href={`/pokedex/${pokemonId}/attaques`}>
            Voir toutes les attaques
            <ArrowRight className="size-3.5" />
          </Link>
        }
      />
    </div>
  );
}
