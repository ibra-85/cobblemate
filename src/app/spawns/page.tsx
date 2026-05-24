"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TypeBadges } from "@/components/site/type-badge";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { ALL_BIOMES, SPAWNS } from "@/data/spawns";
import type { DayPeriod, Dimension, Rarity, Weather } from "@/types";

const DAY_PERIODS: DayPeriod[] = ["any", "day", "night", "dawn", "dusk"];
const WEATHERS: Weather[] = ["any", "clear", "rain", "thunder", "snow"];
const DIMENSIONS: Dimension[] = ["any", "overworld", "nether", "end"];
const RARITIES: Rarity[] = ["common", "uncommon", "rare", "ultra-rare", "legendary"];

export default function SpawnsPage() {
  const [biome, setBiome] = useState<string>("all");
  const [day, setDay] = useState<DayPeriod | "all">("all");
  const [weather, setWeather] = useState<Weather | "all">("all");
  const [dim, setDim] = useState<Dimension | "all">("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");

  const filtered = useMemo(() => {
    return SPAWNS.filter((s) => {
      if (biome !== "all" && !s.biomes.includes(biome)) return false;
      if (day !== "all" && s.dayPeriod !== day && s.dayPeriod !== "any") return false;
      if (weather !== "all" && s.weather !== weather && s.weather !== "any") return false;
      if (dim !== "all" && s.dimension !== dim && s.dimension !== "any") return false;
      if (rarity !== "all" && s.rarity !== rarity) return false;
      return true;
    });
  }, [biome, day, weather, dim, rarity]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Spawns Cobblemon</h1>
        <p className="text-sm text-muted-foreground">
          Trouve où, quand et par quel temps chaque Pokémon apparaît dans le monde.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-5">
        <Select value={biome} onValueChange={(v) => setBiome(v ?? "all")}>
          <SelectTrigger><SelectValue placeholder="Biome" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous biomes</SelectItem>
            {ALL_BIOMES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={day} onValueChange={(v) => setDay(v as DayPeriod | "all")}>
          <SelectTrigger><SelectValue placeholder="Moment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout moment</SelectItem>
            {DAY_PERIODS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={weather} onValueChange={(v) => setWeather(v as Weather | "all")}>
          <SelectTrigger><SelectValue placeholder="Météo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute météo</SelectItem>
            {WEATHERS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dim} onValueChange={(v) => setDim(v as Dimension | "all")}>
          <SelectTrigger><SelectValue placeholder="Dimension" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute dimension</SelectItem>
            {DIMENSIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={rarity} onValueChange={(v) => setRarity(v as Rarity | "all")}>
          <SelectTrigger><SelectValue placeholder="Rareté" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute rareté</SelectItem>
            {RARITIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pokémon</TableHead>
              <TableHead>Types</TableHead>
              <TableHead>Biomes</TableHead>
              <TableHead>Moment</TableHead>
              <TableHead>Météo</TableHead>
              <TableHead>Dimension</TableHead>
              <TableHead>Rareté</TableHead>
              <TableHead>Y</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s, i) => {
              const p = POKEMON_BY_ID[s.pokemonId];
              return (
                <TableRow key={i}>
                  <TableCell>
                    {p ? (
                      <Link href={`/pokedex/${p.id}`} className="font-medium hover:text-primary">
                        {p.name}
                      </Link>
                    ) : (
                      s.pokemonId
                    )}
                  </TableCell>
                  <TableCell>{p && <TypeBadges types={p.types} size="sm" />}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-wrap gap-1">
                      {s.biomes.map((b) => <Badge key={b} variant="secondary">{b}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{s.dayPeriod}</TableCell>
                  <TableCell className="text-xs">{s.weather}</TableCell>
                  <TableCell className="text-xs">{s.dimension}</TableCell>
                  <TableCell><Badge variant="outline">{s.rarity}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">
                    {s.minY ?? "-∞"} / {s.maxY ?? "+∞"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <p className="p-10 text-center text-muted-foreground">Aucun spawn ne correspond.</p>
        )}
      </div>
    </div>
  );
}
