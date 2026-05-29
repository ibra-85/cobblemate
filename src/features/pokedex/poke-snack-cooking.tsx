"use client";

import { useState } from "react";
import {
  ArrowRight,
  Zap,
  Sparkles,
  Crown,
  Coins,
  Layers,
} from "lucide-react";
import {
  MinecraftPanel,
  MinecraftSlot,
  itemMeta,
} from "@/components/site/minecraft-item";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { baitsForType } from "@/data/baits";
import { POKE_SNACK_RECIPE } from "@/data/baits";
import type { Pokemon } from "@/types";

interface Props {
  pokemon: Pokemon;
}

type Mode = "catch" | "dual" | "shiny" | "ultra" | "budget";

interface Slot {
  item: string;
  count?: number;
}

interface Recipe {
  /** 3-slot seasoning combo. */
  slots: (Slot | null)[];
  /** Plain-French summary of cumulative effects. */
  effects: string[];
}

const MODES: { id: Mode; label: string; icon: typeof Zap; help: string }[] = [
  {
    id: "catch",
    label: "Capture rapide",
    icon: Zap,
    help:
      "La recette standard — combine boost de type, palier de rareté +2 et morsure rapide.",
  },
  {
    id: "dual",
    label: "Couvre les 2 types",
    icon: Layers,
    help:
      "Pour les Pokémon bi-types : pousse les deux types en même temps. Moins de boost rareté mais 10× sur les deux types.",
  },
  {
    id: "shiny",
    label: "Shiny hunt",
    icon: Sparkles,
    help:
      "Empile Pomme d'or enchantée + Starf pour un total shiny ×50. À combiner avec un boost de type pour faire spawn le bon Pokémon.",
  },
  {
    id: "ultra",
    label: "Spawn ultra-rare",
    icon: Crown,
    help:
      "Maximise le palier de rareté (+12) — idéal pour les Ultra rares et légendaires quand le boost de type compte moins.",
  },
  {
    id: "budget",
    label: "Recette budget",
    icon: Coins,
    help:
      "Pas d'items dorés (pomme, EGA, carotte). Boost de type + morsure rapide pour la pêche.",
  },
];

/**
 * Recipe presets — derived from the Cobblemon bait-seasoning rules
 * (cf. wiki "Bait Seasoning" page).
 *
 * Key combos:
 *  - Golden Apple (GA)           = rarity +1, bite -25%, shiny ×2
 *  - Enchanted Golden Apple (EGA)= rarity +10, bite -10%, shiny ×10
 *  - Golden Carrot               = rarity +1
 *  - Glistering Melon Slice      = rarity +1
 *  - Starf Berry                 = shiny ×5
 *  - <Type> Berry                = ×10 spawn rate for that type
 *
 * Default catch combo mirrors the community pattern (always include
 * a Golden Apple + Golden Carrot, top up with a type berry) — confirmed
 * to be the most efficient practical setup against Ultra-rare mons.
 */
function recipeFor(mode: Mode, pokemon: Pokemon): Recipe {
  const typeBerries: string[] = [];
  for (const t of pokemon.types) {
    const best = baitsForType(t)[0];
    if (best) typeBerries.push(best.id);
  }
  const t1 = typeBerries[0] ? { item: typeBerries[0] } : null;
  const t2 = typeBerries[1] ? { item: typeBerries[1] } : null;
  const typeName1 = pokemon.types[0];
  const typeName2 = pokemon.types[1];

  switch (mode) {
    case "catch":
      return {
        slots: [
          { item: "minecraft:golden_apple" },
          { item: "minecraft:golden_carrot" },
          t1,
        ],
        effects: [
          typeName1 ? `10× spawn ${typeName1}` : "Type non boosté",
          "Rareté +2 paliers",
          "Morsure -25 % (pêche plus rapide)",
          "Shiny ×2",
        ],
      };
    case "dual":
      return {
        slots: [
          t1,
          t2 ?? { item: "minecraft:golden_carrot" },
          { item: "minecraft:golden_apple" },
        ],
        effects: [
          typeName1 ? `10× spawn ${typeName1}` : "Type 1 non boosté",
          typeName2
            ? `10× spawn ${typeName2}`
            : "Type 2 inexistant → +1 rareté en bonus",
          "Rareté +1 palier",
          "Morsure -25 %",
          "Shiny ×2",
        ],
      };
    case "shiny":
      return {
        slots: [
          { item: "minecraft:enchanted_golden_apple" },
          { item: "cobblemon:starf_berry" },
          t1,
        ],
        effects: [
          "Shiny ×50 cumulés (×10 EGA × ×5 Starf)",
          "Rareté +10 paliers",
          typeName1 ? `10× spawn ${typeName1}` : "Type non boosté",
          "Morsure -10 %",
        ],
      };
    case "ultra":
      return {
        slots: [
          { item: "minecraft:enchanted_golden_apple" },
          { item: "minecraft:golden_apple" },
          { item: "minecraft:glistering_melon_slice" },
        ],
        effects: [
          "Rareté +12 paliers (proche du max)",
          "Morsure -35 %",
          "Shiny ×20",
          "⚠ Aucun boost de type — choisis 'Couvre les 2 types' si tu veux cibler",
        ],
      };
    case "budget":
      return {
        slots: [
          { item: "minecraft:apple" },
          { item: "minecraft:sweet_berries" },
          t1,
        ],
        effects: [
          typeName1 ? `10× spawn ${typeName1}` : "Type non boosté",
          "Morsure -62.5 % (très rapide, idéal pêche)",
          "Aucun boost de rareté ni shiny",
        ],
      };
  }
}

/** Filter out modes that aren't useful for the current Pokémon. */
function modesFor(pokemon: Pokemon) {
  return MODES.filter((m) => {
    // "Couvre les 2 types" requires the mon to actually have 2 types.
    if (m.id === "dual" && pokemon.types.length < 2) return false;
    return true;
  });
}

/**
 * Read the cooking-pot recipe pattern from the generated data and
 * return the 9-slot ingredient grid in row order. Empty slots = null.
 */
function recipeGrid(): (string | null)[] {
  const pattern = POKE_SNACK_RECIPE.pattern as string[];
  const key = POKE_SNACK_RECIPE.key as Record<
    string,
    { item?: string; tag?: string }
  >;
  const cells: (string | null)[] = [];
  for (const row of pattern) {
    for (const ch of row.padEnd(3, " ")) {
      if (ch === " ") cells.push(null);
      else {
        const spec = key[ch];
        cells.push(spec?.item ?? spec?.tag ?? null);
      }
    }
  }
  return cells;
}

export function PokeSnackCooking({ pokemon }: Props) {
  const availableModes = modesFor(pokemon);
  const [mode, setMode] = useState<Mode>("catch");
  const baseRecipe = recipeGrid();
  const recipe = recipeFor(mode, pokemon);
  const activeMode = availableModes.find((m) => m.id === mode) ?? availableModes[0];

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Mode tabs ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {availableModes.map((m) => {
          const Icon = m.icon;
          const active = m.id === mode;
          return (
            <Button
              key={m.id}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setMode(m.id)}
              className="gap-1.5"
            >
              <Icon className="size-3.5" />
              {m.label}
            </Button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {activeMode.help}
      </p>

      {/* ─── Cooking interface ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        <MinecraftPanel className="rounded-sm">
          <div className="grid grid-cols-3 gap-1">
            {baseRecipe.map((id, i) => (
              <MinecraftSlot key={i} item={id ?? undefined} empty={!id} />
            ))}
          </div>
        </MinecraftPanel>

        <ArrowRight className="size-6 text-muted-foreground" />

        <div className="flex flex-col gap-2">
          <MinecraftPanel className="rounded-sm">
            <div className="flex gap-1">
              {recipe.slots.map((s, i) => (
                <MinecraftSlot
                  key={i}
                  item={s?.item}
                  count={s?.count}
                  empty={!s}
                  title={s ? itemMeta(s.item).label : "Slot libre"}
                />
              ))}
            </div>
          </MinecraftPanel>

          <MinecraftPanel className="rounded-sm self-center">
            <MinecraftSlot
              item="cobblemon:poke_snack"
              size="size-12"
              title="Poké Snack"
            />
          </MinecraftPanel>
        </div>
      </div>

      {/* ─── Effects summary ─────────────────────────────────────────
          Spell out exactly what the chosen combo gives the player. */}
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Effets cumulés
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          {recipe.effects.map((e, i) => (
            <li key={i} className="flex items-start gap-2">
              <Badge
                variant="secondary"
                className="mt-0.5 size-4 shrink-0 justify-center rounded-full p-0 font-mono text-[10px]"
              >
                {i + 1}
              </Badge>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
