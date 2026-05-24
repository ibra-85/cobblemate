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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TypeBadge } from "@/components/site/type-badge";
import { MOVES } from "@/data/moves";
import { POKEMON } from "@/data/pokemon";
import { TYPES_META } from "@/data/types";
import type { MoveCategory, PokemonTypeId } from "@/types";

const CATEGORIES: MoveCategory[] = ["physical", "special", "status"];

export default function MovesPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PokemonTypeId | "all">("all");
  const [cat, setCat] = useState<MoveCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return MOVES.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q) && !m.id.includes(q)) return false;
      if (type !== "all" && m.type !== type) return false;
      if (cat !== "all" && m.category !== cat) return false;
      return true;
    });
  }, [query, type, cat]);

  const learners = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of POKEMON) {
      for (const mid of p.notableMoves) {
        const arr = map.get(mid) ?? [];
        arr.push(p.name);
        map.set(mid, arr);
      }
    }
    return map;
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Attaques</h1>
        <p className="text-sm text-muted-foreground">
          Filtre par type ou catégorie. Les Pokémon listés sont ceux qui ont
          l&apos;attaque dans leur movepool notable.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={type} onValueChange={(v) => setType(v as PokemonTypeId | "all")}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {(Object.keys(TYPES_META) as PokemonTypeId[]).map((t) => (
              <SelectItem key={t} value={t}>{TYPES_META[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={(v) => setCat(v as MoveCategory | "all")}>
          <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Pwr</TableHead>
              <TableHead className="text-right">Prec</TableHead>
              <TableHead className="text-right">PP</TableHead>
              <TableHead>Effet</TableHead>
              <TableHead>Apprend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell><TypeBadge type={m.type} size="sm" /></TableCell>
                <TableCell><Badge variant="outline">{m.category}</Badge></TableCell>
                <TableCell className="text-right font-mono">{m.power ?? "—"}</TableCell>
                <TableCell className="text-right font-mono">{m.accuracy ?? "—"}</TableCell>
                <TableCell className="text-right font-mono">{m.pp}</TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  {m.effect ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {(learners.get(m.id) ?? []).join(", ") || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
