import { Badge } from "@/components/ui/badge";
import type { SpawnAggregate } from "@/data/spawns";
import { biomeLabel, biomesForTag } from "@/data/biomes";

interface Props {
  spawn: SpawnAggregate;
}

const TIME_LABEL: Record<string, string> = {
  any:   "Toute heure",
  day:   "Jour",
  night: "Nuit",
  dusk:  "Crépuscule",
  dawn:  "Aube",
};

const WEATHER_LABEL: Record<string, string> = {
  any:   "Toute météo",
  clear: "Beau temps",
  rain:  "Pluie",
};

const CONTEXT_LABEL: Record<string, string> = {
  grounded:  "Sol",
  submerged: "Sous l'eau",
  surface:   "Surface",
  seafloor:  "Fond marin",
  fishing:   "Pêche",
};

export function SpawnDetails({ spawn }: Props) {
  const cobblemonBiomes = spawn.biomes.filter((b) => /(^|\/)is_/.test(b) && !b.includes(":"));
  const otherBiomes = spawn.biomes.filter((b) => !cobblemonBiomes.includes(b));

  return (
    <>
      <Row label="Rareté">
        {spawn.rarities.map((r) => (
          <Badge key={r} variant="secondary">{r}</Badge>
        ))}
      </Row>

      <Row label="Heure">
        {spawn.times.map((t) => (
          <Badge key={t} variant="outline">{TIME_LABEL[t] ?? t}</Badge>
        ))}
      </Row>

      <Row label="Météo">
        {spawn.weathers.map((w) => (
          <Badge key={w} variant="outline">{WEATHER_LABEL[w] ?? w}</Badge>
        ))}
      </Row>

      <Row label="Contexte">
        {spawn.contexts.map((c) => (
          <Badge key={c} variant="outline">{CONTEXT_LABEL[c] ?? c}</Badge>
        ))}
      </Row>

      {spawn.levelRange && (
        <Row label="Niveau">
          <Badge variant="outline" className="font-mono">
            {spawn.levelRange[0]} – {spawn.levelRange[1]}
          </Badge>
        </Row>
      )}

      {cobblemonBiomes.length > 0 && (
        <Section label="Biomes">
          <div className="flex flex-wrap gap-1.5">
            {cobblemonBiomes.map((b) => {
              const resolved = biomesForTag(b);
              return (
                <Badge
                  key={b}
                  variant="secondary"
                  title={resolved.length > 0 ? `Inclut : ${resolved.join(", ")}` : undefined}
                >
                  {biomeLabel(b)}
                </Badge>
              );
            })}
          </div>
        </Section>
      )}

      {otherBiomes.length > 0 && (
        <Section label="Biomes (spécifiques)">
          <div className="flex flex-wrap gap-1.5">
            {otherBiomes.map((b) => (
              <Badge key={b} variant="outline" className="font-mono text-[10px]">
                {biomeLabel(b)}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {spawn.excludedBiomes.length > 0 && (
        <Section label="Biomes exclus">
          <div className="flex flex-wrap gap-1.5">
            {spawn.excludedBiomes.map((b) => (
              <Badge key={b} variant="destructive" className="opacity-70">
                {biomeLabel(b)}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {spawn.structures.length > 0 && (
        <Section label="Structures">
          <div className="flex flex-wrap gap-1.5">
            {spawn.structures.map((s) => (
              <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                {s.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {(spawn.keyItems.length > 0 || spawn.itemRequirements.length > 0) && (
        <Section label="Conditions spéciales">
          <div className="flex flex-col gap-1.5">
            {spawn.keyItems.map((k) => (
              <div key={k} className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-xs">
                Objet-clé requis : <span className="font-mono">{k}</span>
              </div>
            ))}
            {spawn.itemRequirements.map((req) => (
              <div key={req.id} className="rounded-md border px-2 py-1 text-xs">
                Demande {req.count}× <span className="font-mono">{req.id}</span>
                {req.consume && " (consommé)"}
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="min-w-20 text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
