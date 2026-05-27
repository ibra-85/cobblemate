import { BookOpen, Flame, MapPin, Cookie, Package } from "lucide-react";
import { POKEMON } from "@/data/pokemon";
import { MOVES } from "@/data/moves";
import { SPAWNS } from "@/data/spawns";
import { POKESNACKS } from "@/data/pokesnacks";
import { ITEMS } from "@/data/items";

/**
 * Compact horizontal strip of database counts — replaces 5 large stat
 * cards. Density-first so the dashboard breathes elsewhere.
 */
const ENTRIES = [
  { icon: BookOpen, label: "Pokémon",   value: POKEMON.length },
  { icon: Flame,    label: "Attaques",  value: MOVES.length },
  { icon: MapPin,   label: "Spawns",    value: SPAWNS.length },
  { icon: Cookie,   label: "Snacks",    value: POKESNACKS.length },
  { icon: Package,  label: "Objets",    value: ITEMS.length },
];

export function DatabaseStrip() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-5 py-3 text-sm">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Base de données locale
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {ENTRIES.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="size-3.5 text-muted-foreground" />
            <span className="font-mono font-semibold">{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
