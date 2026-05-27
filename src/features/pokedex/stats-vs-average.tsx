"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { POKEMON } from "@/data/pokemon";
import type { Pokemon } from "@/types";

const config = {
  pokemon: { label: "Ce Pokémon", color: "var(--chart-1)" },
  average:  { label: "Moyenne",    color: "var(--chart-2)" },
} satisfies ChartConfig;

const STAT_KEYS: { key: keyof Pokemon["baseStats"]; label: string }[] = [
  { key: "hp",      label: "HP" },
  { key: "attack",  label: "Atk" },
  { key: "defense", label: "Déf" },
  { key: "spAtk",   label: "Atk.Spé" },
  { key: "spDef",   label: "Déf.Spé" },
  { key: "speed",   label: "Vit" },
];

/**
 * Side-by-side bars: this Pokémon's stat vs the roster average. Reveals
 * at a glance whether a Pokémon is "above average" in HP, speed, etc.
 */
export function StatsVsAverage({ pokemon }: { pokemon: Pokemon }) {
  const data = STAT_KEYS.map(({ key, label }) => {
    const avg =
      POKEMON.reduce((acc, p) => acc + p.baseStats[key], 0) / POKEMON.length;
    return {
      stat: label,
      pokemon: pokemon.baseStats[key],
      average: Math.round(avg),
    };
  });

  return (
    <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ top: 10, left: -20 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="stat"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="pokemon" fill="var(--color-pokemon)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="average" fill="var(--color-average)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
