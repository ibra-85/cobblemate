import type { PokemonTypeId } from "@/types";

export interface TypeMeta {
  id: PokemonTypeId;
  label: string;
  /** Tailwind-friendly hex color. Used for badges and bars. */
  color: string;
  /** Foreground color (white/black) for readable text on `color`. */
  fg: string;
}

export const TYPES_META: Record<PokemonTypeId, TypeMeta> = {
  normal:   { id: "normal",   label: "Normal",   color: "#A8A77A", fg: "#1a1a1a" },
  fire:     { id: "fire",     label: "Feu",      color: "#EE8130", fg: "#1a1a1a" },
  water:    { id: "water",    label: "Eau",      color: "#6390F0", fg: "#ffffff" },
  electric: { id: "electric", label: "Électrik", color: "#F7D02C", fg: "#1a1a1a" },
  grass:    { id: "grass",    label: "Plante",   color: "#7AC74C", fg: "#1a1a1a" },
  ice:      { id: "ice",      label: "Glace",    color: "#96D9D6", fg: "#1a1a1a" },
  fighting: { id: "fighting", label: "Combat",   color: "#C22E28", fg: "#ffffff" },
  poison:   { id: "poison",   label: "Poison",   color: "#A33EA1", fg: "#ffffff" },
  ground:   { id: "ground",   label: "Sol",      color: "#E2BF65", fg: "#1a1a1a" },
  flying:   { id: "flying",   label: "Vol",      color: "#A98FF3", fg: "#1a1a1a" },
  psychic:  { id: "psychic",  label: "Psy",      color: "#F95587", fg: "#1a1a1a" },
  bug:      { id: "bug",      label: "Insecte",  color: "#A6B91A", fg: "#1a1a1a" },
  rock:     { id: "rock",     label: "Roche",    color: "#B6A136", fg: "#1a1a1a" },
  ghost:    { id: "ghost",    label: "Spectre",  color: "#735797", fg: "#ffffff" },
  dragon:   { id: "dragon",   label: "Dragon",   color: "#6F35FC", fg: "#ffffff" },
  dark:     { id: "dark",     label: "Ténèbres", color: "#705746", fg: "#ffffff" },
  steel:    { id: "steel",    label: "Acier",    color: "#B7B7CE", fg: "#1a1a1a" },
  fairy:    { id: "fairy",    label: "Fée",      color: "#D685AD", fg: "#1a1a1a" },
};
