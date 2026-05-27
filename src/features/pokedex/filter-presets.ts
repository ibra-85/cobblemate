import {
  Crown,
  Sword,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type {
  ActiveFilter,
  CategoricalKind,
  FilterContext,
} from "./filter-types";
import { makeFilterId } from "./filter-types";

export interface FilterPreset {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Builds the filter list. Receives `ctx` so power-range presets can
   *  anchor against the actual BST bounds of the roster. */
  build: (ctx: FilterContext) => ActiveFilter[];
}

function cat(kind: CategoricalKind, values: string[]): ActiveFilter {
  return { id: makeFilterId(kind), kind, mode: "include", values };
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "legendaries",
    label: "Légendaires & mythiques",
    description: "Espèces étiquetées 'legendary' ou 'mythical' par Cobblemon.",
    icon: Crown,
    build: () => [cat("category", ["legendary", "mythical"])],
  },
  {
    id: "ultra-rare-roster",
    label: "Top-tier (BST 500+)",
    description: "Les rouleaux compresseurs : 500 ou plus en stats totales.",
    icon: Sparkles,
    build: (ctx) => [
      {
        id: makeFilterId("power"),
        kind: "power",
        range: [Math.max(500, ctx.powerMin), ctx.powerMax],
      },
    ],
  },
  {
    id: "physical-attackers",
    label: "Attaquants physiques",
    description: "Sweepers physiques, wallbreakers et revenge killers.",
    icon: Sword,
    build: () => [
      cat("role", ["physical-sweeper", "wallbreaker", "revenge-killer"]),
    ],
  },
  {
    id: "walls",
    label: "Murs",
    description: "Encaisseurs physiques, spéciaux et mixtes.",
    icon: Shield,
    build: () => [cat("role", ["physical-wall", "special-wall", "mixed-wall"])],
  },
];
