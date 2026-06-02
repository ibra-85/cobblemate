import { calculateTypeEffectiveness, ALL_TYPES } from "@/lib/type-chart";
import { TYPES_META } from "@/data/types";
import type { Pokemon, PokemonTypeId } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  pokemon: Pokemon;
}

const MULT_LABEL: Record<number, string> = {
  4: "×4", 2: "×2", 1: "×1", 0.5: "×½", 0.25: "×¼", 0: "×0",
};

const BUCKETS: { multipliers: number[]; title: string; tone: string; emoji: string }[] = [
  { multipliers: [4],         title: "Très dangereux", emoji: "💀",
    tone: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300" },
  { multipliers: [2],         title: "Faiblesses",     emoji: "⚠️",
    tone: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  { multipliers: [0.5, 0.25], title: "Résistances",    emoji: "🛡️",
    tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { multipliers: [0],         title: "Immunités",      emoji: "🚫",
    tone: "border-muted bg-muted text-muted-foreground" },
];

/**
 * Beginner-friendly weakness/resistance breakdown. Replaces the old
 * "Matchup détaillé" 18-cell grid: the multipliers are now baked into
 * each type badge ("Feu ×2"), and types are grouped by how dangerous
 * they are rather than alphabetically — much easier to scan when you
 * just want to know "what kills me?".
 */
export function WeaknessGrid({ pokemon }: Props) {
  const byMult = new Map<number, PokemonTypeId[]>();
  for (const t of ALL_TYPES) {
    const m = calculateTypeEffectiveness(t, pokemon.types);
    if (!byMult.has(m)) byMult.set(m, []);
    byMult.get(m)!.push(t);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {BUCKETS.map((b) => {
        const types: { type: PokemonTypeId; mult: number }[] = [];
        for (const m of b.multipliers) {
          for (const t of byMult.get(m) ?? []) types.push({ type: t, mult: m });
        }
        if (types.length === 0) return null;
        return (
          <div
            key={b.title}
            className={cn("flex flex-col gap-2 rounded-lg border p-3", b.tone)}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
              <span aria-hidden>{b.emoji}</span>
              {b.title}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {types.map(({ type, mult }) => (
                <TypeBadgeWithMultiplier key={type} type={type} mult={mult} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TypeBadgeWithMultiplier({
  type,
  mult,
}: {
  type: PokemonTypeId;
  mult: number;
}) {
  const meta = TYPES_META[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: meta.color, borderColor: meta.color }}
    >
      {meta.label}
      <span className="font-mono opacity-90">{MULT_LABEL[mult] ?? `×${mult}`}</span>
    </span>
  );
}
