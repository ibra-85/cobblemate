"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON_BY_ID } from "@/data/pokemon";
import type { MoveLearners } from "@/data/move-learners";

type MethodKey = keyof MoveLearners;

const METHOD_META: Record<MethodKey, { label: string; hint: string }> = {
  level:   { label: "Niveau",    hint: "Apprise en montant de niveau" },
  tm:      { label: "CT/CS",     hint: "Apprise via une Capsule Technique" },
  egg:     { label: "Œuf",       hint: "Héritée par reproduction" },
  tutor:   { label: "Tuteur",    hint: "Enseignée par un PNJ" },
  legacy:  { label: "Legacy",    hint: "Disponible dans une ancienne génération" },
  special: { label: "Événement", hint: "Distribution spéciale" },
};

const METHOD_ORDER: MethodKey[] = ["level", "tm", "egg", "tutor", "legacy", "special"];

/**
 * Client-side learners panel — tabs per learning method + search
 * filter on Pokémon name within the active tab. Lives as a client
 * component so the page route can stay server-rendered.
 */
export function LearnersPanel({ learners }: { learners: MoveLearners }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // Surface only the methods that have entries, in the canonical order.
  const tabs = useMemo(
    () =>
      METHOD_ORDER.filter((k) => learners[k].length > 0).map((k) => ({
        key: k,
        meta: METHOD_META[k],
        items: learners[k],
      })),
    [learners],
  );

  // Pre-resolve each entry to its Pokémon so the search filter can
  // match against the localised name, not just the id slug.
  const resolved = useMemo(() => {
    const map: Record<MethodKey, { id: string; level?: number; name: string }[]> = {
      level: [], tm: [], egg: [], tutor: [], legacy: [], special: [],
    };
    for (const k of METHOD_ORDER) {
      for (const entry of learners[k]) {
        const id = typeof entry === "string" ? entry : entry.id;
        const lvl = typeof entry === "string" ? undefined : entry.level;
        const p = POKEMON_BY_ID[id];
        map[k].push({ id, level: lvl, name: p?.name ?? id });
      }
    }
    return map;
  }, [learners]);

  if (tabs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aucun Pokémon ne l&apos;apprend</CardTitle>
          <CardDescription>
            Cette attaque n&apos;est pas dans la learnset Cobblemon de la version
            actuelle.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const filter = (list: typeof resolved[MethodKey]) =>
    q ? list.filter((e) => e.name.toLowerCase().includes(q)) : list;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            Pokémon qui l&apos;apprennent
            <Badge variant="secondary" className="font-mono text-[10px]">
              {tabs.reduce((acc, t) => acc + t.items.length, 0)}
            </Badge>
          </span>
          <InputGroup className="w-full sm:max-w-xs">
            <InputGroupAddon>
              <Search className="size-4 opacity-60" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Filtrer par nom…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={tabs[0].key}>
          <TabsList className="flex-wrap">
            {tabs.map((t) => {
              const filtered = filter(resolved[t.key]);
              return (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.meta.label}
                  <span className="ml-1.5 font-mono text-[10px] opacity-70">
                    {filtered.length}
                    {q && filtered.length !== t.items.length && (
                      <span className="opacity-60">/{t.items.length}</span>
                    )}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((t) => {
            const filtered = filter(resolved[t.key]);
            return (
              <TabsContent key={t.key} value={t.key} className="mt-4 flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">{t.meta.hint}</p>
                {filtered.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Aucun Pokémon ne correspond à « {query} ».
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filtered.map(({ id, level }) => (
                      <LearnerChip key={`${id}-${level ?? ""}`} id={id} level={level} />
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function LearnerChip({ id, level }: { id: string; level?: number }) {
  const p = POKEMON_BY_ID[id];
  if (!p) {
    return (
      <span className="rounded-md border bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground">
        {id}
      </span>
    );
  }
  return (
    <Link
      href={`/pokedex/${id}`}
      className="group flex items-center gap-2 rounded-md border bg-card p-2 transition-colors hover:bg-accent/40"
    >
      <div className="size-10 shrink-0">
        <PokemonSprite pokemon={p} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{p.name}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {level != null ? `Niv. ${level}` : `#${p.dexNumber}`}
        </span>
      </div>
    </Link>
  );
}
