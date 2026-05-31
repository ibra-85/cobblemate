import type { PokemonTypeId } from "@/types";

/**
 * Curated registry of competitive moves — the *strategic* ones that
 * change a Pokémon's role (setup, priority, pivot, hazard, removal,
 * recovery, status, screens, signature offensive STABs).
 *
 * Not exhaustive — the full Cobblemon move list (~900 entries) lives
 * in `moves-generated.json` and is what the damage calculator reads.
 * Here we only need the moves the scoring engine cares about, plus a
 * solid French/English search index.
 *
 * Each entry carries:
 *  - `id`           Cobblemon-canonical move id (lowercase, no dashes
 *                   in the dataset: "dragondance", not "dragon-dance").
 *                   This is the form persisted in `slot.selectedMoves`.
 *  - `nameFr`       Official French translation.
 *  - `nameEn`       Showdown / Smogon English name.
 *  - `aliases`      common shortcuts ("ddance", "uturn", …) so the
 *                   move picker hits both languages and player slang.
 *  - `type`         Pokémon type — drives the type-badge tint in the
 *                   picker rows and the card.
 *  - `category`     physical / special / status.
 *  - `power`, `accuracy`, `priority` — surfaced when present.
 *  - `tags`         strategic flags consumed by the scoring engine
 *                   ("setup", "priority", "hazard-setup",
 *                   "hazard-removal", "pivot", "recovery", "screen",
 *                   "status", "boost-attack", "boost-speed", …).
 */

export type MoveCategory = "physical" | "special" | "status";

export type MoveTag =
  | "setup"
  | "boost-attack"
  | "boost-spatk"
  | "boost-speed"
  | "boost-defense"
  | "boost-spdef"
  | "priority"
  | "pivot"
  | "hazard-setup"
  | "hazard-removal"
  | "recovery"
  | "wish-recovery"
  | "status"
  | "burn"
  | "paralysis"
  | "sleep"
  | "poison"
  | "screen"
  | "trap"
  | "phaze"
  | "stab-anchor"
  | "anti-setup";

export interface CompetitiveMove {
  id: string;
  nameFr: string;
  nameEn: string;
  aliases: string[];
  type: PokemonTypeId;
  category: MoveCategory;
  power?: number;
  accuracy?: number;
  priority?: number;
  tags: MoveTag[];
}

export const COMPETITIVE_MOVES: CompetitiveMove[] = [
  // ─── Setup ────────────────────────────────────────────────────────
  {
    id: "dragondance",
    nameFr: "Danse Draco",
    nameEn: "Dragon Dance",
    aliases: ["ddance", "dragon dance", "danse draco"],
    type: "dragon",
    category: "status",
    tags: ["setup", "boost-attack", "boost-speed"],
  },
  {
    id: "swordsdance",
    nameFr: "Danse Lames",
    nameEn: "Swords Dance",
    aliases: ["sd", "swords dance", "danse lames", "danse-lames"],
    type: "normal",
    category: "status",
    tags: ["setup", "boost-attack"],
  },
  {
    id: "nastyplot",
    nameFr: "Machination",
    nameEn: "Nasty Plot",
    aliases: ["np", "nasty plot", "machination"],
    type: "dark",
    category: "status",
    tags: ["setup", "boost-spatk"],
  },
  {
    id: "calmmind",
    nameFr: "Plénitude",
    nameEn: "Calm Mind",
    aliases: ["cm", "calm mind", "plenitude", "plénitude"],
    type: "psychic",
    category: "status",
    tags: ["setup", "boost-spatk", "boost-spdef"],
  },
  {
    id: "bulkup",
    nameFr: "Gonflette",
    nameEn: "Bulk Up",
    aliases: ["bu", "bulk up", "gonflette"],
    type: "fighting",
    category: "status",
    tags: ["setup", "boost-attack", "boost-defense"],
  },
  {
    id: "quiverdance",
    nameFr: "Papillodanse",
    nameEn: "Quiver Dance",
    aliases: ["qd", "quiver dance", "papillodanse"],
    type: "bug",
    category: "status",
    tags: ["setup", "boost-spatk", "boost-spdef", "boost-speed"],
  },
  {
    id: "shellsmash",
    nameFr: "Exuviation",
    nameEn: "Shell Smash",
    aliases: ["ss", "shell smash", "exuviation"],
    type: "normal",
    category: "status",
    tags: ["setup", "boost-attack", "boost-spatk", "boost-speed"],
  },
  {
    id: "tailglow",
    nameFr: "Lumiqueue",
    nameEn: "Tail Glow",
    aliases: ["tg", "tail glow", "lumiqueue"],
    type: "bug",
    category: "status",
    tags: ["setup", "boost-spatk"],
  },
  {
    id: "howl",
    nameFr: "Grondement",
    nameEn: "Howl",
    aliases: ["howl", "grondement"],
    type: "normal",
    category: "status",
    tags: ["setup", "boost-attack"],
  },
  {
    id: "irondefense",
    nameFr: "Mur de Fer",
    nameEn: "Iron Defense",
    aliases: ["iron defense", "id", "mur de fer"],
    type: "steel",
    category: "status",
    tags: ["setup", "boost-defense"],
  },
  {
    id: "shiftgear",
    nameFr: "Chgt Vitesse",
    nameEn: "Shift Gear",
    aliases: ["shift gear", "sg", "chgt vitesse", "changement de vitesse"],
    type: "steel",
    category: "status",
    tags: ["setup", "boost-attack", "boost-speed"],
  },
  {
    id: "victorydance",
    nameFr: "Danse Victoire",
    nameEn: "Victory Dance",
    aliases: ["victory dance", "vd", "danse victoire"],
    type: "fighting",
    category: "status",
    tags: ["setup", "boost-attack", "boost-defense", "boost-speed"],
  },
  {
    id: "geomancy",
    nameFr: "Géo-Contrôle",
    nameEn: "Geomancy",
    aliases: ["geomancy", "geo controle", "géo-contrôle"],
    type: "fairy",
    category: "status",
    tags: ["setup", "boost-spatk", "boost-spdef", "boost-speed"],
  },

  // ─── Priority ─────────────────────────────────────────────────────
  {
    id: "extremespeed",
    nameFr: "Vitesse Extrême",
    nameEn: "Extreme Speed",
    aliases: ["espeed", "extreme speed", "vitesse extreme", "vitesse extrême"],
    type: "normal",
    category: "physical",
    power: 80,
    accuracy: 100,
    priority: 2,
    tags: ["priority"],
  },
  {
    id: "suckerpunch",
    nameFr: "Coup Bas",
    nameEn: "Sucker Punch",
    aliases: ["sucker", "sucker punch", "coup bas"],
    type: "dark",
    category: "physical",
    power: 70,
    accuracy: 100,
    priority: 1,
    tags: ["priority"],
  },
  {
    id: "bulletpunch",
    nameFr: "Pisto-Poing",
    nameEn: "Bullet Punch",
    aliases: ["bpunch", "bullet punch", "pisto poing", "pisto-poing"],
    type: "steel",
    category: "physical",
    power: 40,
    accuracy: 100,
    priority: 1,
    tags: ["priority"],
  },
  {
    id: "machpunch",
    nameFr: "Mach Punch",
    nameEn: "Mach Punch",
    aliases: ["mach punch", "mpunch"],
    type: "fighting",
    category: "physical",
    power: 40,
    accuracy: 100,
    priority: 1,
    tags: ["priority"],
  },
  {
    id: "aquajet",
    nameFr: "Aqua-Jet",
    nameEn: "Aqua Jet",
    aliases: ["aqua jet", "aquajet"],
    type: "water",
    category: "physical",
    power: 40,
    accuracy: 100,
    priority: 1,
    tags: ["priority"],
  },
  {
    id: "iceshard",
    nameFr: "Éclats Glace",
    nameEn: "Ice Shard",
    aliases: ["ice shard", "eclats glace", "éclats glace"],
    type: "ice",
    category: "physical",
    power: 40,
    accuracy: 100,
    priority: 1,
    tags: ["priority"],
  },
  {
    id: "quickattack",
    nameFr: "Vive-Attaque",
    nameEn: "Quick Attack",
    aliases: ["quick attack", "vive attaque", "vive-attaque"],
    type: "normal",
    category: "physical",
    power: 40,
    accuracy: 100,
    priority: 1,
    tags: ["priority"],
  },
  {
    id: "shadowsneak",
    nameFr: "Ombre Portée",
    nameEn: "Shadow Sneak",
    aliases: ["shadow sneak", "ombre portee", "ombre portée"],
    type: "ghost",
    category: "physical",
    power: 40,
    accuracy: 100,
    priority: 1,
    tags: ["priority"],
  },
  {
    id: "accelerock",
    nameFr: "Accel-Roc",
    nameEn: "Accelerock",
    aliases: ["accelerock", "accel roc", "accel-roc"],
    type: "rock",
    category: "physical",
    power: 40,
    accuracy: 100,
    priority: 1,
    tags: ["priority"],
  },
  {
    id: "firstimpression",
    nameFr: "Choc Initial",
    nameEn: "First Impression",
    aliases: ["first impression", "choc initial"],
    type: "bug",
    category: "physical",
    power: 90,
    accuracy: 100,
    priority: 2,
    tags: ["priority"],
  },
  {
    id: "vacuumwave",
    nameFr: "Onde Vide",
    nameEn: "Vacuum Wave",
    aliases: ["vacuum wave", "vwave", "onde vide"],
    type: "fighting",
    category: "special",
    power: 40,
    accuracy: 100,
    priority: 1,
    tags: ["priority"],
  },

  // ─── Pivot ────────────────────────────────────────────────────────
  {
    id: "uturn",
    nameFr: "Demi-Tour",
    nameEn: "U-turn",
    aliases: ["uturn", "u-turn", "u turn", "demi tour", "demi-tour"],
    type: "bug",
    category: "physical",
    power: 70,
    accuracy: 100,
    tags: ["pivot"],
  },
  {
    id: "voltswitch",
    nameFr: "Change Éclair",
    nameEn: "Volt Switch",
    aliases: ["volt switch", "vswitch", "change eclair", "change éclair"],
    type: "electric",
    category: "special",
    power: 70,
    accuracy: 100,
    tags: ["pivot"],
  },
  {
    id: "partingshot",
    nameFr: "Dernier Mot",
    nameEn: "Parting Shot",
    aliases: ["parting shot", "dernier mot"],
    type: "dark",
    category: "status",
    tags: ["pivot"],
  },
  {
    id: "flipturn",
    nameFr: "Sauteclair",
    nameEn: "Flip Turn",
    aliases: ["flip turn", "fturn", "sauteclair"],
    type: "water",
    category: "physical",
    power: 60,
    accuracy: 100,
    tags: ["pivot"],
  },
  {
    id: "teleport",
    nameFr: "Téléport",
    nameEn: "Teleport",
    aliases: ["teleport", "téléport"],
    type: "psychic",
    category: "status",
    priority: -6,
    tags: ["pivot"],
  },
  {
    id: "chillyreception",
    nameFr: "Bonjour Frisquet",
    nameEn: "Chilly Reception",
    aliases: ["chilly reception", "bonjour frisquet"],
    type: "ice",
    category: "status",
    tags: ["pivot"],
  },
  {
    id: "shedtail",
    nameFr: "Queue Coupée",
    nameEn: "Shed Tail",
    aliases: ["shed tail", "queue coupee", "queue coupée"],
    type: "normal",
    category: "status",
    tags: ["pivot"],
  },
  {
    id: "batonpass",
    nameFr: "Relais",
    nameEn: "Baton Pass",
    aliases: ["baton pass", "bpass", "relais"],
    type: "normal",
    category: "status",
    tags: ["pivot"],
  },

  // ─── Hazards ──────────────────────────────────────────────────────
  {
    id: "stealthrock",
    nameFr: "Piège de Roc",
    nameEn: "Stealth Rock",
    aliases: ["sr", "stealth rock", "piege de roc", "piège de roc"],
    type: "rock",
    category: "status",
    tags: ["hazard-setup"],
  },
  {
    id: "spikes",
    nameFr: "Picots",
    nameEn: "Spikes",
    aliases: ["spikes", "picots"],
    type: "ground",
    category: "status",
    tags: ["hazard-setup"],
  },
  {
    id: "toxicspikes",
    nameFr: "Pics Toxik",
    nameEn: "Toxic Spikes",
    aliases: ["tspikes", "toxic spikes", "pics toxik"],
    type: "poison",
    category: "status",
    tags: ["hazard-setup"],
  },
  {
    id: "stickyweb",
    nameFr: "Toile Gluante",
    nameEn: "Sticky Web",
    aliases: ["sticky web", "web", "toile gluante"],
    type: "bug",
    category: "status",
    tags: ["hazard-setup"],
  },

  // ─── Hazard removal ───────────────────────────────────────────────
  {
    id: "rapidspin",
    nameFr: "Tour Rapide",
    nameEn: "Rapid Spin",
    aliases: ["rapid spin", "rspin", "tour rapide"],
    type: "normal",
    category: "physical",
    power: 50,
    accuracy: 100,
    tags: ["hazard-removal", "boost-speed"],
  },
  {
    id: "defog",
    nameFr: "Anti-Brume",
    nameEn: "Defog",
    aliases: ["defog", "anti brume", "anti-brume"],
    type: "flying",
    category: "status",
    tags: ["hazard-removal"],
  },
  {
    id: "tidyup",
    nameFr: "Grand Ménage",
    nameEn: "Tidy Up",
    aliases: ["tidy up", "grand menage", "grand ménage"],
    type: "normal",
    category: "status",
    tags: ["hazard-removal", "boost-attack", "boost-speed"],
  },
  {
    id: "courtchange",
    nameFr: "Change-Court",
    nameEn: "Court Change",
    aliases: ["court change", "change court", "change-court"],
    type: "normal",
    category: "status",
    tags: ["hazard-removal"],
  },
  {
    id: "mortalspin",
    nameFr: "Toupie Fatale",
    nameEn: "Mortal Spin",
    aliases: ["mortal spin", "toupie fatale"],
    type: "poison",
    category: "physical",
    power: 30,
    accuracy: 100,
    tags: ["hazard-removal", "boost-speed", "poison"],
  },

  // ─── Recovery ─────────────────────────────────────────────────────
  {
    id: "recover",
    nameFr: "Soin",
    nameEn: "Recover",
    aliases: ["recover", "soin"],
    type: "normal",
    category: "status",
    tags: ["recovery"],
  },
  {
    id: "roost",
    nameFr: "Atterrissage",
    nameEn: "Roost",
    aliases: ["roost", "atterrissage"],
    type: "flying",
    category: "status",
    tags: ["recovery"],
  },
  {
    id: "softboiled",
    nameFr: "Tendre Câlin",
    nameEn: "Soft-Boiled",
    aliases: ["soft-boiled", "soft boiled", "softboiled", "tendre calin", "tendre câlin"],
    type: "normal",
    category: "status",
    tags: ["recovery"],
  },
  {
    id: "slackoff",
    nameFr: "Paresse",
    nameEn: "Slack Off",
    aliases: ["slack off", "paresse"],
    type: "normal",
    category: "status",
    tags: ["recovery"],
  },
  {
    id: "moonlight",
    nameFr: "Rayon Lune",
    nameEn: "Moonlight",
    aliases: ["moonlight", "rayon lune"],
    type: "fairy",
    category: "status",
    tags: ["recovery"],
  },
  {
    id: "morningsun",
    nameFr: "Aurore",
    nameEn: "Morning Sun",
    aliases: ["morning sun", "aurore"],
    type: "normal",
    category: "status",
    tags: ["recovery"],
  },
  {
    id: "synthesis",
    nameFr: "Synthèse",
    nameEn: "Synthesis",
    aliases: ["synthesis", "synthese", "synthèse"],
    type: "grass",
    category: "status",
    tags: ["recovery"],
  },
  {
    id: "wish",
    nameFr: "Vœu",
    nameEn: "Wish",
    aliases: ["wish", "voeu", "vœu"],
    type: "normal",
    category: "status",
    tags: ["recovery", "wish-recovery"],
  },
  {
    id: "shoreup",
    nameFr: "Amass'Sable",
    nameEn: "Shore Up",
    aliases: ["shore up", "amass sable", "amass'sable"],
    type: "ground",
    category: "status",
    tags: ["recovery"],
  },

  // ─── Status / utility ─────────────────────────────────────────────
  {
    id: "willowisp",
    nameFr: "Feu Follet",
    nameEn: "Will-O-Wisp",
    aliases: ["wisp", "will-o-wisp", "willowisp", "feu follet"],
    type: "fire",
    category: "status",
    accuracy: 85,
    tags: ["status", "burn"],
  },
  {
    id: "thunderwave",
    nameFr: "Cage Éclair",
    nameEn: "Thunder Wave",
    aliases: ["twave", "thunder wave", "cage eclair", "cage éclair"],
    type: "electric",
    category: "status",
    accuracy: 90,
    tags: ["status", "paralysis"],
  },
  {
    id: "toxic",
    nameFr: "Toxik",
    nameEn: "Toxic",
    aliases: ["toxic", "toxik"],
    type: "poison",
    category: "status",
    accuracy: 90,
    tags: ["status", "poison"],
  },
  {
    id: "spore",
    nameFr: "Spore",
    nameEn: "Spore",
    aliases: ["spore"],
    type: "grass",
    category: "status",
    accuracy: 100,
    tags: ["status", "sleep"],
  },
  {
    id: "sleeppowder",
    nameFr: "Poudre Dodo",
    nameEn: "Sleep Powder",
    aliases: ["sleep powder", "poudre dodo"],
    type: "grass",
    category: "status",
    accuracy: 75,
    tags: ["status", "sleep"],
  },
  {
    id: "encore",
    nameFr: "Encore",
    nameEn: "Encore",
    aliases: ["encore"],
    type: "normal",
    category: "status",
    tags: ["status", "anti-setup"],
  },
  {
    id: "taunt",
    nameFr: "Provoc",
    nameEn: "Taunt",
    aliases: ["taunt", "provoc"],
    type: "dark",
    category: "status",
    tags: ["status", "anti-setup"],
  },
  {
    id: "roar",
    nameFr: "Hurlement",
    nameEn: "Roar",
    aliases: ["roar", "hurlement"],
    type: "normal",
    category: "status",
    priority: -6,
    tags: ["phaze", "anti-setup"],
  },
  {
    id: "whirlwind",
    nameFr: "Cyclone",
    nameEn: "Whirlwind",
    aliases: ["whirlwind", "cyclone"],
    type: "normal",
    category: "status",
    priority: -6,
    tags: ["phaze", "anti-setup"],
  },
  {
    id: "knockoff",
    nameFr: "Sabotage",
    nameEn: "Knock Off",
    aliases: ["knock off", "ko", "sabotage"],
    type: "dark",
    category: "physical",
    power: 65,
    accuracy: 100,
    tags: ["status"],
  },

  // ─── Screens ──────────────────────────────────────────────────────
  {
    id: "reflect",
    nameFr: "Protection",
    nameEn: "Reflect",
    aliases: ["reflect", "protection"],
    type: "psychic",
    category: "status",
    tags: ["screen"],
  },
  {
    id: "lightscreen",
    nameFr: "Mur Lumière",
    nameEn: "Light Screen",
    aliases: ["light screen", "lscreen", "mur lumiere", "mur lumière"],
    type: "psychic",
    category: "status",
    tags: ["screen"],
  },
  {
    id: "auroraveil",
    nameFr: "Voile Aurore",
    nameEn: "Aurora Veil",
    aliases: ["aurora veil", "voile aurore"],
    type: "ice",
    category: "status",
    tags: ["screen"],
  },

  // ─── Strong / signature offensive moves ───────────────────────────
  {
    id: "earthquake",
    nameFr: "Séisme",
    nameEn: "Earthquake",
    aliases: ["eq", "earthquake", "seisme", "séisme"],
    type: "ground",
    category: "physical",
    power: 100,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "closecombat",
    nameFr: "Close Combat",
    nameEn: "Close Combat",
    aliases: ["cc", "close combat"],
    type: "fighting",
    category: "physical",
    power: 120,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "moonblast",
    nameFr: "Pouvoir Lunaire",
    nameEn: "Moonblast",
    aliases: ["moonblast", "pouvoir lunaire"],
    type: "fairy",
    category: "special",
    power: 95,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "shadowball",
    nameFr: "Ball'Ombre",
    nameEn: "Shadow Ball",
    aliases: ["shadow ball", "sball", "ball ombre", "ball'ombre"],
    type: "ghost",
    category: "special",
    power: 80,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "ironhead",
    nameFr: "Tête de Fer",
    nameEn: "Iron Head",
    aliases: ["iron head", "tete de fer", "tête de fer"],
    type: "steel",
    category: "physical",
    power: 80,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "psychic",
    nameFr: "Psyko",
    nameEn: "Psychic",
    aliases: ["psychic", "psyko"],
    type: "psychic",
    category: "special",
    power: 90,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "flareblitz",
    nameFr: "Boutefeu",
    nameEn: "Flare Blitz",
    aliases: ["flare blitz", "boutefeu"],
    type: "fire",
    category: "physical",
    power: 120,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "waterfall",
    nameFr: "Cascade",
    nameEn: "Waterfall",
    aliases: ["waterfall", "cascade"],
    type: "water",
    category: "physical",
    power: 80,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "thunderbolt",
    nameFr: "Tonnerre",
    nameEn: "Thunderbolt",
    aliases: ["thunderbolt", "tbolt", "tonnerre"],
    type: "electric",
    category: "special",
    power: 90,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "icebeam",
    nameFr: "Laser Glace",
    nameEn: "Ice Beam",
    aliases: ["ice beam", "ibeam", "laser glace"],
    type: "ice",
    category: "special",
    power: 90,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "outrage",
    nameFr: "Colère",
    nameEn: "Outrage",
    aliases: ["outrage", "colere", "colère"],
    type: "dragon",
    category: "physical",
    power: 120,
    accuracy: 100,
    tags: ["stab-anchor"],
  },
  {
    id: "leafstorm",
    nameFr: "Tempête Verte",
    nameEn: "Leaf Storm",
    aliases: ["leaf storm", "tempete verte", "tempête verte"],
    type: "grass",
    category: "special",
    power: 130,
    accuracy: 90,
    tags: ["stab-anchor"],
  },
  {
    id: "stoneedge",
    nameFr: "Lame de Roc",
    nameEn: "Stone Edge",
    aliases: ["stone edge", "lame de roc"],
    type: "rock",
    category: "physical",
    power: 100,
    accuracy: 80,
    tags: ["stab-anchor"],
  },
  {
    id: "ironvalley",
    nameFr: "Boomerang Métal",
    nameEn: "Meteor Mash",
    aliases: ["meteor mash", "boomerang metal", "boomerang métal"],
    type: "steel",
    category: "physical",
    power: 90,
    accuracy: 90,
    tags: ["stab-anchor", "boost-attack"],
  },
];

// ─── Indexes for O(1) lookup ──────────────────────────────────────────

const MOVE_INDEX: Map<string, CompetitiveMove> = new Map();
for (const m of COMPETITIVE_MOVES) MOVE_INDEX.set(m.id, m);

/**
 * Resolve a stored move id back to its `CompetitiveMove` entry, when
 * possible. Tolerant to snake_case / kebab-case so saved teams that
 * were written under either convention resolve to the same record.
 *
 * Returns `null` when the move isn't in the curated competitive
 * registry — strong-attacks-only moves that aren't strategic (e.g.
 * Hyper Beam) live in `moves-generated.json` and are addressed via
 * `lookupMove` elsewhere.
 */
export function findMoveById(id: string | undefined): CompetitiveMove | null {
  if (!id) return null;
  const direct = MOVE_INDEX.get(id);
  if (direct) return direct;
  const normalised = id.toLowerCase().replace(/[-\s]/g, "");
  return MOVE_INDEX.get(normalised) ?? null;
}

/**
 * French display name for a stored move id — falls back to a
 * humanised form when the move isn't in the strategic registry so
 * the slot card never reads as raw computer gibberish.
 */
export function moveDisplayName(id: string | undefined): string {
  if (!id) return "";
  const match = findMoveById(id);
  if (match) return match.nameFr;
  return humaniseMoveId(id);
}

function humaniseMoveId(id: string): string {
  return id
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Search the registry by free-text query, matching the French name,
 * the English name, the id, and any registered alias. Optionally
 * filter to a subset of move ids (the Pokémon's learnset) so the
 * picker only surfaces moves the mon can actually run.
 */
export function searchMoves(
  query: string,
  learnsetFilter?: Set<string>,
): CompetitiveMove[] {
  const q = query.trim().toLowerCase();
  const qId = q.replace(/[-\s]/g, "");
  return COMPETITIVE_MOVES.filter((m) => {
    if (learnsetFilter && !learnsetFilter.has(m.id)) return false;
    if (!q) return true;
    if (m.id.includes(qId)) return true;
    if (m.nameFr.toLowerCase().includes(q)) return true;
    if (m.nameEn.toLowerCase().includes(q)) return true;
    for (const alias of m.aliases) if (alias.includes(q)) return true;
    return false;
  });
}
