/**
 * Helpers for displaying Pokémon names with their form/variant
 * suffix.
 *
 * The Cobblemon dex stores forms as distinct ids (`slowpoke` vs
 * `slowpoke_galar`) but the `name` field is the species' base
 * French name and doesn't disambiguate. Without a suffix, both
 * Ramoloss entries display the same string in lists and evolution
 * cards, which is confusing.
 *
 *   formLabel("slowpoke_galar")  → "Galar"
 *   formLabel("rotom_wash")      → "Eau"
 *   formLabel("slowpoke")        → null         (base form, no suffix)
 *
 *   displayName({ id: "slowpoke_galar", name: "Ramoloss" })
 *     → "Ramoloss (Galar)"
 *
 * We translate every form key we've actually seen in the Academy
 * dump (`scripts/fetch-academy-dex.mjs`) — anything not on this list
 * falls back to a humanised slug rather than throwing it away.
 */

const FORM_FR: Record<string, string> = {
  // ─── Regional variants ─────────────────────────────────────────
  alola:   "Alola",
  galar:   "Galar",
  hisui:   "Hisui",
  paldea:  "Paldea",

  // ─── Rotom appliances ──────────────────────────────────────────
  wash:    "Eau",
  heat:    "Feu",
  frost:   "Glace",
  fan:     "Vent",
  mow:     "Tonte",

  // ─── Deoxys ────────────────────────────────────────────────────
  attack:  "Attaque",
  defense: "Défense",
  speed:   "Vitesse",

  // ─── Giratina / Tornadus / Thundurus / Landorus / Enamorus ────
  origin:    "Origine",
  altered:   "Alternative",
  therian:   "Avatar",
  incarnate: "Incarnation",

  // ─── Shaymin ────────────────────────────────────────────────────
  sky:  "Céleste",
  land: "Terrestre",

  // ─── Kyurem / Necrozma ────────────────────────────────────────
  white:    "Blanc",
  black:    "Noir",
  ultra:    "Ultra",
  dusk:     "Crépuscule",
  dawn:     "Aurore",
  midday:   "Midi",
  midnight: "Minuit",

  // ─── Kyogre / Groudon ─────────────────────────────────────────
  primal: "Primal",

  // ─── Castform / Cherrim ───────────────────────────────────────
  sunny:    "Soleil",
  rainy:    "Pluie",
  snowy:    "Neige",

  // ─── Wormadam / Burmy ─────────────────────────────────────────
  sandy: "Sable",
  trash: "Déchets",

  // ─── Keldeo / Meloetta / Pirouette / Hoopa / Wishiwashi ───────
  pirouette: "Sirène",
  aria:      "Chant",
  super:     "Banc",

  // ─── Ash-Greninja / Mega / Gigantamax / Eternamax ─────────────
  ash:       "Ash",
  mega:      "Méga",
  gmax:      "Gigamax",
  eternamax: "Éternamax",
  crowned:   "Roi",

  // ─── Oricorio ──────────────────────────────────────────────────
  pom_pom: "Pom-Pom",
  sensu:   "Sensu",

  // ─── Ogerpon (masks) ───────────────────────────────────────────
  teal:        "Sarcelle",
  wellspring:  "Source",
  hearthflame: "Foyer",
  cornerstone: "Pierre",

  // ─── Zygarde ───────────────────────────────────────────────────
  "10":     "10 %",
  "50":     "50 %",
  complete: "Parfait",

  // ─── Size variants (Gourgeist / Pumpkaboo) ───────────────────
  small: "Petit",
  large: "Grand",
};

/** Underscore-snake → Title Case. */
function humanize(slug: string): string {
  return slug
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Pull the form suffix off a Pokémon id and translate it to French.
 * Returns `null` for base-form ids (no underscore = the species'
 * default form).
 */
export function formLabel(id: string): string | null {
  const idx = id.indexOf("_");
  if (idx < 0) return null;
  const suffix = id.slice(idx + 1);
  return FORM_FR[suffix] ?? humanize(suffix);
}

/**
 * "Ramoloss (Galar)" — the canonical display name for a Pokémon
 * entry, with the form suffix appended in parentheses when the id
 * encodes one.
 */
export function displayName(p: { id: string; name: string }): string {
  const form = formLabel(p.id);
  return form ? `${p.name} (${form})` : p.name;
}

/**
 * Best-effort English (PokéAPI / Cobblemon) name for a Pokémon —
 * derived from the id since the generated dump only carries the
 * French name. Cobblemon ids are the lowercased English species
 * name with an optional `_<form>` suffix, so titlecasing the
 * species part is good enough for display.
 *
 *   englishName({ id: "slowpoke_galar" })   → "Slowpoke"
 *   englishName({ id: "tapu_koko" })        → "Tapu Koko"
 *   englishName({ id: "mr_mime" })          → "Mr Mime"
 */
export function englishName(p: { id: string }): string {
  // Strip the known form suffixes first — they're handled by
  // `formLabel` and shouldn't leak into the English species name.
  let base = p.id;
  const idx = base.indexOf("_");
  if (idx >= 0) {
    const suffix = base.slice(idx + 1);
    if (FORM_FR[suffix] !== undefined) {
      base = base.slice(0, idx);
    }
  }
  return base
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * "Ramoloss (Slowpoke)" — French primary name with the English name
 * in parentheses. When the Pokémon also has a form variant we keep
 * the form on the French side: "Ramoloss · Galar (Slowpoke)".
 */
export function displayNameWithEnglish(p: { id: string; name: string }): {
  primary: string;
  english: string | null;
} {
  const form = formLabel(p.id);
  const primary = form ? `${p.name} · ${form}` : p.name;
  const en = englishName(p);
  return {
    primary,
    english: en && en.toLowerCase() !== p.name.toLowerCase() ? en : null,
  };
}
