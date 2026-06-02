/**
 * Pokémon nature data — canonical EN form (matches Smogon's dump and
 * the `TeamSlot.nature` storage) paired with the official Pokémon
 * Company French localisation, plus the ±10% stat effect.
 *
 * Single source of truth used by:
 *  - the slot config dialog's nature picker (display + search)
 *  - the slot card footer (display in FR when a nature is set)
 *  - any future tooltip / strategy inference that wants to surface
 *    the effect
 *
 * Order = alphabetical by FR label so the picker scans naturally
 * for a French speaker.
 */

export type NatureStat = "atk" | "def" | "spa" | "spd" | "spe";

export interface NatureEntry {
  /** Canonical English name — Smogon / app storage form. */
  en: string;
  /** Official French label — display form. */
  fr: string;
  /** Stat the nature boosts by +10%. `null` on neutral natures. */
  boost: NatureStat | null;
  /** Stat the nature drops by -10%. `null` on neutral natures. */
  drop: NatureStat | null;
}

export const NATURES: NatureEntry[] = [
  { en: "Hardy",   fr: "Hardi",    boost: null,  drop: null  },
  { en: "Bold",    fr: "Assuré",   boost: "def", drop: "atk" },
  { en: "Quirky",  fr: "Bizarre",  boost: null,  drop: null  },
  { en: "Brave",   fr: "Brave",    boost: "atk", drop: "spe" },
  { en: "Calm",    fr: "Calme",    boost: "spd", drop: "atk" },
  { en: "Quiet",   fr: "Discret",  boost: "spa", drop: "spe" },
  { en: "Docile",  fr: "Docile",   boost: null,  drop: null  },
  { en: "Rash",    fr: "Foufou",   boost: "spa", drop: "spd" },
  { en: "Gentle",  fr: "Gentil",   boost: "spd", drop: "def" },
  { en: "Jolly",   fr: "Jovial",   boost: "spe", drop: "spa" },
  { en: "Lax",     fr: "Lâche",    boost: "def", drop: "spd" },
  { en: "Impish",  fr: "Malin",    boost: "def", drop: "spa" },
  { en: "Sassy",   fr: "Malpoli",  boost: "spd", drop: "spe" },
  { en: "Naughty", fr: "Mauvais",  boost: "atk", drop: "spd" },
  { en: "Mild",    fr: "Modéré",   boost: "spa", drop: "def" },
  { en: "Modest",  fr: "Modeste",  boost: "spa", drop: "atk" },
  { en: "Naive",   fr: "Naïf",     boost: "spe", drop: "spd" },
  { en: "Hasty",   fr: "Pressé",   boost: "spe", drop: "def" },
  { en: "Careful", fr: "Prudent",  boost: "spd", drop: "spa" },
  { en: "Bashful", fr: "Pudique",  boost: null,  drop: null  },
  { en: "Relaxed", fr: "Relax",    boost: "def", drop: "spe" },
  { en: "Adamant", fr: "Rigide",   boost: "atk", drop: "spa" },
  { en: "Serious", fr: "Sérieux",  boost: null,  drop: null  },
  { en: "Lonely",  fr: "Solo",     boost: "atk", drop: "def" },
  { en: "Timid",   fr: "Timide",   boost: "spe", drop: "atk" },
];

const NATURE_BY_EN = new Map(NATURES.map((n) => [n.en, n]));

/** Short FR label per stat — matches the EV editor headers. */
export const NATURE_STAT_SHORT: Record<NatureStat, string> = {
  atk: "Atk",
  def: "Déf",
  spa: "AtS",
  spd: "DéS",
  spe: "Vit",
};

/**
 * Resolve a stored EN nature name to its French display label. Falls
 * back to the input string for unknown values so legacy or
 * misspelled saves don't render as blank.
 */
export function natureLabelFr(en: string | undefined): string {
  if (!en) return "";
  return NATURE_BY_EN.get(en)?.fr ?? en;
}

/** Lookup the full entry by EN name — `null` for unknown values. */
export function findNature(en: string | undefined): NatureEntry | null {
  if (!en) return null;
  return NATURE_BY_EN.get(en) ?? null;
}

/** "+ Atk · − AtS" or "Neutre" for natures without effect. */
export function natureEffectFr(n: Pick<NatureEntry, "boost" | "drop">): string {
  if (!n.boost || !n.drop) return "Neutre";
  return `+ ${NATURE_STAT_SHORT[n.boost]} · − ${NATURE_STAT_SHORT[n.drop]}`;
}
