import {
  Swords,
  Shield,
  ShieldHalf,
  Heart,
  Workflow,
  RefreshCcw,
  Bomb,
  Crosshair,
  Sparkle,
  Flame,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import type { PokemonRole } from "@/types";

export interface RoleMeta {
  id: PokemonRole;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const ROLE_META: Record<PokemonRole, RoleMeta> = {
  "physical-sweeper": {
    id: "physical-sweeper",
    label: "Sweeper physique",
    description: "Inflige de gros dégâts avec ses attaques physiques.",
    icon: Swords,
  },
  "special-sweeper": {
    id: "special-sweeper",
    label: "Sweeper spécial",
    description: "Casse les équipes adverses via l'Attaque Spéciale.",
    icon: Flame,
  },
  "physical-wall": {
    id: "physical-wall",
    label: "Mur physique",
    description: "Encaisse les coups physiques sans broncher.",
    icon: Shield,
  },
  "special-wall": {
    id: "special-wall",
    label: "Mur spécial",
    description: "Résiste aux attaques spéciales.",
    icon: ShieldHalf,
  },
  "mixed-wall": {
    id: "mixed-wall",
    label: "Mur mixte",
    description: "Encaisse les deux types de dégâts.",
    icon: Heart,
  },
  support: {
    id: "support",
    label: "Support",
    description: "Soigne, buffe ou rend ses alliés plus dangereux.",
    icon: Sparkle,
  },
  "hazard-setter": {
    id: "hazard-setter",
    label: "Poseur de pièges",
    description: "Place Picots, Piège de roc et autres entry hazards.",
    icon: Bomb,
  },
  pivot: {
    id: "pivot",
    label: "Pivot",
    description: "Switch en sécurité et garde l'élan.",
    icon: RefreshCcw,
  },
  "revenge-killer": {
    id: "revenge-killer",
    label: "Revenge killer",
    description: "Vient finir un sweeper adverse affaibli.",
    icon: Crosshair,
  },
  lead: {
    id: "lead",
    label: "Lead",
    description: "Pokémon d'ouverture, prépare le terrain.",
    icon: Hourglass,
  },
  wallbreaker: {
    id: "wallbreaker",
    label: "Wallbreaker",
    description: "Casse les murs adverses à coups d'attaques boostées.",
    icon: Workflow,
  },
};

export const ALL_ROLES = Object.keys(ROLE_META) as PokemonRole[];
