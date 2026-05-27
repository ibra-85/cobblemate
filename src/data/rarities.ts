import type { Rarity } from "@/types";

export interface RarityMeta {
  id: Rarity;
  label: string;
  /** Dot color for the popover row / badge dot. Tailwind-safe hex. */
  color: string;
  /** 0 = common, 4 = legendary. Used for sorting / tier display. */
  tier: number;
}

export const RARITY_META: Record<Rarity, RarityMeta> = {
  common:       { id: "common",       label: "Commun",       color: "#9ca3af", tier: 0 },
  uncommon:     { id: "uncommon",     label: "Peu commun",   color: "#22c55e", tier: 1 },
  rare:         { id: "rare",         label: "Rare",         color: "#3b82f6", tier: 2 },
  "ultra-rare": { id: "ultra-rare",   label: "Ultra-rare",   color: "#a855f7", tier: 3 },
  legendary:    { id: "legendary",    label: "Légendaire",   color: "#f59e0b", tier: 4 },
};

export const ALL_RARITIES = (Object.keys(RARITY_META) as Rarity[])
  .slice()
  .sort((a, b) => RARITY_META[a].tier - RARITY_META[b].tier);
