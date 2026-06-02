import { calculateTypeEffectiveness, ALL_TYPES } from "@/lib/type-chart";
import { TYPES_META } from "@/data/types";
import type { Pokemon, PokemonTypeId } from "@/types";

interface Props {
  pokemon: Pokemon;
}

const MULT_LABEL: Record<number, string> = {
  4: "×4", 2: "×2", 1: "×1", 0.5: "×½", 0.25: "×¼", 0: "×0",
};

interface Bucket {
  title: string;
  match: (m: number) => boolean;
}

const BUCKETS: Bucket[] = [
  { title: "Très dangereux (×4)", match: (m) => m === 4 },
  { title: "Faiblesses (×2)",      match: (m) => m === 2 },
  { title: "Résistances",          match: (m) => m === 0.5 || m === 0.25 },
  { title: "Immunités",            match: (m) => m === 0 },
];

/**
 * Compact weakness/resistance breakdown — labels + plain type pills,
 * no coloured background tones, no emojis. The bucket title spells
 * out the multiplier so the badges themselves stay lightweight.
 */
export function WeaknessCompact({ pokemon }: Props) {
  const rows = BUCKETS
    .map((b) => ({
      title: b.title,
      types: ALL_TYPES
        .map((t) => ({
          type: t,
          mult: calculateTypeEffectiveness(t, pokemon.types),
        }))
        .filter((x) => b.match(x.mult)),
    }))
    .filter((r) => r.types.length > 0);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ce Pokémon n&apos;a aucune faiblesse, résistance ou immunité — tout est ×1.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <div key={r.title} className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {r.title}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {r.types.map(({ type, mult }) => (
              <TypePill key={type} type={type} mult={mult} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TypePill({
  type,
  mult,
}: {
  type: PokemonTypeId;
  mult: number;
}) {
  const meta = TYPES_META[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs"
      style={{ borderColor: meta.color + "55" }}
    >
      <span className="font-medium" style={{ color: meta.color }}>
        {meta.label}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {MULT_LABEL[mult] ?? `×${mult}`}
      </span>
    </span>
  );
}
