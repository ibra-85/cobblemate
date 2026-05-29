import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSpeciesExtras } from "@/data/species-extras";

interface Props {
  pokemonId: string;
}

const STAT_LABEL: Record<string, string> = {
  hp:              "PV",
  attack:          "Atk",
  defence:         "Déf",
  special_attack:  "Atk. Spé",
  special_defence: "Déf. Spé",
  speed:           "Vit",
};

const LABEL_BADGE: Record<string, string> = {
  legendary:   "Légendaire",
  mythical:    "Mythique",
  paradox:     "Paradoxe",
  ultra_beast: "Ultra-Chimère",
};

const EXP_GROUP_LABEL: Record<string, string> = {
  erratic:       "Erratique",
  fast:          "Rapide",
  medium_fast:   "Moyen-rapide",
  medium_slow:   "Moyen-lent",
  slow:          "Lent",
  fluctuating:   "Fluctuant",
};

/**
 * Renders Cobblemon-specific species data (drops, EV yield, breeding,
 * catch rate, …) sourced from the official mod. Hidden if no extras are
 * available for this Pokémon.
 */
export function SpeciesExtrasCard({ pokemonId }: Props) {
  const x = getSpeciesExtras(pokemonId);
  if (!x) return null;

  const evNonZero = x.evYield
    ? Object.entries(x.evYield).filter(([, v]) => v > 0)
    : [];
  const specialLabels = (x.labels ?? []).filter((l) => LABEL_BADGE[l]);

  return (
    <Card>
      <CardContent className="grid gap-4 text-sm md:grid-cols-2">
        {specialLabels.length > 0 && (
          <div className="md:col-span-2 flex flex-wrap gap-2">
            {specialLabels.map((l) => (
              <Badge key={l} variant="default">{LABEL_BADGE[l]}</Badge>
            ))}
          </div>
        )}

        {evNonZero.length > 0 && (
          <Block label="EVs distribués">
            <div className="flex flex-wrap gap-1.5">
              {evNonZero.map(([k, v]) => (
                <Badge key={k} variant="secondary" className="font-mono">
                  +{v} {STAT_LABEL[k] ?? k}
                </Badge>
              ))}
            </div>
          </Block>
        )}

        {x.catchRate != null && (
          <Block label="Taux de capture">
            <span className="font-mono">{x.catchRate} / 255</span>
          </Block>
        )}

        {x.experienceGroup && (
          <Block label="Courbe d'XP">
            <span>{EXP_GROUP_LABEL[x.experienceGroup] ?? x.experienceGroup}</span>
          </Block>
        )}

        {x.baseExperienceYield != null && (
          <Block label="XP de base">
            <span className="font-mono">{x.baseExperienceYield}</span>
          </Block>
        )}

        {x.baseFriendship != null && (
          <Block label="Bonheur de base">
            <span className="font-mono">{x.baseFriendship}</span>
          </Block>
        )}

        {x.eggGroups && x.eggGroups.length > 0 && (
          <Block label="Groupes d'œuf">
            <div className="flex flex-wrap gap-1.5">
              {x.eggGroups.map((g) => (
                <Badge key={g} variant="outline" className="capitalize">
                  {g.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </Block>
        )}

        {x.eggCycles != null && (
          <Block label="Cycles d'œuf">
            <span className="font-mono">{x.eggCycles}</span>
          </Block>
        )}

        {(x.height != null || x.weight != null) && (
          <Block label="Taille / poids">
            <span className="font-mono text-xs">
              {x.height != null && `${(x.height / 10).toFixed(1)} m`}
              {x.height != null && x.weight != null && " · "}
              {x.weight != null && `${(x.weight / 10).toFixed(1)} kg`}
            </span>
          </Block>
        )}

        {x.drops && x.drops.entries.length > 0 && (
          <Block label="Drops" wide>
            <p className="mb-1 text-[11px] text-muted-foreground">
              jusqu&apos;à {x.drops.amount} item(s) par K.O.
            </p>
            <div className="flex flex-col gap-1">
              {x.drops.entries.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border px-2 py-1 text-xs"
                >
                  <span className="font-mono">{d.item}</span>
                  <span className="text-muted-foreground">
                    {d.percentage != null && `${d.percentage}%`}
                    {d.percentage != null && d.quantityRange ? " · " : ""}
                    {d.quantityRange && `×${d.quantityRange}`}
                  </span>
                </div>
              ))}
            </div>
          </Block>
        )}
      </CardContent>
    </Card>
  );
}

function Block({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
