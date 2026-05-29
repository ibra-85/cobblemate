"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Pokemon } from "@/types";

interface Props {
  pokemon: Pokemon;
  compareWith?: Pokemon;
  /** Override the radar's default colour for the primary mon. Used by
   *  the compare dialog so the radar matches the A/B tone scheme. */
  colorA?: string;
  /** Override the comparison mon's colour. */
  colorB?: string;
}

const STAT_KEYS: { key: keyof Pokemon["baseStats"]; label: string }[] = [
  { key: "hp",      label: "HP" },
  { key: "attack",  label: "Atk" },
  { key: "defense", label: "Déf" },
  { key: "spAtk",   label: "Atk.Spé" },
  { key: "spDef",   label: "Déf.Spé" },
  { key: "speed",   label: "Vit" },
];

/**
 * Radar chart of the 6 base stats, normalized to a 0–180 scale (matches
 * the typical max for non-legendary base stats so 180 = max). An optional
 * `compareWith` overlays a second polygon for side-by-side comparison.
 */
export function StatsRadar({ pokemon, compareWith, colorA, colorB }: Props) {
  const data = STAT_KEYS.map(({ key, label }) => ({
    stat: label,
    base: pokemon.baseStats[key],
    compare: compareWith?.baseStats[key],
  }));

  const fillA = colorA ?? "var(--color-base)";
  const fillB = colorB ?? "var(--color-compare)";

  // Per-mon labels so the legend at the bottom uses the actual mon
  // names rather than the generic "Stats / Comparaison" defaults.
  const liveConfig = {
    base: {
      label: pokemon.name,
      color: fillA,
    },
    compare: {
      label: compareWith?.name ?? "Comparaison",
      color: fillB,
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={liveConfig} className="aspect-auto h-[280px] w-full">
      {/* Extra horizontal padding on the wrapper saves the longest
          ticks ("Déf.Spé", "Atk.Spé") from being clipped at the edge
          of the polar layout. */}
      <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: 24 }}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="stat"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickSize={6}
        />
        <Radar
          dataKey="base"
          name={pokemon.name}
          fill={fillA}
          fillOpacity={0.35}
          stroke={fillA}
          strokeWidth={2}
          dot={{ r: 3, fillOpacity: 1, fill: fillA }}
        />
        {compareWith && (
          <Radar
            dataKey="compare"
            name={compareWith.name}
            fill={fillB}
            fillOpacity={0.15}
            stroke={fillB}
            strokeWidth={2}
            // Dashed outline so the comparison polygon is unmistakable
            // even when the two colours don't separate well (printing,
            // colour-blindness, overlap regions).
            strokeDasharray="5 4"
            dot={{ r: 3, fillOpacity: 1, fill: fillB }}
          />
        )}
        {compareWith && <ChartLegend content={<ChartLegendContent />} />}
      </RadarChart>
    </ChartContainer>
  );
}
