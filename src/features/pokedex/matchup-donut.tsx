"use client";

import { Cell, Pie, PieChart, Label } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ALL_TYPES, calculateTypeEffectiveness } from "@/lib/type-chart";
import type { Pokemon } from "@/types";

const config = {
  weakness:   { label: "Faiblesses", color: "var(--destructive)" },
  resistance: { label: "Résistances", color: "var(--chart-1)" },
  immunity:   { label: "Immunités",  color: "var(--chart-2)" },
  neutral:    { label: "Neutre",     color: "var(--muted)" },
} satisfies ChartConfig;

/**
 * Defensive matchup donut: shows the 18 type matchups grouped into
 * weakness / resistance / immunity / neutral. Center of the donut shows
 * the dominant bucket size so the player gets an immediate read.
 */
export function MatchupDonut({ pokemon }: { pokemon: Pokemon }) {
  let weakness = 0;
  let resistance = 0;
  let immunity = 0;
  let neutral = 0;

  for (const t of ALL_TYPES) {
    const m = calculateTypeEffectiveness(t, pokemon.types);
    if (m === 0) immunity++;
    else if (m >= 2) weakness++;
    else if (m < 1) resistance++;
    else neutral++;
  }

  const data = [
    { key: "weakness",   value: weakness,   label: "Faiblesses" },
    { key: "neutral",    value: neutral,    label: "Neutre" },
    { key: "resistance", value: resistance, label: "Résistances" },
    { key: "immunity",   value: immunity,   label: "Immunités" },
  ];

  // Verdict label in the donut hole — picks the most "interesting" bucket.
  const verdict =
    immunity > 0
      ? `${immunity} ×0`
      : weakness > resistance
        ? `${weakness} faibles`
        : `${resistance} résist.`;

  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-[220px]">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((d) => (
            <Cell key={d.key} fill={`var(--color-${d.key})`} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox)) return null;
              return (
                <text
                  x={viewBox.cx}
                  y={viewBox.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) - 4}
                    className="fill-foreground font-heading text-base font-bold"
                  >
                    {verdict}
                  </tspan>
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) + 14}
                    className="fill-muted-foreground text-[10px] uppercase"
                  >
                    sur 18 types
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
