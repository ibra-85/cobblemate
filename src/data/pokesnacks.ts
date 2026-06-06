import type { Pokesnack } from "@/types";

/**
 * Sample PokéSnacks. In Cobblemon 1.7 the registry is in
 * `cobblemon/data/cobblemon/pokesnacks/*.json` — same idea: extend
 * this list once the JSON is dumped.
 *
 * The Campfire Pot recipe is split in two:
 *  - `grid` (3×3) is the standard base every Poké Snack shares:
 *    milk top row, honey + Vivichoke + honey middle, Hearty Grains
 *    bottom. Verified against `wiki.cobblemon.com/index.php/Poké_Snack`.
 *  - `seasonings` (up to 3) is what makes each snack unique — the
 *    bait items the Pot processes on top of the base.
 *
 * NOTE: The 5 base ingredients (#c:drinks/milk, honey_bottle,
 * vivichoke, hearty_grains, poke_snack) are kept on every entry so
 * the Campfire Pot widget renders the same chrome for every snack.
 */

const BASE: (string | null)[] = [
  "#c:drinks/milk",         "#c:drinks/milk",         "#c:drinks/milk",
  "minecraft:honey_bottle", "cobblemon:vivichoke",    "minecraft:honey_bottle",
  "cobblemon:hearty_grains","cobblemon:hearty_grains","cobblemon:hearty_grains",
];

export const POKESNACKS: Pokesnack[] = [
  {
    id: "berry-mash",
    name: "Pâte de Baies",
    description: "Mélange sucré qui attire les Pokémon Plante, Insecte et Fée.",
    attractsTypes: ["grass", "bug", "fairy"],
    attractsPokemonIds: ["bulbasaur", "scizor", "togekiss"],
    preferredBiomes: ["forest", "meadow"],
    rarity: "common",
    recipe: {
      grid: BASE,
      seasonings: ["cobblemon:rindo_berry", "cobblemon:tanga_berry", "cobblemon:roseli_berry"],
      note: "Recette de base (Campfire Pot) + 3 baies de type Plante / Insecte / Fée.",
    },
  },
  {
    id: "spicy-ember-cake",
    name: "Gâteau Braise",
    description: "Pâtisserie épicée prisée par les Pokémon Feu.",
    attractsTypes: ["fire", "dragon"],
    attractsPokemonIds: ["charizard"],
    preferredBiomes: ["badlands", "savanna"],
    rarity: "uncommon",
    recipe: {
      grid: BASE,
      seasonings: ["cobblemon:occa_berry", "minecraft:apple", "cobblemon:haban_berry"],
      note: "Baies pimentées (Occa) + pomme pour la touche dragon (Haban).",
    },
  },
  {
    id: "ocean-jelly",
    name: "Gelée d'Océan",
    description: "Gelée salée, parfaite pour appâter les Pokémon Eau.",
    attractsTypes: ["water", "ice"],
    attractsPokemonIds: ["blastoise", "rotom_wash"],
    preferredBiomes: ["ocean", "river"],
    rarity: "common",
    recipe: {
      grid: BASE,
      seasonings: ["cobblemon:passho_berry", "cobblemon:yache_berry", null],
      note: "Baie Passho (Eau) + Baie Yache (Glace). 1 slot libre.",
    },
  },
  {
    id: "shock-cracker",
    name: "Cracker Électrik",
    description: "Cracker pétillant qui attire les types Électrik.",
    attractsTypes: ["electric"],
    attractsPokemonIds: ["pikachu", "rotom_wash"],
    rarity: "uncommon",
    recipe: {
      grid: BASE,
      seasonings: ["cobblemon:wacan_berry", "minecraft:glow_berries", "cobblemon:wacan_berry"],
      note: "Double Baie Wacan boostée par les Lumibaies.",
    },
  },
  {
    id: "shadow-truffle",
    name: "Truffe d'Ombre",
    description: "Champignon nocturne qui attire les Spectre et Ténèbres.",
    attractsTypes: ["ghost", "dark"],
    attractsPokemonIds: ["gengar", "tyranitar"],
    preferredBiomes: ["dark_forest", "swamp"],
    rarity: "rare",
    // No recipe — found in dark-forest chests.
  },
  {
    id: "iron-biscuit",
    name: "Biscuit de Fer",
    description: "Croquant minéral qui attire les types Acier et Roche.",
    attractsTypes: ["steel", "rock"],
    attractsPokemonIds: ["lucario", "scizor", "tyranitar"],
    rarity: "uncommon",
    recipe: {
      grid: BASE,
      seasonings: ["cobblemon:babiri_berry", "cobblemon:charti_berry", null],
      note: "Baie Babiri (Acier) + Baie Charti (Roche).",
    },
  },
  {
    id: "dragon-mochi",
    name: "Mochi du Dragon",
    description: "Mets rare et sucré, irrésistible pour les Dragons.",
    attractsTypes: ["dragon"],
    attractsPokemonIds: ["garchomp", "charizard"],
    rarity: "rare",
    // No recipe — special trade reward.
  },
];
