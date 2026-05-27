import type { Item } from "@/types";

/**
 * Cobblemon items catalog. Sample-sized but covers every category so the
 * UI can be tested. Replace with a full dump from
 * `cobblemon/data/cobblemon/item_overrides/*.json` later.
 */
export const ITEMS: Item[] = [
  // Apricorn Balls
  { id: "poke-ball",   name: "Poké Ball",   category: "ball", description: "Ball de base, taux de capture ×1.",                                       obtain: "Artisanat — 1 Apricorn rouge + 1 disque de fer.", rarity: "common" },
  { id: "great-ball",  name: "Super Ball",  category: "ball", description: "Taux de capture ×1.5.",                                                    obtain: "Artisanat — 1 Apricorn bleu + 1 disque de fer.", rarity: "uncommon" },
  { id: "ultra-ball",  name: "Hyper Ball",  category: "ball", description: "Taux de capture ×2.",                                                     obtain: "Artisanat — 1 Apricorn jaune + 1 disque de fer.", rarity: "rare" },
  { id: "dive-ball",   name: "Scuba Ball",  category: "ball", description: "×3.5 sur les Pokémon dans l'eau.",                                        obtain: "Artisanat — 1 Apricorn vert + 1 disque de fer.", rarity: "uncommon" },
  { id: "dusk-ball",   name: "Sombre Ball", category: "ball", description: "×3 la nuit ou dans une grotte.",                                          obtain: "Artisanat — 1 Apricorn noir + 1 disque de fer.", rarity: "uncommon" },
  { id: "timer-ball",  name: "Chrono Ball", category: "ball", description: "Capture plus efficace plus le combat dure.",                              obtain: "Artisanat — 1 Apricorn blanc + 1 disque de fer.", rarity: "uncommon" },

  // Held items
  { id: "leftovers",     name: "Restes",          category: "held", description: "Restaure 1/16 PV à chaque tour.",                                  rarity: "rare" },
  { id: "life-orb",      name: "Orbe Vie",        category: "held", description: "+30 % dégâts mais 10 % de recul à chaque attaque.",                rarity: "rare" },
  { id: "choice-scarf",  name: "Mouchoir Choix",  category: "held", description: "+50 % de Vitesse mais bloque sur une seule attaque.",              rarity: "rare" },
  { id: "choice-band",   name: "Bandeau Choix",   category: "held", description: "+50 % d'Attaque mais bloque sur une seule attaque.",               rarity: "rare" },
  { id: "choice-specs",  name: "Lunettes Choix",  category: "held", description: "+50 % d'Attaque Spéciale mais bloque sur une seule attaque.",      rarity: "rare" },
  { id: "assault-vest",  name: "Veste de Combat", category: "held", description: "+50 % Déf. Spé mais interdit les attaques de statut.",             rarity: "rare" },

  // Evolution items
  { id: "fire-stone",    name: "Pierre Feu",       category: "evolution", description: "Fait évoluer certains Pokémon Feu.",         relatedPokemonIds: [],          rarity: "rare" },
  { id: "thunder-stone", name: "Pierre Foudre",    category: "evolution", description: "Fait évoluer certains Pokémon Électrik.",   relatedPokemonIds: ["pikachu"], rarity: "rare" },
  { id: "water-stone",   name: "Pierre Eau",       category: "evolution", description: "Fait évoluer certains Pokémon Eau.",         relatedPokemonIds: [],          rarity: "rare" },
  { id: "leaf-stone",    name: "Pierre Plante",    category: "evolution", description: "Fait évoluer certains Pokémon Plante.",      relatedPokemonIds: [],          rarity: "rare" },
  { id: "moon-stone",    name: "Pierre Lune",      category: "evolution", description: "Fait évoluer certains Pokémon Normal/Fée.",  relatedPokemonIds: [],          rarity: "rare" },
  { id: "metal-coat",    name: "Peau Métal",       category: "evolution", description: "Tenu pendant un échange : évolution Acier.", relatedPokemonIds: ["scizor"],  rarity: "ultra-rare" },

  // Healing
  { id: "potion",       name: "Potion",        category: "healing", description: "Soigne 20 PV.",                                          rarity: "common" },
  { id: "super-potion", name: "Super Potion",  category: "healing", description: "Soigne 60 PV.",                                          rarity: "uncommon" },
  { id: "hyper-potion", name: "Hyper Potion",  category: "healing", description: "Soigne 120 PV.",                                          rarity: "rare" },
  { id: "max-revive",   name: "Rappel Max",    category: "healing", description: "Ranime un Pokémon avec tous ses PV.",                   rarity: "ultra-rare" },
  { id: "full-restore", name: "Total Soin",    category: "healing", description: "Restaure tous les PV et soigne tous les statuts.",       rarity: "rare" },

  // Berries
  { id: "oran-berry",   name: "Baie Oran",      category: "berry", description: "Restaure 10 PV en combat.",                              rarity: "common" },
  { id: "sitrus-berry", name: "Baie Sitrus",    category: "berry", description: "Restaure 25 % des PV max sous 50 % HP.",                 rarity: "uncommon" },
  { id: "lum-berry",    name: "Baie Prine",     category: "berry", description: "Soigne tout statut négatif (paralysie, sommeil, etc.).", rarity: "rare" },
];
