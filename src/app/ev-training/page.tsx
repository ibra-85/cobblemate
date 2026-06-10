import type { Metadata } from "next";
import { EvGuide } from "@/features/ev/ev-guide";

export const metadata: Metadata = {
  title: "Farm d'EV — CobbleMate",
  description:
    "Guide d'entraînement des EVs pour Cobblemon : choisis une stat et vois quels Pokémon sauvages K.O., où les trouver, et les objets Pouvoir qui accélèrent le farm.",
};

/**
 * `/ev-training` — EV farming planner. Crosses the mod's per-species
 * EV yields with the spawn dataset: pick a stat, get the wild mons
 * worth K.O.-ing ranked by yield / rarity / reachability.
 */
export default function EvTrainingPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Farm d&apos;EV
        </h1>
        <p className="text-sm text-muted-foreground">
          Chaque K.O. donne des EVs : 4 EVs = +1 point de stat au niveau 100,
          plafonnés à 252 par stat et 510 au total. Choisis la stat à monter
          pour voir les meilleures cibles sauvages et où elles spawnent.
        </p>
      </header>

      <EvGuide />
    </div>
  );
}
