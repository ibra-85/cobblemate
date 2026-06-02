import type { Move, MoveCategory, PokemonTypeId } from "@/types";
import movesGenerated from "./moves-generated.json";

/**
 * Two-layer moves database:
 *
 *   1. {@link MOVES} — hand-curated subset (~40 moves) with French
 *      effect text and priority. Drives the damage calculator's
 *      default catalogue and overrides automatic translations when
 *      a hand-tuned French name reads better.
 *   2. `moves-generated.json` — the full PokeAPI dump (937 moves)
 *      with French names, type, category, power, accuracy, PP. Built
 *      by `scripts/build-moves-data.mjs`.
 *
 * Always use {@link lookupMove} when resolving a move id — it walks
 * both layers and returns a `Move`-shaped object. Direct access to
 * {@link MOVE_BY_ID} is reserved for the curated array itself (e.g.
 * iterating the featured subset).
 */
export const MOVES: Move[] = [
  // Apricorn Balls? No — these are real moves; keeping the original
  // hand-curated set so the rest of the curated metadata (effect text,
  // priority) survives the migration to the generated DB.
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

  // Status / setup
  { id: "swords-dance", name: "Danse-Lames",     type: "normal",   category: "status",   power: null, accuracy: null, pp: 20, effect: "Augmente fortement l'Attaque (+2)." },
  { id: "sleep-powder", name: "Poudre Dodo",     type: "grass",    category: "status",   power: null, accuracy: 75,   pp: 15, effect: "Endort la cible." },
  { id: "rest",         name: "Repos",           type: "psychic",  category: "status",   power: null, accuracy: null, pp: 5,  effect: "Restaure tous les PV mais endort le lanceur 2 tours." },
  { id: "toxic",        name: "Toxik",           type: "poison",   category: "status",   power: null, accuracy: 90,   pp: 10, effect: "Empoisonne gravement la cible." },
  { id: "roar",         name: "Hurlement",       type: "normal",   category: "status",   power: null, accuracy: null, pp: 20, priority: -6, effect: "Force la cible à switch." },

  // Physical
  { id: "iron-tail",     name: "Queue de Fer",   type: "steel",    category: "physical", power: 100, accuracy: 75,  pp: 15, effect: "30% chance de baisser la Défense." },
  { id: "volt-tackle",   name: "Électacle",      type: "electric", category: "physical", power: 120, accuracy: 100, pp: 15, effect: "Recul important pour le lanceur." },
  { id: "body-slam",     name: "Plaquage",       type: "normal",   category: "physical", power: 85,  accuracy: 100, pp: 15, effect: "30% chance de paralyser." },
  { id: "bullet-punch",  name: "Pisto-Poing",    type: "steel",    category: "physical", power: 40,  accuracy: 100, pp: 30, priority: 1 },
  { id: "stone-edge",    name: "Lame de Roc",    type: "rock",     category: "physical", power: 100, accuracy: 80,  pp: 5,  effect: "Taux de critique élevé." },
  { id: "crunch",        name: "Mâchouille",     type: "dark",     category: "physical", power: 80,  accuracy: 100, pp: 15, effect: "20% chance de baisser la Défense." },
  { id: "outrage",       name: "Colère",         type: "dragon",   category: "physical", power: 120, accuracy: 100, pp: 10, effect: "Attaque 2-3 tours puis confusion." },
  { id: "meteor-mash",   name: "Poing Météore",  type: "steel",    category: "physical", power: 90,  accuracy: 90,  pp: 10, effect: "20% chance de +1 Atk." },

  // Special
  { id: "sludge-bomb",   name: "Bomb-Beurk",     type: "poison",   category: "special",  power: 90,  accuracy: 100, pp: 10, effect: "30% chance d'empoisonner." },
  { id: "air-slash",     name: "Lame d'Air",     type: "flying",   category: "special",  power: 75,  accuracy: 95,  pp: 15, effect: "30% chance d'apeurer." },
  { id: "dazzling-gleam", name: "Éclat Magique", type: "fairy",    category: "special",  power: 80,  accuracy: 100, pp: 10 },
  { id: "fire-blast",    name: "Déflagration",   type: "fire",     category: "special",  power: 110, accuracy: 85,  pp: 5,  effect: "10% chance de brûlure." },
  { id: "sleep-talk",    name: "Blabla Dodo",    type: "normal",   category: "status",   power: null, accuracy: null, pp: 10, effect: "Utilise une attaque au hasard pendant le sommeil." },
  { id: "pursuit",       name: "Poursuite",      type: "dark",     category: "physical", power: 40,  accuracy: 100, pp: 20, effect: "Dégâts doublés si la cible switch." },
];

/** Curated `id → Move` lookup. Only ~40 entries. Use {@link lookupMove} instead. */
export const MOVE_BY_ID: Record<string, Move> = Object.fromEntries(
  MOVES.map((m) => [m.id, m]),
);

// ─── Generated layer ────────────────────────────────────────────────

interface GeneratedMove {
  id: string;
  nameFr: string;
  nameEn: string;
  type: string;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  shortEffect: string | null;
  description: string | null;
}

const MOVES_DB = movesGenerated as Record<string, GeneratedMove>;

/**
 * Every move id present in the generated PokeAPI dump — the broader
 * universe the strategic curated registry is a subset of. Exposed so
 * other modules (the move picker, learnset filters) can iterate the
 * full set without coupling to `movesGenerated`'s import path.
 */
export const ALL_MOVE_IDS: string[] = Object.keys(MOVES_DB);

/** Normalise a Smogon/Cobblemon move name or id to the generated DB key. */
function toMoveKey(nameOrId: string): string {
  return nameOrId.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve a move from either layer. Accepts:
 *   - Cobblemon-style ids: "thunderbolt", "u-turn", "fireblast"
 *   - Smogon display names: "Thunderbolt", "U-turn", "Fire Blast"
 *   - PokeAPI ids: "thunder-shock"
 *
 * Always returns a `Move`. When both layers describe the same move,
 * the curated `effect` and `priority` are layered onto the generated
 * type/power/accuracy data — and the curated French name wins, since
 * a few hand-tuned ones read better than the auto translation.
 */
export function lookupMove(nameOrId: string): Move | null {
  const stripped = toMoveKey(nameOrId);
  const gen = MOVES_DB[nameOrId] ?? MOVES_DB[stripped] ?? null;
  // Curated keys may use hyphens ("u-turn"); the stripped form
  // matches the generated layer ("uturn"). Try both shapes.
  const curated =
    MOVE_BY_ID[nameOrId] ??
    MOVE_BY_ID[stripped] ??
    // "thunderbolt" curated → look up by id directly (no hyphen)
    null;

  if (!gen && !curated) return null;

  if (!gen) return curated;

  return {
    id: gen.id,
    name: curated?.name ?? gen.nameFr,
    nameEn: gen.nameEn,
    type: gen.type as PokemonTypeId,
    category: gen.category,
    power: gen.power,
    accuracy: gen.accuracy,
    pp: gen.pp ?? curated?.pp ?? 0,
    effect: curated?.effect,
    shortEffect: gen.shortEffect ?? undefined,
    description: gen.description ?? undefined,
    priority: curated?.priority,
  };
}
