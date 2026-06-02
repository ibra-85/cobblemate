import type { Pokemon } from "@/types";

/**
 * Per-Pokémon manual overrides applied on top of the auto-generated
 * dataset (`pokemon-generated.json`).
 *
 * Use this file for any data that the build script can't infer correctly:
 *  - localized ability names (FR vs. English from cobblemon-academy)
 *  - curated `notableMoves`, `roles`, `goodPartners`, `dangerousCounters`
 *  - hand-written `strategyTips`, `usage`, `sets`
 *  - evolution methods worded in French ("Pierre Foudre" vs. "Use Item")
 *
 * Anything left undefined falls through to the generated value.
 */
type Override = Partial<Omit<Pokemon, "id" | "dexNumber">>;

export const POKEMON_OVERRIDES: Record<string, Override> = {
  bulbasaur: {
    abilities: ["Engrais"],
    hiddenAbility: "Chlorophylle",
    notableMoves: ["leaf-blade", "sleep-powder", "giga-drain"],
    roles: ["support", "special-sweeper"],
    goodPartners: ["charmander", "squirtle"],
    dangerousCounters: ["charizard", "talonflame"],
    strategyTips:
      "Pose des status (Poudre Dodo) avant de switch sur un sweeper.",
  },
  ivysaur: {
    abilities: ["Engrais"],
    hiddenAbility: "Chlorophylle",
    notableMoves: ["leaf-blade", "sludge-bomb"],
    roles: ["support", "special-sweeper"],
  },
  venusaur: {
    abilities: ["Engrais"],
    hiddenAbility: "Chlorophylle",
    notableMoves: ["leaf-blade", "sludge-bomb", "earthquake"],
    roles: ["special-wall", "special-sweeper"],
    goodPartners: ["rotom_wash", "scizor"],
    dangerousCounters: ["charizard", "togekiss"],
    strategyTips:
      "Excellent contre la pluie : Force Soleil + Lance-Soleil instant.",
  },
  charizard: {
    abilities: ["Brasier"],
    hiddenAbility: "Force Soleil",
    notableMoves: ["flamethrower", "roost", "dragon-claw"],
    roles: ["special-sweeper", "pivot"],
    goodPartners: ["lucario", "garchomp"],
    dangerousCounters: ["tyranitar", "rhyperior"],
    strategyTips:
      "Quad-weak à Roche : élimine les Stealth Rock avant de l'envoyer.",
  },
  blastoise: {
    abilities: ["Torrent"],
    hiddenAbility: "Cuvette",
    notableMoves: ["hydro-pump", "ice-beam", "stealth-rock"],
    roles: ["mixed-wall", "hazard-setter"],
    goodPartners: ["venusaur", "lucario"],
    dangerousCounters: ["zarude", "rotom_mow"],
    strategyTips:
      "Excellent poseur de Stealth Rock défensif, switch sur les Feu.",
  },
  pikachu: {
    abilities: ["Statik"],
    hiddenAbility: "Paratonnerre",
    evolutions: [{ to: "raichu", method: "Pierre Foudre" }],
    notableMoves: ["thunderbolt", "iron-tail", "volt-tackle"],
    roles: ["physical-sweeper"],
    goodPartners: ["snorlax"],
    dangerousCounters: ["garchomp", "excadrill"],
    strategyTips: "Fragile : à utiliser en revenge killer derrière un pivot.",
  },
  raichu: {
    abilities: ["Statik"],
    hiddenAbility: "Paratonnerre",
    notableMoves: ["thunderbolt", "psychic", "iron-tail"],
    roles: ["physical-sweeper", "revenge-killer"],
    goodPartners: ["snorlax", "rotom_wash"],
    dangerousCounters: ["garchomp"],
  },
  snorlax: {
    abilities: ["Isograisse", "Estomac"],
    hiddenAbility: "Gloutonnerie",
    notableMoves: ["body-slam", "earthquake", "rest"],
    roles: ["special-wall", "wallbreaker"],
    goodPartners: ["lucario", "rotom"],
    dangerousCounters: ["lucario", "machamp"],
    strategyTips:
      "Mur spécial mobile. Curelex + Repos pour le rendre infatigable.",
    usage: {
      usagePercent: 8.71,
      abilities: [
        { value: "Isograisse", percent: 71.4 },
        { value: "Estomac", percent: 18.9 },
        { value: "Gloutonnerie", percent: 9.7 },
      ],
      items: [
        { value: "Restes", percent: 62.3 },
        { value: "Orbe Vie", percent: 18.4 },
        { value: "Bandeau Choix", percent: 12.8 },
      ],
      teammates: [
        { value: "rotom_wash", percent: 47.1 },
        { value: "lucario", percent: 28.6 },
      ],
      moves: [
        { value: "body-slam", percent: 81.2 },
        { value: "earthquake", percent: 64.5 },
        { value: "rest", percent: 58.3 },
        { value: "sleep-talk", percent: 51.7 },
      ],
      spreads: [
        { value: "188 HP / 144 Def / 176+ SpD (Sereine)", percent: 41.8 },
      ],
    },
    sets: [
      {
        name: "Curelex défensif",
        items: ["Restes"],
        ability: "Isograisse",
        nature: "Sereine (+Déf.Spé / -Atk.Spé)",
        evs: "188 HP / 144 Def / 176 SpD",
        moves: [
          { primary: "body-slam" },
          { primary: "earthquake" },
          { primary: "rest" },
          { primary: "sleep-talk" },
        ],
        notes: "Mur quasi-immortel grâce à Repos + Blabla Dodo.",
      },
    ],
  },
  gengar: {
    abilities: ["Lévitation"],
    notableMoves: ["shadow-ball", "sludge-bomb", "thunderbolt"],
    roles: ["special-sweeper", "revenge-killer"],
    goodPartners: ["scizor", "tyranitar"],
    dangerousCounters: ["tyranitar", "weavile"],
    strategyTips:
      "Immunisé Sol grâce à Lévitation : pivot sur les attaques Sol prévues.",
  },
  garchomp: {
    // Hidden was previously "Voile Sable" (a malformed duplicate of
    // the regular ability label) — fixed to the actual Rough Skin
    // so the optimiser can resolve the Smogon "Rough Skin" set pick.
    abilities: ["Sable Volant"],
    hiddenAbility: "Peau Dure",
    notableMoves: ["earthquake", "dragon-claw", "stealth-rock"],
    roles: ["physical-sweeper", "hazard-setter"],
    goodPartners: ["rotom_wash", "ferrothorn"],
    dangerousCounters: ["weavile", "togekiss"],
    strategyTips: "Quad-weak à Glace. Couvre les sweepers avec Sub + DD.",
    usage: {
      usagePercent: 12.573,
      abilities: [
        { value: "Sable Volant", percent: 92.922 },
        { value: "Voile Sable", percent: 7.078 },
      ],
      items: [
        { value: "Mouchoir Choix", percent: 55.2 },
        { value: "Bandeau Choix", percent: 25.994 },
        { value: "Veste de Combat", percent: 12.969 },
        { value: "Orbe Vie", percent: 2.757 },
      ],
      teammates: [
        { value: "rotom_wash", percent: 49.227 },
        { value: "scizor", percent: 39.006 },
        { value: "togekiss", percent: 38.236 },
        { value: "lucario", percent: 33.898 },
        { value: "tyranitar", percent: 21.697 },
      ],
      moves: [
        { value: "earthquake", percent: 100 },
        { value: "dragon-claw", percent: 84.85 },
        { value: "stealth-rock", percent: 47.17 },
        { value: "stone-edge", percent: 32.21 },
        { value: "fire-blast", percent: 21.3 },
      ],
      spreads: [
        { value: "4 HP / 252+ Atk / 252 Spe (Jovial)", percent: 45.272 },
        { value: "156 HP / 252+ Atk / 100 Spe (Adamant)", percent: 17.257 },
        { value: "4 HP / 252 Atk / 252+ Spe (Jovial)", percent: 13.638 },
        { value: "252 HP / 252+ Atk / 4 SpD (Adamant)", percent: 1.762 },
      ],
    },
    sets: [
      {
        name: "Scarf",
        items: ["Mouchoir Choix"],
        ability: "Sable Volant",
        nature: "Jovial (+Vit / -Atk.Spé)",
        evs: "4 HP / 252 Atk / 252 Spe",
        moves: [
          { primary: "earthquake" },
          { primary: "dragon-claw", alternatives: ["outrage"] },
          { primary: "stone-edge" },
          { primary: "fire-blast" },
        ],
        notes: "Revenge killer rapide qui exploite la Speed-tier de 102.",
      },
      {
        name: "Stealth Rock Lead",
        items: ["Restes", "Pierre Froide"],
        ability: "Sable Volant",
        nature: "Rigide (+Atk / -Atk.Spé)",
        evs: "252 HP / 4 Atk / 252 Def",
        moves: [
          { primary: "stealth-rock" },
          { primary: "earthquake" },
          { primary: "dragon-claw" },
          { primary: "roar", alternatives: ["toxic"] },
        ],
        notes: "Pose les rochers en early game puis pivote sur du physique.",
      },
    ],
  },
  lucario: {
    abilities: ["Acharné", "Attention"],
    hiddenAbility: "Adaptabilité",
    notableMoves: ["close-combat", "iron-head", "sucker-punch"],
    roles: ["physical-sweeper", "revenge-killer"],
    goodPartners: ["rotom_wash", "garchomp"],
    dangerousCounters: ["talonflame", "garchomp"],
    strategyTips: "Mixed sweeper grâce à Adaptabilité ; couvre Fée/Combat.",
    usage: {
      usagePercent: 9.42,
      abilities: [
        { value: "Acharné", percent: 48.1 },
        { value: "Adaptabilité", percent: 36.4 },
        { value: "Attention", percent: 15.5 },
      ],
      items: [
        { value: "Orbe Vie", percent: 41.2 },
        { value: "Bandeau Choix", percent: 28.7 },
        { value: "Mouchoir Choix", percent: 18.1 },
        { value: "Restes", percent: 5.4 },
      ],
      teammates: [
        { value: "rotom_wash", percent: 42.6 },
        { value: "garchomp", percent: 38.1 },
        { value: "togekiss", percent: 22.4 },
      ],
      moves: [
        { value: "close-combat", percent: 95.2 },
        { value: "iron-head", percent: 71.3 },
        { value: "sucker-punch", percent: 58.9 },
        { value: "extreme-speed", percent: 41.1 },
      ],
      spreads: [
        { value: "4 HP / 252+ Atk / 252 Spe (Jovial)", percent: 52.4 },
        { value: "252 Atk / 4 SpD / 252+ Spe (Jovial)", percent: 19.8 },
      ],
    },
    sets: [
      {
        name: "Swords Dance physique",
        items: ["Orbe Vie"],
        ability: "Adaptabilité",
        nature: "Jovial (+Vit / -Atk.Spé)",
        evs: "4 HP / 252 Atk / 252 Spe",
        moves: [
          { primary: "swords-dance" },
          { primary: "close-combat" },
          { primary: "iron-head", alternatives: ["meteor-mash"] },
          { primary: "extreme-speed", alternatives: ["sucker-punch"] },
        ],
        notes: "Set up + STAB doublé par Adaptabilité = OHKO sur la majorité.",
      },
    ],
  },
  togekiss: {
    abilities: ["Tempo Perso", "Sérénité"],
    hiddenAbility: "Bonus Bonheur",
    notableMoves: ["air-slash", "dazzling-gleam", "roost"],
    roles: ["special-wall", "support"],
    goodPartners: ["heatran", "garchomp"],
    dangerousCounters: ["heatran", "magnezone"],
    strategyTips:
      "Air Slash + Sérénité = flinch fest. Excellent contre les Dragon.",
  },
  "rotom_wash": {
    abilities: ["Lévitation"],
    notableMoves: ["hydro-pump", "thunderbolt", "u-turn"],
    roles: ["pivot", "support"],
    goodPartners: ["ferrothorn", "garchomp"],
    dangerousCounters: ["zarude", "venusaur"],
    strategyTips: "Lévitation lui donne l'immunité Sol. Pivot universel.",
  },
  scizor: {
    abilities: ["Essaim", "Technicien"],
    hiddenAbility: "Brio",
    notableMoves: ["u-turn", "bullet-punch", "iron-head"],
    roles: ["physical-sweeper", "pivot"],
    goodPartners: ["heatran", "garchomp"],
    dangerousCounters: ["charizard", "magnezone"],
    strategyTips:
      "Bullet Punch + Technicien = STAB priorité, parfait revenge killer.",
  },
  tyranitar: {
    abilities: ["Sable Levé"],
    hiddenAbility: "Couard",
    notableMoves: ["stone-edge", "crunch", "earthquake"],
    roles: ["wallbreaker", "physical-wall"],
    goodPartners: ["excadrill", "ferrothorn"],
    dangerousCounters: ["lucario", "machamp", "keldeo"],
    strategyTips:
      "Quad-weak à Combat ! Garde un coéquipier rapide pour éviter le swap-kill.",
    usage: {
      usagePercent: 15.84,
      abilities: [
        { value: "Sable Levé", percent: 88.7 },
        { value: "Couard", percent: 11.3 },
      ],
      items: [
        { value: "Roche Lisse", percent: 38.2 },
        { value: "Bandeau Choix", percent: 24.9 },
        { value: "Veste de Combat", percent: 19.1 },
        { value: "Restes", percent: 14.5 },
      ],
      teammates: [
        { value: "garchomp", percent: 41.2 },
        { value: "scizor", percent: 32.8 },
        { value: "rotom_wash", percent: 21.4 },
      ],
      moves: [
        { value: "stone-edge", percent: 87.3 },
        { value: "crunch", percent: 78.4 },
        { value: "earthquake", percent: 62.1 },
        { value: "stealth-rock", percent: 45.8 },
        { value: "fire-blast", percent: 22.6 },
      ],
      spreads: [
        { value: "252 HP / 4 Atk / 252+ SpD (Rigide)", percent: 38.4 },
        { value: "4 HP / 252+ Atk / 252 Spe (Adamant)", percent: 27.1 },
        { value: "248 HP / 8 Def / 252+ SpD (Sereine)", percent: 14.2 },
      ],
    },
    sets: [
      {
        name: "Sand Setter spécial",
        items: ["Veste de Combat"],
        ability: "Sable Levé",
        nature: "Sereine (+Déf.Spé / -Atk.Spé)",
        evs: "252 HP / 4 Def / 252 SpD",
        moves: [
          { primary: "stone-edge" },
          { primary: "crunch" },
          { primary: "earthquake" },
          { primary: "stealth-rock" },
        ],
        notes:
          "Pose le sable, encaisse les spéciaux, met les rochers. Pivot universel.",
      },
      {
        name: "Wallbreaker offensif",
        items: ["Bandeau Choix"],
        ability: "Sable Levé",
        nature: "Rigide (+Atk / -Atk.Spé)",
        evs: "4 HP / 252 Atk / 252 Spe",
        moves: [
          { primary: "stone-edge" },
          { primary: "crunch" },
          { primary: "earthquake" },
          { primary: "fire-blast", alternatives: ["pursuit"] },
        ],
        notes: "Punition immédiate sur les murs spéciaux.",
      },
    ],
  },
};
