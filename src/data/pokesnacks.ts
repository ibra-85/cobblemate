import type { Pokesnack } from "@/types";

/**
 * Sample PokéSnacks. In Cobblemon 1.7 the registry is in
 * `cobblemon/data/cobblemon/pokesnacks/*.json` — same idea: extend this
 * list once the JSON is dumped.
 */
export const POKESNACKS: Pokesnack[] = [
  {
    id: "berry-mash",
    name: "Pâte de Baies",
    description: "Mélange sucré qui attire les Pokémon Plante, Insecte et Fée.",
    attractsTypes: ["grass", "bug", "fairy"],
    attractsPokemonIds: ["bulbasaur", "scizor", "togekiss"],
    preferredBiomes: ["forest", "meadow"],
    rarity: "common",
  },
  {
    id: "spicy-ember-cake",
    name: "Gâteau Braise",
    description: "Pâtisserie épicée prisée par les Pokémon Feu.",
    attractsTypes: ["fire", "dragon"],
    attractsPokemonIds: ["charizard"],
    preferredBiomes: ["badlands", "savanna"],
    rarity: "uncommon",
  },
  {
    id: "ocean-jelly",
    name: "Gelée d'Océan",
    description: "Gelée salée, parfaite pour appâter les Pokémon Eau.",
    attractsTypes: ["water", "ice"],
    attractsPokemonIds: ["blastoise", "rotom_wash"],
    preferredBiomes: ["ocean", "river"],
    rarity: "common",
  },
  {
    id: "shock-cracker",
    name: "Cracker Électrik",
    description: "Cracker pétillant qui attire les types Électrik.",
    attractsTypes: ["electric"],
    attractsPokemonIds: ["pikachu", "rotom_wash"],
    rarity: "uncommon",
  },
  {
    id: "shadow-truffle",
    name: "Truffe d'Ombre",
    description: "Champignon nocturne qui attire les Spectre et Ténèbres.",
    attractsTypes: ["ghost", "dark"],
    attractsPokemonIds: ["gengar", "tyranitar"],
    preferredBiomes: ["dark_forest", "swamp"],
    rarity: "rare",
  },
  {
    id: "iron-biscuit",
    name: "Biscuit de Fer",
    description: "Croquant minéral qui attire les types Acier et Roche.",
    attractsTypes: ["steel", "rock"],
    attractsPokemonIds: ["lucario", "scizor", "tyranitar"],
    rarity: "uncommon",
  },
  {
    id: "dragon-mochi",
    name: "Mochi du Dragon",
    description: "Mets rare et sucré, irrésistible pour les Dragons.",
    attractsTypes: ["dragon"],
    attractsPokemonIds: ["garchomp", "charizard"],
    rarity: "rare",
  },
];
