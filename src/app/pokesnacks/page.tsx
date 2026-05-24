"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TypeBadges } from "@/components/site/type-badge";
import { POKESNACKS } from "@/data/pokesnacks";
import { POKEMON, POKEMON_BY_ID } from "@/data/pokemon";
import { TYPES_META } from "@/data/types";
import type { PokemonTypeId, Rarity } from "@/types";
import { getPokesnacksForPokemon } from "@/lib/search";

const RARITIES: Rarity[] = ["common", "uncommon", "rare", "ultra-rare", "legendary"];

export default function PokesnacksPage() {
  const [type, setType] = useState<PokemonTypeId | "all">("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [pokemonId, setPokemonId] = useState<string>("");

  const filtered = useMemo(
    () =>
      POKESNACKS.filter((s) => {
        if (type !== "all" && !s.attractsTypes.includes(type)) return false;
        if (rarity !== "all" && s.rarity !== rarity) return false;
        return true;
      }),
    [type, rarity],
  );

  const advice = pokemonId ? getPokesnacksForPokemon(pokemonId) : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">PokéSnacks</h1>
        <p className="text-sm text-muted-foreground">
          Trouve quels snacks attirent quels Pokémon — utile pour appâter une cible précise.
        </p>
      </header>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalogue</TabsTrigger>
          <TabsTrigger value="advice">Conseil par Pokémon</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={type} onValueChange={(v) => setType(v as PokemonTypeId | "all")}>
              <SelectTrigger><SelectValue placeholder="Type attiré" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                {(Object.keys(TYPES_META) as PokemonTypeId[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPES_META[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={rarity} onValueChange={(v) => setRarity(v as Rarity | "all")}>
              <SelectTrigger><SelectValue placeholder="Rareté" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes raretés</SelectItem>
                {RARITIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <Card key={s.id} className="border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {s.name}
                    <Badge variant="outline">{s.rarity}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{s.description}</p>
                  <div>
                    <p className="mb-1 text-xs uppercase text-muted-foreground">Attire les types</p>
                    <TypeBadges types={s.attractsTypes} size="sm" />
                  </div>
                  {s.attractsPokemonIds.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs uppercase text-muted-foreground">Pokémon ciblés</p>
                      <div className="flex flex-wrap gap-1">
                        {s.attractsPokemonIds.map((id) => (
                          <Link key={id} href={`/pokedex/${id}`}>
                            <Badge variant="secondary" className="hover:bg-accent">
                              {POKEMON_BY_ID[id]?.name ?? id}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {s.preferredBiomes && (
                    <div className="flex flex-wrap gap-1">
                      {s.preferredBiomes.map((b) => (
                        <Badge key={b} variant="outline">{b}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="advice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Quel PokéSnack utiliser pour trouver ce Pokémon ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={pokemonId} onValueChange={(v) => setPokemonId(v ?? "")}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Choisis un Pokémon…" />
                </SelectTrigger>
                <SelectContent>
                  {POKEMON.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {pokemonId && (
                <div className="space-y-2">
                  {advice.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun snack référencé pour ce Pokémon. Essaie un snack qui
                      attire ses types.
                    </p>
                  ) : (
                    advice.map((s) => (
                      <div key={s.id} className="rounded-md border border-border/60 p-3 text-sm">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
