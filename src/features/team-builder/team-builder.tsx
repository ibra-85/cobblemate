"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { TypeBadges } from "@/components/site/type-badge";
import { PokemonSprite } from "@/components/site/pokemon-sprite";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { useSavedTeams } from "@/hooks/use-saved-teams";
import type { TeamSlot } from "@/types";
import { analyzeTeam, resolveTeam } from "@/lib/team-analysis";
import { PokemonPicker } from "./pokemon-picker";
import { TeamAnalysisPanel } from "./team-analysis-panel";
import { toast } from "sonner";

const EMPTY = (): TeamSlot[] => Array.from({ length: 6 }, () => ({ pokemonId: null }));

export function TeamBuilder() {
  const { teams, hydrated, create, update, remove } = useSavedTeams();
  const [slots, setSlots] = useState<TeamSlot[]>(EMPTY());
  const [name, setName] = useState("Équipe sans titre");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) return;
    const t = teams.find((x) => x.id === editingId);
    if (t) {
      setSlots(t.slots);
      setName(t.name);
    }
  }, [editingId, teams]);

  const team = resolveTeam(slots);
  const analysis = useMemo(() => analyzeTeam(team), [team]);
  const teamIds = slots.map((s) => s.pokemonId).filter(Boolean) as string[];

  function setSlot(index: number, pokemonId: string | null) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, pokemonId } : s)));
  }

  function saveCurrent() {
    if (editingId) {
      update(editingId, { name, slots });
      toast.success(`Équipe « ${name} » mise à jour.`);
    } else {
      const t = create(name, slots);
      setEditingId(t.id);
      toast.success(`Équipe « ${name} » sauvegardée.`);
    }
  }

  function newTeam() {
    setEditingId(null);
    setSlots(EMPTY());
    setName("Équipe sans titre");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={saveCurrent}>
            <Save data-icon="inline-start" />
            {editingId ? "Mettre à jour" : "Sauvegarder"}
          </Button>
          <Button variant="outline" onClick={newTeam}>
            Nouvelle équipe
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((slot, i) => {
            const p = slot.pokemonId ? POKEMON_BY_ID[slot.pokemonId] : null;
            if (!p) {
              return (
                <PokemonPicker
                  key={i}
                  onPick={(id) => setSlot(i, id)}
                  excludeIds={teamIds}
                />
              );
            }
            return (
              <Card key={i} className="relative">
                <button
                  type="button"
                  onClick={() => setSlot(i, null)}
                  className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-background text-muted-foreground hover:text-destructive"
                  aria-label="Retirer"
                >
                  <X className="size-3" />
                </button>
                <CardContent className="flex flex-col items-center gap-2 text-center">
                  <PokemonSprite pokemon={p} size="size-16" />
                  <div className="flex flex-col gap-0.5">
                    <p className="font-mono text-[10px] text-muted-foreground">
                      #{p.dexNumber}
                    </p>
                    <p className="text-sm font-semibold">{p.name}</p>
                  </div>
                  <TypeBadges types={p.types} size="sm" />
                  <p className="text-[10px] text-muted-foreground">
                    {p.roles.slice(0, 2).join(", ")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {hydrated && teams.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm font-semibold">Équipes sauvegardées</p>
              <div className="flex flex-col gap-1">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setEditingId(t.id)}
                      className="flex flex-col items-start text-left hover:text-foreground"
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.slots.filter((s) => s.pokemonId).length}/6 ·{" "}
                        {new Date(t.updatedAt).toLocaleString()}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        remove(t.id);
                        if (editingId === t.id) newTeam();
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <TeamAnalysisPanel analysis={analysis} />
    </div>
  );
}
