# CobbleMate

Compagnon web pour **Cobblemon 1.7.3** : Pokédex, builder d'équipe, assistant
de combat, table des types, spawns et PokéSnacks.

Stack : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn/ui (preset `b0` / style `nova` / base-ui).

## Lancer en local

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production
```

## Architecture

```
src/
├─ app/                    Pages App Router
│  ├─ page.tsx             Dashboard
│  ├─ pokedex/             Pokédex + [id] détail
│  ├─ team-builder/        Builder d'équipe
│  ├─ battle/              Assistant de combat
│  ├─ types/               Table des 18 types
│  ├─ moves/               Liste des attaques
│  ├─ spawns/              Conditions de spawn
│  └─ pokesnacks/          Catalogue + conseils
├─ components/
│  ├─ ui/                  Primitives shadcn/ui
│  └─ site/                Sidebar, Header, TypeBadge, PokemonCard
├─ features/               Logique UI par domaine
│  ├─ pokedex/
│  ├─ team-builder/
│  └─ battle-helper/
├─ data/                   Source de données JSON locale
│  ├─ pokemon.ts
│  ├─ moves.ts
│  ├─ types.ts             Métadonnées (couleurs, libellés FR)
│  ├─ spawns.ts
│  └─ pokesnacks.ts
├─ lib/                    Logique métier pure
│  ├─ type-chart.ts        Table des 18 types + calculateTypeEffectiveness
│  ├─ pokemon-utils.ts     getPokemonWeaknesses, baseStatTotal…
│  ├─ team-analysis.ts     analyzeTeam, scoreTeam, recommendTeamChanges
│  ├─ battle.ts            getBestTeamMemberAgainst, getBestCounters
│  └─ search.ts            searchPokemon, filterPokemonByType…
├─ hooks/
│  └─ use-saved-teams.ts   Persistance localStorage
└─ types/                  Définitions TypeScript du domaine
```

## Importer les 1025 Pokémon

Le code lit `POKEMON: Pokemon[]` depuis `src/data/pokemon.ts`. Pour passer aux
1025 Pokémon :

1. **Récupérer un dump JSON** correspondant à l'interface `Pokemon`
   (cf. `src/types/index.ts`). Sources :
   - [PokeAPI](https://pokeapi.co) (REST, gratuit, sans clé)
   - Le dossier `cobblemon/data/cobblemon/species/*.json` du mod
   - Un dataset comme [pokemon.json](https://github.com/fanzeyi/pokemon.json)

2. **Convertir vers le schéma `Pokemon`** :

   ```ts
   // scripts/import-pokemon.ts
   import fs from "node:fs";
   import type { Pokemon } from "../src/types";

   const raw = JSON.parse(fs.readFileSync("source.json", "utf-8"));
   const pokemon: Pokemon[] = raw.map((p: any) => ({
     id: p.name.fr.toLowerCase(),
     dexNumber: p.id,
     name: p.name.fr,
     generation: p.generation,
     types: p.types.map((t: string) => t.toLowerCase()),
     abilities: p.abilities,
     baseStats: p.base,
     evolutions: p.evolutions ?? [],
     notableMoves: [],
     roles: [],
   }));

   fs.writeFileSync(
     "src/data/pokemon-full.json",
     JSON.stringify(pokemon, null, 2),
   );
   ```

3. **Remplacer la source** :

   ```ts
   // src/data/pokemon.ts
   import full from "./pokemon-full.json";
   export const POKEMON = full as Pokemon[];
   export const POKEMON_BY_ID = Object.fromEntries(POKEMON.map(p => [p.id, p]));
   ```

L'UI ne lit que `POKEMON[]` — aucune autre modification n'est nécessaire.

## Brancher Supabase / une API plus tard

La logique métier vit dans `src/lib/` et lit les données via `src/data/*`.
Pour passer à une vraie base :

1. Crée un client (`src/lib/db.ts`) exposant `getAllPokemon()`,
   `getPokemonById(id)`, etc.
2. Convertis `pokemon.ts` en façade asynchrone qui appelle ce client.
3. Les fonctions pures (`calculateTypeEffectiveness`, `analyzeTeam`, etc.)
   restent inchangées.

## Personnaliser le thème

```bash
npx shadcn@latest preset decode <code>             # inspecter
npx shadcn@latest apply <code> --only theme,font   # appliquer le thème
npx shadcn@latest apply <code>                     # tout écraser
```

Les codes de preset se génèrent sur [ui.shadcn.com](https://ui.shadcn.com).
Le projet est actuellement sous `b0` (style nova, palette neutre, Inter).
