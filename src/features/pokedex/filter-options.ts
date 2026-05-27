import {
  Tag,
  Layers,
  Swords,
  MapPin,
  Sparkles,
  Gauge,
  type LucideIcon,
} from "lucide-react";
import { ALL_BIOMES, biomeLabel } from "@/data/spawns";
import { TYPES_META } from "@/data/types";
import { ROLE_META, ALL_ROLES } from "@/data/roles";
import { RARITY_META, ALL_RARITIES } from "@/data/rarities";
import type { PokemonTypeId } from "@/types";
import type { CategoricalKind, FilterContext, FilterKind } from "./filter-types";

export interface FilterKindMeta {
  kind: FilterKind;
  label: string;
  icon: LucideIcon;
}

export const FILTER_KIND_META: Record<FilterKind, FilterKindMeta> = {
  type:       { kind: "type",       label: "Type",        icon: Tag },
  generation: { kind: "generation", label: "Génération",  icon: Layers },
  role:       { kind: "role",       label: "Rôle",        icon: Swords },
  biome:      { kind: "biome",      label: "Biome",       icon: MapPin },
  rarity:     { kind: "rarity",     label: "Rareté",      icon: Sparkles },
  power:      { kind: "power",      label: "Puissance",   icon: Gauge },
};

export const CATEGORICAL_KINDS: CategoricalKind[] = [
  "type",
  "generation",
  "role",
  "biome",
  "rarity",
];

export interface FilterOption {
  value: string;
  label: string;
  /** Optional accent color (used for type/rarity dots). */
  color?: string;
}

const ALL_TYPES = Object.keys(TYPES_META) as PokemonTypeId[];

export function getOptions(kind: CategoricalKind, ctx: FilterContext): FilterOption[] {
  switch (kind) {
    case "type":
      return ALL_TYPES.map((t) => ({
        value: t,
        label: TYPES_META[t].label,
        color: TYPES_META[t].color,
      }));
    case "generation":
      return ctx.generations.map((g) => ({
        value: String(g),
        label: `Génération ${g}`,
      }));
    case "role":
      return ALL_ROLES.map((r) => ({
        value: r,
        label: ROLE_META[r].label,
      }));
    case "biome":
      return ALL_BIOMES.map((b) => ({
        value: b,
        label: biomeLabel(b),
      }));
    case "rarity":
      return ALL_RARITIES.map((r) => ({
        value: r,
        label: RARITY_META[r].label,
        color: RARITY_META[r].color,
      }));
  }
}

/** Human-readable label for a single raw value of a given kind. */
export function formatValue(kind: CategoricalKind, value: string): string {
  switch (kind) {
    case "type":
      return TYPES_META[value as PokemonTypeId]?.label ?? value;
    case "generation":
      return `Gén ${value}`;
    case "role":
      return ROLE_META[value as keyof typeof ROLE_META]?.label ?? value;
    case "biome":
      return biomeLabel(value);
    case "rarity":
      return RARITY_META[value as keyof typeof RARITY_META]?.label ?? value;
  }
}

/** Optional accent color for a value (type/rarity have dot colors). */
export function valueColor(kind: CategoricalKind, value: string): string | undefined {
  if (kind === "type") return TYPES_META[value as PokemonTypeId]?.color;
  if (kind === "rarity")
    return RARITY_META[value as keyof typeof RARITY_META]?.color;
  return undefined;
}
