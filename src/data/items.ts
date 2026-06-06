import type { Item } from "@/types";

/**
 * Cobblemon items catalog. Recipes verified against the Cobblemon
 * wiki (wiki.cobblemon.com) — quantities and slot positions match
 * the in-game crafting table.
 *
 * Slots use the Cobblemon/Minecraft namespaced id ("cobblemon:foo" or
 * "minecraft:bar"). Empty slots = `null`. `output` is the number of
 * items the recipe yields per craft (Pokémon ball recipes yield 4).
 */

const RED   = "cobblemon:red_apricorn";
const BLUE  = "cobblemon:blue_apricorn";
const GREEN = "cobblemon:green_apricorn";
const YELLOW = "cobblemon:yellow_apricorn";
const BLACK = "cobblemon:black_apricorn";
const WHITE = "cobblemon:white_apricorn";
const PINK  = "cobblemon:pink_apricorn";

const IRON  = "minecraft:iron_ingot";
const GOLD  = "minecraft:gold_ingot";
const COPPER = "minecraft:copper_ingot";
const DIAMOND = "minecraft:diamond";
const ECHO  = "minecraft:echo_shard";
const NETHERITE = "minecraft:netherite_ingot";
const NETHER_STAR = "minecraft:nether_star";
const SHULKER_SHELL = "minecraft:shulker_shell";

/**
 * All 6 "basic" balls use the same diamond pattern (apricorn in each
 * cardinal position + the ingot/centre item). Helper keeps the table
 * compact and removes the off-by-one risk of writing the grid by hand
 * for every variant.
 */
function diamondBall(apricorn: string, centre: string): NonNullable<Item["recipe"]> {
  return {
    grid: [
      null,      apricorn, null,
      apricorn,  centre,   apricorn,
      null,      apricorn, null,
    ],
    output: 4,
  };
}

export const ITEMS: Item[] = [
  // ─── Basic (tier 1) Apricorn Balls — diamond + copper ─────────────
  {
    id: "poke-ball",
    name: "Poké Ball",
    category: "ball",
    description: "Ball de base, taux de capture ×1.",
    obtain: "Crafting : 4 Apricorns rouges + 1 lingot de cuivre. Donne 4 balls.",
    rarity: "common",
    recipe: { ...diamondBall(RED, COPPER), note: "Diamant de 4 Apricorns rouges autour d'un lingot de cuivre. Rendement : 4 Poké Balls." },
  },
  {
    id: "citrine-ball",
    name: "Citrine Ball",
    category: "ball",
    description: "Variante cosmétique des balls basiques, taux ×1.",
    obtain: "Crafting : 4 Apricorns jaunes + 1 lingot de cuivre. Donne 4 balls.",
    rarity: "common",
    recipe: { ...diamondBall(YELLOW, COPPER), note: "Diamant de 4 Apricorns jaunes + cuivre." },
  },
  {
    id: "verdant-ball",
    name: "Verdant Ball",
    category: "ball",
    description: "Variante cosmétique des balls basiques, taux ×1.",
    obtain: "Crafting : 4 Apricorns verts + 1 lingot de cuivre. Donne 4 balls.",
    rarity: "common",
    recipe: { ...diamondBall(GREEN, COPPER), note: "Diamant de 4 Apricorns verts + cuivre." },
  },
  {
    id: "azure-ball",
    name: "Azure Ball",
    category: "ball",
    description: "Variante cosmétique des balls basiques, taux ×1.",
    obtain: "Crafting : 4 Apricorns bleus + 1 lingot de cuivre. Donne 4 balls.",
    rarity: "common",
    recipe: { ...diamondBall(BLUE, COPPER), note: "Diamant de 4 Apricorns bleus + cuivre." },
  },
  {
    id: "roseate-ball",
    name: "Roseate Ball",
    category: "ball",
    description: "Variante cosmétique des balls basiques, taux ×1.",
    obtain: "Crafting : 4 Apricorns roses + 1 lingot de cuivre. Donne 4 balls.",
    rarity: "common",
    recipe: { ...diamondBall(PINK, COPPER), note: "Diamant de 4 Apricorns roses + cuivre." },
  },
  {
    id: "slate-ball",
    name: "Slate Ball",
    category: "ball",
    description: "Variante cosmétique des balls basiques, taux ×1.",
    obtain: "Crafting : 4 Apricorns noirs + 1 lingot de cuivre. Donne 4 balls.",
    rarity: "common",
    recipe: { ...diamondBall(BLACK, COPPER), note: "Diamant de 4 Apricorns noirs + cuivre." },
  },
  {
    id: "premier-ball",
    name: "Honor Ball",
    category: "ball",
    description: "Variante cosmétique des balls basiques, taux ×1.",
    obtain: "Crafting : 4 Apricorns blancs + 1 lingot de cuivre. Donne 4 balls.",
    rarity: "common",
    recipe: { ...diamondBall(WHITE, COPPER), note: "Diamant de 4 Apricorns blancs + cuivre." },
  },

  // ─── Tier 2 (iron-core) ─────────────────────────────────────────
  {
    id: "great-ball",
    name: "Super Ball",
    category: "ball",
    description: "Taux de capture ×1.5.",
    obtain: "Crafting : 2 Apricorns bleus + 2 rouges + 1 lingot de fer. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null, BLUE, null,
        RED,  IRON, RED,
        null, BLUE, null,
      ],
      output: 4,
      note: "Bleus haut/bas, rouges gauche/droite, lingot de fer au centre.",
    },
  },
  {
    id: "heal-ball",
    name: "Soin Ball",
    category: "ball",
    description: "Soigne complètement le Pokémon capturé.",
    obtain: "Crafting : 2 Apricorns roses + 2 blancs + 1 lingot de cuivre. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null,  PINK,   null,
        WHITE, COPPER, WHITE,
        null,  PINK,   null,
      ],
      output: 4,
      note: "Roses haut/bas, blancs gauche/droite, cuivre au centre.",
    },
  },
  {
    id: "safari-ball",
    name: "Safari Ball",
    category: "ball",
    description: "×1.5 sur un Pokémon hors combat.",
    obtain: "Crafting : 1 Apricorn jaune + 2 verts + 1 blanc + 1 cuivre. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null,  YELLOW, null,
        GREEN, COPPER, GREEN,
        null,  WHITE,  null,
      ],
      output: 4,
    },
  },
  {
    id: "fast-ball",
    name: "Fast Ball",
    category: "ball",
    description: "×4 sur les Pokémon avec ≥100 de Vitesse de base.",
    obtain: "Crafting : 1 Apricorn rouge + 2 jaunes + 1 blanc + 1 fer. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null,   RED,    null,
        YELLOW, IRON,   YELLOW,
        null,   WHITE,  null,
      ],
      output: 4,
    },
  },
  {
    id: "level-ball",
    name: "Level Ball",
    category: "ball",
    description: "Bonus de capture quand votre Pokémon dépasse en niveau la cible (jusqu'à ×4).",
    obtain: "Crafting : 1 Apricorn noir + 2 roses + 1 rouge + 1 fer. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null, BLACK, null,
        PINK, IRON,  PINK,
        null, RED,   null,
      ],
      output: 4,
    },
  },
  {
    id: "lure-ball",
    name: "Lure Ball",
    category: "ball",
    description: "×4 sur les Pokémon attrapés à la Canne Poké.",
    obtain: "Crafting : 1 Apricorn rouge + 2 bleus + 1 vert + 1 fer. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null, RED,   null,
        BLUE, IRON,  BLUE,
        null, GREEN, null,
      ],
      output: 4,
    },
  },
  {
    id: "heavy-ball",
    name: "Heavy Ball",
    category: "ball",
    description: "Bonus de capture selon le poids du Pokémon (jusqu'à ×4 ≥ 300 kg).",
    obtain: "Crafting : 2 Apricorns noirs + 2 bleus + 1 fer. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null, BLACK, null,
        BLUE, IRON,  BLUE,
        null, BLACK, null,
      ],
      output: 4,
    },
  },
  {
    id: "friend-ball",
    name: "Friend Ball",
    category: "ball",
    description: "Le Pokémon capturé commence avec 150 de Bonheur.",
    obtain: "Crafting : 1 Apricorn jaune + 2 verts + 1 rouge + 1 fer. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null,  YELLOW, null,
        GREEN, IRON,   GREEN,
        null,  RED,    null,
      ],
      output: 4,
    },
  },
  {
    id: "moon-ball",
    name: "Moon Ball",
    category: "ball",
    description: "Bonus la nuit selon la phase de la lune (jusqu'à ×4).",
    obtain: "Crafting : 2 Apricorns jaunes + 1 bleu + 1 noir + 1 fer. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null, YELLOW, null,
        BLUE, IRON,   BLACK,
        null, YELLOW, null,
      ],
      output: 4,
    },
  },
  {
    id: "sport-ball",
    name: "Sport Ball",
    category: "ball",
    description: "Taux statique ×1.5.",
    obtain: "Crafting : 1 Apricorn blanc + 3 rouges + 1 fer. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null, WHITE, null,
        RED,  IRON,  RED,
        null, RED,   null,
      ],
      output: 4,
    },
  },
  {
    id: "park-ball",
    name: "Park Ball",
    category: "ball",
    description: "×2.5 dans une Forêt ou des Plaines.",
    obtain: "Crafting : 1 Apricorn rouge + 3 verts + 1 fer. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null,  RED,   null,
        GREEN, IRON,  GREEN,
        null,  GREEN, null,
      ],
      output: 4,
    },
  },
  {
    id: "net-ball",
    name: "Filet Ball",
    category: "ball",
    description: "×3 sur les Insectes et Eau.",
    obtain: "Loot uniquement (Mini-Donjon Shipwreck Cove). Pas de craft.",
    rarity: "rare",
    recipe: {
      grid: [
        null, BLACK, null,
        BLUE, IRON,  BLUE,
        null, WHITE, null,
      ],
      output: 4,
      note: "⚠️ Datapack/loot uniquement en 1.6+. Recette historique conservée pour référence.",
    },
  },
  {
    id: "dive-ball",
    name: "Scuba Ball",
    category: "ball",
    description: "×3.5 sur les Pokémon sous l'eau.",
    obtain: "Loot uniquement (Mini-Donjon Shipwreck Cove). Pas de craft.",
    rarity: "rare",
    recipe: {
      grid: [
        null, WHITE, null,
        BLUE, IRON,  BLUE,
        null, BLUE,  null,
      ],
      output: 4,
      note: "⚠️ Datapack/loot uniquement en 1.6+. Recette historique conservée.",
    },
  },
  {
    id: "nest-ball",
    name: "Faiblo Ball",
    category: "ball",
    description: "Bonus sur les Pokémon de bas niveau (jusqu'à ×4 sous Lv.10).",
    obtain: "Crafting : 2 Apricorns verts + 2 jaunes + 1 fer. Donne 4 balls.",
    rarity: "uncommon",
    recipe: {
      grid: [
        null,   GREEN, null,
        YELLOW, IRON,  YELLOW,
        null,   GREEN, null,
      ],
      output: 4,
    },
  },

  // ─── Tier 3 (gold-core) ─────────────────────────────────────────
  {
    id: "ultra-ball",
    name: "Hyper Ball",
    category: "ball",
    description: "Taux de capture ×2.",
    obtain: "Crafting : 2 Apricorns noirs + 2 jaunes + 1 lingot d'or. Donne 4 balls.",
    rarity: "rare",
    recipe: {
      grid: [
        null,   BLACK, null,
        YELLOW, GOLD,  YELLOW,
        null,   BLACK, null,
      ],
      output: 4,
      note: "Noirs haut/bas, jaunes gauche/droite, lingot d'or au centre.",
    },
  },
  {
    id: "love-ball",
    name: "Love Ball",
    category: "ball",
    description: "×8 si la cible est du sexe opposé du Pokémon en combat.",
    obtain: "Crafting : 1 Apricorn blanc + 3 roses + 1 lingot d'or. Donne 4 balls.",
    rarity: "rare",
    recipe: {
      grid: [
        null, WHITE, null,
        PINK, GOLD,  PINK,
        null, PINK,  null,
      ],
      output: 4,
    },
  },
  {
    id: "repeat-ball",
    name: "Bis Ball",
    category: "ball",
    description: "×3.5 si l'espèce est déjà dans votre Pokédex.",
    obtain: "Crafting : 1 Apricorn noir + 2 rouges + 1 jaune + 1 lingot d'or. Donne 4 balls.",
    rarity: "rare",
    recipe: {
      grid: [
        null, BLACK,  null,
        RED,  GOLD,   RED,
        null, YELLOW, null,
      ],
      output: 4,
    },
  },
  {
    id: "timer-ball",
    name: "Chrono Ball",
    category: "ball",
    description: "Capture plus efficace plus le combat dure (jusqu'à ×4).",
    obtain: "Crafting : 1 Apricorn rouge + 2 blancs + 1 noir + 1 lingot d'or. Donne 4 balls.",
    rarity: "rare",
    recipe: {
      grid: [
        null,  RED,   null,
        WHITE, GOLD,  WHITE,
        null,  BLACK, null,
      ],
      output: 4,
    },
  },
  {
    id: "luxury-ball",
    name: "Luxe Ball",
    category: "ball",
    description: "Le Pokémon capturé gagne du Bonheur deux fois plus vite.",
    obtain: "Crafting : 2 Apricorns noirs + 1 blanc + 1 rouge + 1 lingot d'or. Donne 4 balls.",
    rarity: "rare",
    recipe: {
      grid: [
        null,  BLACK, null,
        WHITE, GOLD,  RED,
        null,  BLACK, null,
      ],
      output: 4,
    },
  },
  {
    id: "dusk-ball",
    name: "Sombre Ball",
    category: "ball",
    description: "×3.5 dans le noir total, ×3 en faible lumière.",
    obtain: "Crafting : 2 Apricorns verts + 2 noirs + 1 lingot d'or. Donne 4 balls.",
    rarity: "rare",
    recipe: {
      grid: [
        null,  GREEN, null,
        BLACK, GOLD,  BLACK,
        null,  GREEN, null,
      ],
      output: 4,
    },
  },
  {
    id: "quick-ball",
    name: "Rapide Ball",
    category: "ball",
    description: "×5 au premier tour du combat.",
    obtain: "Crafting : 1 Apricorn bleu + 2 jaunes + 1 bleu + 1 lingot d'or. Donne 4 balls.",
    rarity: "rare",
    recipe: {
      grid: [
        null,   BLUE, null,
        YELLOW, GOLD, YELLOW,
        null,   BLUE, null,
      ],
      output: 4,
    },
  },

  // ─── Tier 4 (diamond-core) ──────────────────────────────────────
  {
    id: "dream-ball",
    name: "Rêve Ball",
    category: "ball",
    description: "×4 sur les Pokémon endormis.",
    obtain: "Crafting : 1 Apricorn rouge + 2 roses + 1 bleu + 1 Diamant. Donne 4 balls.",
    rarity: "ultra-rare",
    recipe: {
      grid: [
        null, RED,     null,
        PINK, DIAMOND, PINK,
        null, BLUE,    null,
      ],
      output: 4,
    },
  },
  {
    id: "beast-ball",
    name: "Beast Ball",
    category: "ball",
    description: "×5 sur les Ultra-Chimères, ×0.1 sur les autres.",
    obtain: "Crafting : 4 Lingots d'or + 4 Éclats d'écho + 1 Diamant. Donne 8 balls.",
    rarity: "ultra-rare",
    recipe: {
      grid: [
        GOLD, ECHO,    GOLD,
        ECHO, DIAMOND, ECHO,
        GOLD, ECHO,    GOLD,
      ],
      output: 8,
      note: "Coins en or, branches en éclats d'écho, diamant central.",
    },
  },

  // ─── Endgame ────────────────────────────────────────────────────
  {
    id: "master-ball",
    name: "Master Ball",
    category: "ball",
    description: "Capture garantie à 100 %.",
    obtain: "Crafting : 2 Coquilles de shulker + 2 Lingots de Netherite + 1 Étoile du Nether. Donne 1 ball.",
    rarity: "ultra-rare",
    recipe: {
      grid: [
        null,      SHULKER_SHELL, null,
        NETHERITE, NETHER_STAR,   NETHERITE,
        null,      SHULKER_SHELL, null,
      ],
      output: 1,
      note: "Shulker haut/bas, Netherite gauche/droite, Nether Star central. Ne brûle pas dans la lave.",
    },
  },

  // ─── Held items ─────────────────────────────────────────────────
  {
    id: "leftovers",
    name: "Restes",
    category: "held",
    description: "Restaure 1/16 PV à chaque tour.",
    obtain: "Drop de Ronflex (5 %) / Goinfrex (2,5 %), ou 2,5 % en mangeant une pomme.",
    rarity: "rare",
    // No crafting recipe — drop-only.
  },
  {
    id: "life-orb",
    name: "Orbe Vie",
    category: "held",
    description: "+30 % dégâts mais 10 % de recul à chaque attaque.",
    obtain: "Crafting : 2 Larmes de Ghast + 2 Pommes d'or + 4 Verres teintés + 1 Perle de l'Ender.",
    rarity: "rare",
    recipe: {
      grid: [
        "minecraft:ghast_tear",   "minecraft:tinted_glass", "minecraft:golden_apple",
        "minecraft:tinted_glass", "minecraft:ender_pearl",  "minecraft:tinted_glass",
        "minecraft:golden_apple", "minecraft:tinted_glass", "minecraft:ghast_tear",
      ],
      note: "Recette symétrique autour d'une Perle de l'Ender.",
    },
  },
  {
    id: "choice-scarf",
    name: "Mouchoir Choix",
    category: "held",
    description: "+50 % de Vitesse mais bloque sur une seule attaque.",
    obtain: "Crafting avec un Bandeau Vitalité + soie + redstone.",
    rarity: "rare",
  },
  {
    id: "choice-band",
    name: "Bandeau Choix",
    category: "held",
    description: "+50 % d'Attaque mais bloque sur une seule attaque.",
    obtain: "Crafting : Bandeau Vitalité + Laine blanche + Quartz du Nether + Lapis-lazuli + Redstone.",
    rarity: "rare",
    recipe: {
      grid: [
        "minecraft:white_wool",   "minecraft:nether_quartz", "minecraft:white_wool",
        "minecraft:lapis_lazuli", "cobblemon:muscle_band",   "minecraft:lapis_lazuli",
        "minecraft:white_wool",   "minecraft:redstone",      "minecraft:white_wool",
      ],
      note: "Bandeau Vitalité au centre, laine/quartz/lapis/redstone autour. Mise à jour 1.7.0.",
    },
  },
  {
    id: "choice-specs",
    name: "Lunettes Choix",
    category: "held",
    description: "+50 % d'Attaque Spéciale mais bloque sur une seule attaque.",
    obtain: "Crafting avec Lunettes Sages + matériaux magiques.",
    rarity: "rare",
  },
  {
    id: "assault-vest",
    name: "Veste de Combat",
    category: "held",
    description: "+50 % Déf. Spé mais interdit les attaques de statut.",
    obtain: "Crafting : 2 Protecteurs + 1 Tunique en cuir + 6 Laines rouges.",
    rarity: "rare",
    recipe: {
      grid: [
        "cobblemon:protector", "cobblemon:protector",       "minecraft:red_wool",
        "minecraft:red_wool",  "minecraft:leather_chestplate","minecraft:red_wool",
        "minecraft:red_wool",  "minecraft:red_wool",        "minecraft:red_wool",
      ],
      note: "Tunique en cuir au centre, entourée de laine rouge avec 2 Protecteurs en haut.",
    },
  },
  {
    id: "muscle-band",
    name: "Bandeau Vitalité",
    category: "held",
    description: "+10 % de puissance aux attaques physiques.",
    obtain: "Crafting de base, ingrédient pour le Bandeau Choix.",
    rarity: "uncommon",
  },
  {
    id: "wise-glasses",
    name: "Lunettes Sages",
    category: "held",
    description: "+10 % de puissance aux attaques spéciales.",
    obtain: "Crafting de base, ingrédient pour les Lunettes Choix.",
    rarity: "uncommon",
  },
  {
    id: "expert-belt",
    name: "Ceinture Pro",
    category: "held",
    description: "+20 % de dégâts sur les attaques super efficaces.",
    obtain: "Crafting avec cuir + matériaux types.",
    rarity: "rare",
  },
  {
    id: "rocky-helmet",
    name: "Casque Brut",
    category: "held",
    description: "Inflige 1/6 PV à l'attaquant au contact.",
    obtain: "Crafting : pierres + lingots de fer.",
    rarity: "rare",
  },
  {
    id: "focus-sash",
    name: "Ceinture Force",
    category: "held",
    description: "Survit à un coup K.O. avec 1 PV (single-use).",
    obtain: "Crafting avec corde + matériaux légers.",
    rarity: "rare",
  },
  {
    id: "lucky-egg",
    name: "Œuf Chance",
    category: "held",
    description: "+50 % d'XP gagné pour le porteur.",
    obtain: "Drop rare de Leveinard / Leuphorie.",
    rarity: "ultra-rare",
  },
  {
    id: "everstone",
    name: "Pierre Stase",
    category: "held",
    description: "Empêche le Pokémon d'évoluer.",
    obtain: "Trouvable dans les grottes ou crafting simple.",
    rarity: "common",
  },
  {
    id: "exp-share",
    name: "Multi Exp.",
    category: "held",
    description: "Partage l'XP avec les Pokémon de l'équipe non actifs.",
    obtain: "Crafting avec lingots d'or + redstone.",
    rarity: "uncommon",
  },

  // ─── Evolution items ────────────────────────────────────────────
  {
    id: "fire-stone",
    name: "Pierre Feu",
    category: "evolution",
    description: "Fait évoluer certains Pokémon Feu (Goupix, Caninos, Vulcaroc).",
    obtain: "Miner du minerai de Pierre Feu (overworld, surface chaude) ou cuire le minerai.",
    relatedPokemonIds: ["vulpix", "growlithe"],
    rarity: "rare",
  },
  {
    id: "thunder-stone",
    name: "Pierre Foudre",
    category: "evolution",
    description: "Fait évoluer Pikachu, Voltorbe, Pichu, etc.",
    obtain: "Miner du minerai de Pierre Foudre ou cuire le minerai.",
    relatedPokemonIds: ["pikachu"],
    rarity: "rare",
  },
  {
    id: "water-stone",
    name: "Pierre Eau",
    category: "evolution",
    description: "Fait évoluer Stari, Évoli (→ Aquali), Coquiperl, etc.",
    obtain: "Miner du minerai de Pierre Eau (proche de l'eau).",
    rarity: "rare",
  },
  {
    id: "leaf-stone",
    name: "Pierre Plante",
    category: "evolution",
    description: "Fait évoluer Mystherbe, Boustiflor, Évoli (→ Phyllali).",
    obtain: "Miner du minerai de Pierre Plante (forêts).",
    rarity: "rare",
  },
  {
    id: "moon-stone",
    name: "Pierre Lune",
    category: "evolution",
    description: "Fait évoluer Mélofée, Nidorina, Nidorino, Skitty.",
    obtain: "Trouvable dans les grottes, parfois en récompense des Pokémon.",
    rarity: "rare",
  },
  {
    id: "sun-stone",
    name: "Pierre Soleil",
    category: "evolution",
    description: "Fait évoluer Tournegrin, Mystherbe (→ Joliflor), Solaroc.",
    obtain: "Miner du minerai de Pierre Soleil.",
    rarity: "rare",
  },
  {
    id: "dusk-stone",
    name: "Pierre Nuit",
    category: "evolution",
    description: "Fait évoluer Munja, Magirêve, Corboss, Feuforêve.",
    obtain: "Miner du minerai de Pierre Nuit (cavernes profondes).",
    rarity: "rare",
  },
  {
    id: "dawn-stone",
    name: "Pierre Aube",
    category: "evolution",
    description: "Fait évoluer Kirlia ♂ → Gallame, Tritosor ♀ → Momartik.",
    obtain: "Miner du minerai de Pierre Aube.",
    rarity: "rare",
  },
  {
    id: "shiny-stone",
    name: "Pierre Éclat",
    category: "evolution",
    description: "Fait évoluer Togetic, Cresselia (?), Hélionceau.",
    obtain: "Miner du minerai de Pierre Éclat.",
    rarity: "rare",
  },
  {
    id: "ice-stone",
    name: "Pierre Glace",
    category: "evolution",
    description: "Fait évoluer Goupix d'Alola, Sabelette d'Alola, Évoli (→ Givrali).",
    obtain: "Miner du minerai de Pierre Glace (biomes froids).",
    rarity: "rare",
  },
  {
    id: "metal-coat",
    name: "Peau Métal",
    category: "evolution",
    description: "Tenu pendant un échange : évolution Acier (Insécateur → Cizayox).",
    obtain: "Crafting : 3 lingots de fer + boule d'argile + gemme d'acier + rayon de miel. Aussi drop de Magnéton.",
    relatedPokemonIds: ["scizor"],
    rarity: "ultra-rare",
  },
  {
    id: "kings-rock",
    name: "Roche Royale",
    category: "evolution",
    description: "Tenu pendant un échange : évolution royale (Otaria → Lamantine).",
    obtain: "Drop rare des Pokémon-couronnes.",
    rarity: "ultra-rare",
  },
  {
    id: "dragon-scale",
    name: "Écaille Draco",
    category: "evolution",
    description: "Tenu pendant un échange : Hypotrempe → Hyporoi.",
    obtain: "Drop rare des Pokémon Dragon.",
    rarity: "ultra-rare",
  },

  // ─── Healing items ──────────────────────────────────────────────
  {
    id: "potion",
    name: "Potion",
    category: "healing",
    description: "Soigne 20 PV.",
    obtain: "Crafting de base — bouteille d'eau + sucre.",
    rarity: "common",
  },
  {
    id: "super-potion",
    name: "Super Potion",
    category: "healing",
    description: "Soigne 60 PV.",
    obtain: "Crafting : améliore une Potion.",
    rarity: "uncommon",
  },
  {
    id: "hyper-potion",
    name: "Hyper Potion",
    category: "healing",
    description: "Soigne 120 PV.",
    obtain: "Crafting : améliore une Super Potion.",
    rarity: "rare",
  },
  {
    id: "max-potion",
    name: "Potion Max",
    category: "healing",
    description: "Restaure tous les PV.",
    obtain: "Crafting : améliore une Hyper Potion.",
    rarity: "rare",
  },
  {
    id: "revive",
    name: "Rappel",
    category: "healing",
    description: "Ranime un Pokémon avec la moitié de ses PV.",
    obtain: "Crafting : os + fragment de cristal.",
    rarity: "rare",
  },
  {
    id: "max-revive",
    name: "Rappel Max",
    category: "healing",
    description: "Ranime un Pokémon avec tous ses PV.",
    obtain: "Crafting : Rappel + cristal vert.",
    rarity: "ultra-rare",
  },
  {
    id: "full-restore",
    name: "Total Soin",
    category: "healing",
    description: "Restaure tous les PV et soigne tous les statuts.",
    obtain: "Crafting avec Potion Max + ingrédients de soin.",
    rarity: "rare",
  },
  {
    id: "full-heal",
    name: "Total Soin Statut",
    category: "healing",
    description: "Soigne tous les statuts (paralysie, sommeil, brûlure, etc.).",
    obtain: "Crafting avec lait + champignons.",
    rarity: "uncommon",
  },

  // ─── Berries ────────────────────────────────────────────────────
  {
    id: "oran-berry",
    name: "Baie Oran",
    category: "berry",
    description: "Restaure 10 PV en combat quand consommée.",
    obtain: "Cultiver une graine de Baie Oran sur de la terre.",
    rarity: "common",
  },
  {
    id: "sitrus-berry",
    name: "Baie Sitrus",
    category: "berry",
    description: "Restaure 25 % des PV max sous 50 % HP.",
    obtain: "Cultiver une graine de Baie Sitrus.",
    rarity: "uncommon",
  },
  {
    id: "lum-berry",
    name: "Baie Prine",
    category: "berry",
    description: "Soigne tout statut négatif (paralysie, sommeil, etc.).",
    obtain: "Cultiver une graine de Baie Prine.",
    rarity: "rare",
  },
  {
    id: "leppa-berry",
    name: "Baie Mepo",
    category: "berry",
    description: "Restaure 10 PP à une attaque.",
    obtain: "Cultiver une graine de Baie Mepo.",
    rarity: "rare",
  },
  {
    id: "chesto-berry",
    name: "Baie Maron",
    category: "berry",
    description: "Réveille le Pokémon endormi.",
    obtain: "Cultiver une graine de Baie Maron.",
    rarity: "uncommon",
  },
  {
    id: "pecha-berry",
    name: "Baie Pêcha",
    category: "berry",
    description: "Soigne l'empoisonnement.",
    obtain: "Cultiver une graine de Baie Pêcha.",
    rarity: "common",
  },
  {
    id: "cheri-berry",
    name: "Baie Ceriz",
    category: "berry",
    description: "Soigne la paralysie.",
    obtain: "Cultiver une graine de Baie Ceriz.",
    rarity: "common",
  },
  {
    id: "rawst-berry",
    name: "Baie Fraive",
    category: "berry",
    description: "Soigne la brûlure.",
    obtain: "Cultiver une graine de Baie Fraive.",
    rarity: "common",
  },
  {
    id: "aspear-berry",
    name: "Baie Willia",
    category: "berry",
    description: "Soigne le gel.",
    obtain: "Cultiver une graine de Baie Willia.",
    rarity: "common",
  },
];
