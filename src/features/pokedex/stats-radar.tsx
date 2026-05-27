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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Pokemon } from "@/types";

const config = {
  base: {
    label: "Stats",
    color: "var(--chart-1)",
  },
  compare: {
    label: "Comparaison",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

interface Props {
  pokemon: Pokemon;
  compareWith?: Pokemon;
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
export function StatsRadar({ pokemon, compareWith }: Props) {
  const data = STAT_KEYS.map(({ key, label }) => ({
    stat: label,
    base: pokemon.baseStats[key],
    compare: compareWith?.baseStats[key],
  }));

  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-[260px] w-full">
      <RadarChart data={data}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="stat"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Radar
          dataKey="base"
          name={pokemon.name}
          fill="var(--color-base)"
          fillOpacity={0.35}
          stroke="var(--color-base)"
          strokeWidth={2}
          dot={{ r: 3, fillOpacity: 1 }}
        />
        {compareWith && (
          <Radar
            dataKey="compare"
            name={compareWith.name}
            fill="var(--color-compare)"
            fillOpacity={0.2}
            stroke="var(--color-compare)"
            strokeWidth={2}
            dot={{ r: 3, fillOpacity: 1 }}
          />
        )}
      </RadarChart>
    </ChartContainer>
  );
}
