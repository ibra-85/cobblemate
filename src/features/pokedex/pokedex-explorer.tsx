"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PokemonCard } from "@/components/site/pokemon-card";
import { POKEMON } from "@/data/pokemon";
import { ALL_BIOMES, SPAWNS } from "@/data/spawns";
import { TYPES_META } from "@/data/types";
import type { PokemonRole, PokemonTypeId, Rarity } from "@/types";
import {
  filterPokemonByGeneration,
  filterPokemonBySpawn,
  filterPokemonByType,
  searchPokemon,
} from "@/lib/search";

const ROLES: PokemonRole[] = [
  "physical-sweeper",
  "special-sweeper",
  "physical-wall",
  "special-wall",
  "mixed-wall",
  "support",
  "hazard-setter",
  "pivot",
  "revenge-killer",
  "wallbreaker",
  "lead",
];

const RARITIES: Rarity[] = ["common", "uncommon", "rare", "ultra-rare", "legendary"];

export function PokedexExplorer() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PokemonTypeId | "all">("all");
  const [gen, setGen] = useState<string>("all");
  const [role, setRole] = useState<PokemonRole | "all">("all");
  const [biome, setBiome] = useState<string>("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");

  const generations = useMemo(
    () => Array.from(new Set(POKEMON.map((p) => p.generation))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    let list = POKEMON;
    if (query) list = searchPokemon(query, list);
    if (type !== "all") list = filterPokemonByType(type, list);
    if (gen !== "all") list = filterPokemonByGeneration(Number(gen), list);
    if (role !== "all") list = list.filter((p) => p.roles.includes(role));
    if (biome !== "all") {
      list = filterPokemonBySpawn((s) => s.biomes.includes(biome), list);
    }
    if (rarity !== "all") {
      const ids = new Set(SPAWNS.filter((s) => s.rarity === rarity).map((s) => s.pokemonId));
      list = list.filter((p) => ids.has(p.id));
    }
    return list;
  }, [query, type, gen, role, biome, rarity]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <Input
            placeholder="Recherche par nom, ID ou n° National Dex…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <Select value={type} onValueChange={(v) => setType(v as PokemonTypeId | "all")}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {(Object.keys(TYPES_META) as PokemonTypeId[]).map((t) => (
              <SelectItem key={t} value={t}>{TYPES_META[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={gen} onValueChange={(v) => setGen(v ?? "all")}>
          <SelectTrigger><SelectValue placeholder="Génération" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes générations</SelectItem>
            {generations.map((g) => (
              <SelectItem key={g} value={String(g)}>Gen {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={role} onValueChange={(v) => setRole(v as PokemonRole | "all")}>
          <SelectTrigger><SelectValue placeholder="Rôle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={biome} onValueChange={(v) => setBiome(v ?? "all")}>
          <SelectTrigger><SelectValue placeholder="Biome" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous biomes</SelectItem>
            {ALL_BIOMES.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={rarity} onValueChange={(v) => setRarity(v as Rarity | "all")}>
          <SelectTrigger><SelectValue placeholder="Rareté" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes raretés</SelectItem>
            {RARITIES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} Pokémon · {POKEMON.length} dans la base
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((p) => (
          <PokemonCard key={p.id} pokemon={p} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          Aucun Pokémon ne correspond à ces filtres.
        </div>
      )}
    </div>
  );
}
