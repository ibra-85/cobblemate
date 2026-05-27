import { Badge } from "@/components/ui/badge";
import { TypeBadge } from "@/components/site/type-badge";
import { recommendBaits, type BaitItem } from "@/data/baits";
import { TYPES_META } from "@/data/types";
import type { Pokemon } from "@/types";

interface Props {
  pokemon: Pokemon;
}

/**
 * Surface Cobblemon's spawn-bait recommendations for a Pokémon:
 *
 *   - one type-boost bait per type the species has (highest value bait),
 *   - the strongest generic boosts (shiny, rarity, hidden ability, alpha).
 *
 * Data source: `src/data/bait-effects-generated.json`, built from the
 * official mod (`spawn_bait_effects/`).
 */
export function BaitRecommendations({ pokemon }: Props) {
  const rec = recommendBaits(pokemon.types);

  return (
    <div className="flex flex-col gap-4 text-sm">
      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Cible par type
        </p>
        <div className="flex flex-col gap-2">
          {rec.typing.length === 0 ? (
            <p className="text-muted-foreground">Aucun appât typé trouvé.</p>
          ) : (
            rec.typing.map(({ type, bait, value }) => (
              <BaitRow
                key={type}
                bait={bait}
                left={
                  <span className="inline-flex items-center gap-2">
                    <TypeBadge type={type} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      boost ×{value}
                    </span>
                  </span>
                }
              />
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Boosts génériques
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {rec.shiny && (
            <BaitRow bait={rec.shiny} left={<TagLabel>Shiny ×{rec.shiny.effects.find((e) => e.type === "shiny_reroll")?.value}</TagLabel>} />
          )}
          {rec.rarity && (
            <BaitRow bait={rec.rarity} left={<TagLabel>Rareté +{rec.rarity.effects.find((e) => e.type === "rarity_bucket")?.value}</TagLabel>} />
          )}
          {rec.ha && (
            <BaitRow bait={rec.ha} left={<TagLabel>Talent Caché</TagLabel>} />
          )}
          {rec.alpha && (
            <BaitRow bait={rec.alpha} left={<TagLabel>Alpha</TagLabel>} />
          )}
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        À ajouter dans un Poké Snack via la marmite. Chaque assaisonnement
        agit comme un appât pour l&apos;effet correspondant.
      </p>
    </div>
  );
}

function TagLabel({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="font-mono text-[10px]">
      {children}
    </Badge>
  );
}

function BaitRow({ bait, left }: { bait: BaitItem; left: React.ReactNode }) {
  // Type-boost baits often have a thematic colour applied to the seasoning;
  // show it as a small dot so the row is scannable.
  const dot = bait.color ? (
    <span
      className="size-2.5 rounded-full ring-1 ring-border"
      title={bait.color}
      style={{ backgroundColor: cssColor(bait.color) }}
    />
  ) : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      {left}
      <span className="ml-auto inline-flex items-center gap-2">
        {dot}
        <span className="font-medium">{bait.label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {bait.id}
        </span>
      </span>
    </div>
  );
}

// Cobblemon stores seasoning colours as Minecraft dye words. Map the most
// common ones to CSS colours so the dot is informative.
const DYE_HEX: Record<string, string> = {
  white:      "#f8fafc",
  light_gray: "#cbd5e1",
  gray:       "#475569",
  black:      "#0f172a",
  brown:      "#7c3a14",
  red:        "#ef4444",
  orange:     "#f97316",
  yellow:     "#eab308",
  lime:       "#84cc16",
  green:      "#22c55e",
  cyan:       "#06b6d4",
  light_blue: "#38bdf8",
  blue:       "#2563eb",
  purple:     "#a855f7",
  magenta:    "#d946ef",
  pink:       "#ec4899",
};

function cssColor(name: string): string {
  return DYE_HEX[name.toLowerCase()] ?? name;
}
