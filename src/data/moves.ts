import type { Move } from "@/types";

/**
 * Sample movepool. Extend or replace with a full dump from PokeAPI /
 * Cobblemon move registry. The schema is stable, so additions are drop-in.
 */
export const MOVES: Move[] = [
  { id: "thunderbolt",  name: "Tonnerre",        type: "electric", category: "special",  power: 90,  accuracy: 100, pp: 15, effect: "10% chance de paralysie." },
  { id: "flamethrower", name: "Lance-Flammes",   type: "fire",     category: "special",  power: 90,  accuracy: 100, pp: 15, effect: "10% chance de brûlure." },
  { id: "hydro-pump",   name: "Hydrocanon",      type: "water",    category: "special",  power: 110, accuracy: 80,  pp: 5 },
  { id: "earthquake",   name: "Séisme",          type: "ground",   category: "physical", power: 100, accuracy: 100, pp: 10, effect: "Touche les Pokémon enterrés." },
  { id: "close-combat", name: "Close Combat",    type: "fighting", category: "physical", power: 120, accuracy: 100, pp: 5,  effect: "Baisse Déf et Déf.Spé de l'attaquant." },
  { id: "ice-beam",     name: "Laser Glace",     type: "ice",      category: "special",  power: 90,  accuracy: 100, pp: 10, effect: "10% chance de gel." },
  { id: "shadow-ball",  name: "Ball'Ombre",      type: "ghost",    category: "special",  power: 80,  accuracy: 100, pp: 15, effect: "20% chance de baisser Déf.Spé." },
  { id: "leaf-blade",   name: "Lame-Feuille",    type: "grass",    category: "physical", power: 90,  accuracy: 100, pp: 15, effect: "Taux de critique élevé." },
  { id: "dragon-claw",  name: "Dracogriffe",     type: "dragon",   category: "physical", power: 80,  accuracy: 100, pp: 15 },
  { id: "play-rough",   name: "Câlinerie",       type: "fairy",    category: "physical", power: 90,  accuracy: 90,  pp: 10, effect: "10% chance de baisser Attaque." },
  { id: "iron-head",    name: "Tête de Fer",     type: "steel",    category: "physical", power: 80,  accuracy: 100, pp: 15, effect: "30% chance d'apeurer." },
  { id: "psychic",      name: "Psyko",           type: "psychic",  category: "special",  power: 90,  accuracy: 100, pp: 10, effect: "10% chance de baisser Déf.Spé." },
  { id: "sucker-punch", name: "Coup Bas",        type: "dark",     category: "physical", power: 70,  accuracy: 100, pp: 5,  priority: 1, effect: "Échoue si la cible n'attaque pas." },
  { id: "stealth-rock", name: "Piège de Roc",    type: "rock",     category: "status",   power: null,accuracy: null,pp: 20, effect: "Pose des rochers qui blessent les Pokémon qui entrent." },
  { id: "roost",        name: "Atterrissage",    type: "flying",   category: "status",   power: null,accuracy: null,pp: 5,  effect: "Restaure 50% des PV." },
  { id: "u-turn",       name: "Demi-Tour",       type: "bug",      category: "physical", power: 70,  accuracy: 100, pp: 20, effect: "Le lanceur revient au PC après l'attaque." },
];

export const MOVE_BY_ID: Record<string, Move> = Object.fromEntries(
  MOVES.map((m) => [m.id, m]),
);
