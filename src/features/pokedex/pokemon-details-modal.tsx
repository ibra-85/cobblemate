"use client";

import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TypeBadges } from "@/components/site/type-badge";
import { getSpeciesExtras } from "@/data/species-extras";
import { MinecraftSlot, itemMeta } from "@/components/site/minecraft-item";
import type { Pokemon } from "@/types";

const STAT_LABEL: Record<string, string> = {
  hp:              "PV",
  attack:          "Atk",
  defence:         "Déf",
  special_attack:  "Atk. Spé",
  special_defence: "Déf. Spé",
  speed:           "Vit",
};

const EXP_GROUP_LABEL: Record<string, string> = {
  erratic:     "Erratique",
  fast:        "Rapide",
  medium_fast: "Moyen-rapide",
  medium_slow: "Moyen-lent",
  slow:        "Lent",
  fluctuating: "Fluctuant",
};

interface Props {
  pokemon: Pokemon;
  /** Render trigger as an icon-only button (for tight identity rows). */
  iconOnly?: boolean;
}

/**
 * "Détails du Pokémon" — all the technical Cobblemon data behind a
 * single dialog, so the main page stays focused. Triggered by the
 * compact button in the header.
 */
export function PokemonDetailsModal({ pokemon, iconOnly = false }: Props) {
  const x = getSpeciesExtras(pokemon.id);

  return (
    <Dialog>
      <DialogTrigger
        render={
          iconOnly ? (
            <Button variant="outline" size="icon" title="Détails du Pokémon">
              <Info />
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5">
              <Info className="size-3.5" />
              Détails du Pokémon
            </Button>
          )
        }
      />
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pokemon.name} · détails complets</DialogTitle>
          <DialogDescription>
            Données techniques Cobblemon : forme, élevage, capture, drops.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-1">
          {/* Identity */}
          <Block label="Identité">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-muted-foreground">
                #{pokemon.dexNumber.toString().padStart(4, "0")}
              </span>
              <span className="font-medium">{pokemon.name}</span>
              <Badge variant="secondary">Gen {pokemon.generation}</Badge>
              <TypeBadges types={pokemon.types} size="sm" />
            </div>
          </Block>

          {/* Talents */}
          <Block label="Talents">
            <div className="flex flex-wrap gap-1.5 text-sm">
              {pokemon.abilities.map((a) => (
                <Badge key={a} variant="outline">{a}</Badge>
              ))}
              {pokemon.hiddenAbility && (
                <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
                  {pokemon.hiddenAbility} (caché)
                </Badge>
              )}
            </div>
          </Block>

          {(x?.height != null || x?.weight != null) && (
            <Block label="Forme">
              <span className="font-mono text-sm">
                {x.height != null && `${(x.height / 10).toFixed(1)} m`}
                {x.height != null && x.weight != null && " · "}
                {x.weight != null && `${(x.weight / 10).toFixed(1)} kg`}
              </span>
            </Block>
          )}

          {/* Capture */}
          {x?.catchRate != null && (
            <Block label="Capture">
              <CatchRateBar value={x.catchRate} />
            </Block>
          )}

          {/* EVs */}
          {x?.evYield && (
            <Block label="EVs donnés">
              <div className="flex flex-wrap gap-1.5 text-sm">
                {Object.entries(x.evYield)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="font-mono">
                      +{v} {STAT_LABEL[k] ?? k}
                    </Badge>
                  ))}
              </div>
            </Block>
          )}

          {/* Breeding */}
          <div className="grid gap-4 sm:grid-cols-2">
            {x?.experienceGroup && (
              <Block label="Courbe d'XP">
                <span className="text-sm">
                  {EXP_GROUP_LABEL[x.experienceGroup] ?? x.experienceGroup}
                </span>
              </Block>
            )}
            {x?.baseExperienceYield != null && (
              <Block label="XP de base">
                <span className="font-mono text-sm">{x.baseExperienceYield}</span>
              </Block>
            )}
            {x?.baseFriendship != null && (
              <Block label="Bonheur de base">
                <span className="font-mono text-sm">{x.baseFriendship}</span>
              </Block>
            )}
            {x?.eggCycles != null && (
              <Block label="Cycles d'œuf">
                <span className="font-mono text-sm">{x.eggCycles}</span>
              </Block>
            )}
          </div>

          {x?.eggGroups && x.eggGroups.length > 0 && (
            <Block label="Groupes d'œuf">
              <div className="flex flex-wrap gap-1.5 text-sm">
                {x.eggGroups.map((g) => (
                  <Badge key={g} variant="outline" className="capitalize">
                    {g.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </Block>
          )}

          {/* Drops — Minecraft-style row of slots */}
          {x?.drops && x.drops.entries.length > 0 && (
            <Block label={`Drops (max ${x.drops.amount} par K.O.)`}>
              <div className="flex flex-col gap-1.5">
                {x.drops.entries.map((d, i) => {
                  const meta = itemMeta(d.item);
                  return (
                    <div
                      key={`${d.item}-${i}`}
                      className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                    >
                      <MinecraftSlot item={d.item} size="size-8" />
                      <span className="font-medium">{meta.label}</span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {d.percentage != null && `${d.percentage}%`}
                        {d.percentage != null && d.quantityRange ? " · " : ""}
                        {d.quantityRange && `×${d.quantityRange}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Block>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div>{children}</div>
    </section>
  );
}

function CatchRateBar({ value }: { value: number }) {
  const pct = Math.round((value / 255) * 100);
  const tone =
    value >= 200 ? "bg-emerald-500" :
    value >= 100 ? "bg-amber-500" :
    value >= 45  ? "bg-orange-500" :
                   "bg-red-500";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-mono">{value} / 255</span>
        <span className="text-xs text-muted-foreground">
          {value >= 200 ? "Très facile" :
           value >= 100 ? "Facile" :
           value >= 45  ? "Standard" :
                          "Difficile"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
