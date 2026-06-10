/**
 * Team share / import codec.
 *
 * Two surface formats, one in-memory representation:
 *
 *   - **`CBM1:<base64url>`** — the compact share code. Short enough to
 *     paste into Discord / Twitter without line wrapping, opaque
 *     enough to read as "a code" rather than "a JSON blob" the user
 *     might try to hand-edit. `CBM` = CobbleMate, `1` = format
 *     version so a future `CBM2:` can carry tera type, EVs spread
 *     conventions, etc. without breaking existing codes.
 *   - **JSON** — kept as the power-user / debug fallback. Same shape
 *     as the decoded `CBM1:` payload, just rendered as pretty-printed
 *     text instead of base64url-encoded.
 *
 * Both formats round-trip through {@link TeamExport}, which is the
 * shared validated representation. Import detects the format from the
 * leading characters (`CBM1:` vs `{`) so callers never have to ask
 * the user which form they pasted.
 *
 * Storage shape note: we only persist *filled* slots in the export.
 * The 6-slot grid is reconstructed by the importer by padding with
 * empty slots — this keeps the compact code as short as possible
 * (a 2-mon team exports as ~80 chars vs ~200 if we wrote all 6
 * placeholders).
 */

import type { TeamSlot } from "@/types";

/** Current format version. Bump when the payload shape changes. */
export const TEAM_EXPORT_VERSION = 2;

/** Prefixes that mark a compact code. The encoder always emits CBM2;
 *  CBM1 is kept on the decode side for backward compat with codes
 *  shipped before the positional layout. {@link isTeamCode} accepts
 *  either. */
export const TEAM_CODE_PREFIXES = ["CBM2:", "CBM1:"] as const;
export const TEAM_CODE_PREFIX = TEAM_CODE_PREFIXES[0];

/**
 * Validated team export — the shape both wire formats round-trip
 * through. `slots` holds only filled positions; the importer pads
 * the empty tail when reconstructing a 6-slot grid.
 */
export interface TeamExport {
  version: number;
  name: string;
  slots: TeamExportSlot[];
}

export interface TeamExportSlot {
  pokemonId: string;
  nickname?: string;
  selectedAbility?: string;
  selectedItem?: string;
  selectedMoves?: string[];
  nature?: string;
  evs?: TeamExportEvs;
  ivs?: TeamExportEvs;
}

export interface TeamExportEvs {
  hp?: number;
  atk?: number;
  def?: number;
  spa?: number;
  spd?: number;
  spe?: number;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Quick prefix check — used by the import dialog to decide between
 * "decode as code" and "parse as JSON" before calling the heavier
 * {@link importTeamFromCode}. Trimmed and case-insensitive on the
 * prefix because users copy-paste with weird whitespace and some
 * platforms (Discord embeds) lowercase the leading scheme.
 */
export function isTeamCode(input: string): boolean {
  const head = input.trim().toUpperCase();
  return TEAM_CODE_PREFIXES.some((p) => head.startsWith(p));
}

/** Returns the prefix the input starts with (uppercased), or null. */
function detectPrefix(input: string): string | null {
  const head = input.trim().toUpperCase();
  for (const p of TEAM_CODE_PREFIXES) if (head.startsWith(p)) return p;
  return null;
}

/**
 * Pull a share code out of a URL like
 * `https://app.com/team-builder?share=CBM1%3Axxx`. Returns the raw
 * code (`CBM1:xxx`) or `null` if the input isn't a recognisable
 * share URL. Accepts both full URLs and the bare query string so the
 * import dialog can paste-and-go from Discord previews.
 */
export function extractShareFromUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Cheap shortcut for the common case
  if (!trimmed.includes("share=")) return null;
  try {
    // Allow either a full URL or a query-only string ("?share=…")
    const u = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(`https://x${trimmed.startsWith("?") ? "" : "?"}${trimmed.startsWith("?") ? trimmed.slice(1) : trimmed}`);
    const share = u.searchParams.get("share");
    if (!share) return null;
    return share;
  } catch {
    return null;
  }
}

/**
 * Build a shareable URL for the current host. Falls back to a bare
 * relative path when no origin is available (SSR — the export
 * dialog runs client-side, so the typical call passes
 * `window.location.origin`).
 */
export function buildShareUrl(team: TeamExport, origin?: string): string {
  const code = exportTeamToCode(team);
  const base = `${origin ?? ""}/team-builder`;
  return `${base}?share=${encodeURIComponent(code)}`;
}

/**
 * Compact share code: `CBM2:` + base64url(positional-JSON).
 *
 * The payload is a flat positional array (no object keys), with
 * defaults stripped — `IVs all-31` and `EVs all-0` are omitted, empty
 * arrays / nulls are trimmed from the slot tail, and only filled
 * slots are persisted. Typical reduction vs CBM1 on a full 6-mon
 * team: ~55–65% shorter.
 *
 * Wire layout:
 *
 *   [2, name, [slot, slot, …]]
 *   slot = [id, nick?, abi?, item?, [moves]?, nature?, [evs]?, [ivs]?]
 *
 * Trailing `null`s in a slot are trimmed: a slot with only a pokémon id
 * encodes as `["pikachu"]`, not `["pikachu",null,null,null,null]`.
 */
export function exportTeamToCode(team: TeamExport): string {
  const payload = teamExportToCompact(team);
  const json = JSON.stringify(payload);
  return TEAM_CODE_PREFIX + toBase64Url(json);
}

/**
 * Pretty-printed JSON for the power-user export tab. Same in-memory
 * shape as the compact form — only the rendering differs. Indented
 * with 2 spaces so the textarea reads naturally.
 */
export function exportTeamToJson(team: TeamExport): string {
  return JSON.stringify(stripEmpty(team), null, 2);
}

/**
 * Parse either format. Auto-detects from the leading characters:
 *   - `CBM1:` → base64url decode → JSON.parse → validate
 *   - `{`    → JSON.parse → validate
 *
 * Throws a {@link TeamImportError} on any failure with a French
 * user-facing message — the dialog shows it verbatim, so phrasing
 * matters more than stack frames.
 */
export function importTeamFromCode(input: string): TeamExport {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new TeamImportError("L'import est vide.");
  }

  // URL form: pull the embedded share code out first so the rest of
  // the pipeline only has to handle "CBMx:…" or raw JSON.
  const fromUrl = extractShareFromUrl(trimmed);
  const effective = fromUrl ?? trimmed;

  const prefix = detectPrefix(effective);

  let raw: string;
  if (prefix) {
    const payload = effective.slice(prefix.length);
    try {
      raw = fromBase64Url(payload);
    } catch {
      throw new TeamImportError(
        `Code ${prefix.slice(0, -1)} invalide : le contenu n'est pas du base64url décodable.`,
      );
    }
  } else if (effective.startsWith("{") || effective.startsWith("[")) {
    raw = effective;
  } else {
    throw new TeamImportError(
      "Format non reconnu. Colle un lien de partage, un code « CBM2:… » ou un export JSON.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TeamImportError(
      prefix
        ? `Code ${prefix.slice(0, -1)} invalide : le payload n'est pas un JSON valide.`
        : "JSON invalide.",
    );
  }

  // CBM2 emits an array (`[2, name, [...]]`); CBM1 emits an object.
  if (Array.isArray(parsed)) {
    return validateCompactExport(parsed);
  }
  return validateTeamExport(parsed);
}

/**
 * Round-trip helper: take the app's 6-slot grid + name and turn it
 * into a {@link TeamExport}. Strips empty trailing slots and copies
 * only the fields the codec persists (drops e.g. ephemeral UI state).
 */
export function teamExportFromSlots(name: string, slots: TeamSlot[]): TeamExport {
  return {
    version: TEAM_EXPORT_VERSION,
    name: name.trim() || "Équipe sans titre",
    slots: slots
      .filter((s): s is TeamSlot & { pokemonId: string } => !!s.pokemonId)
      .map((s) => stripEmptySlot({
        pokemonId: s.pokemonId,
        nickname: s.nickname,
        selectedAbility: s.selectedAbility,
        selectedItem: s.selectedItem,
        selectedMoves: s.selectedMoves,
        nature: s.nature,
        evs: s.evs,
        ivs: s.ivs,
      })),
  };
}

/**
 * Inverse of {@link teamExportFromSlots}: pad to 6 slots so the
 * builder's grid stays whole. Caller is responsible for verifying
 * each `pokemonId` against the local Pokémon registry — keeping that
 * check at the call site means the codec doesn't have to import the
 * dataset.
 */
export function slotsFromTeamExport(team: TeamExport): TeamSlot[] {
  const out: TeamSlot[] = team.slots.slice(0, 6).map((s) => ({
    pokemonId: s.pokemonId,
    nickname: s.nickname,
    selectedAbility: s.selectedAbility,
    selectedItem: s.selectedItem,
    selectedMoves: s.selectedMoves,
    nature: s.nature,
    evs: s.evs,
    ivs: s.ivs,
  }));
  while (out.length < 6) out.push({ pokemonId: null });
  return out;
}

// ─── Errors ──────────────────────────────────────────────────────────

export class TeamImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamImportError";
  }
}

// ─── Validation ──────────────────────────────────────────────────────

/**
 * Whitelist-style validator: walks the parsed payload, keeps only the
 * fields we recognise, and rejects on structural problems. Unknown
 * fields are silently dropped (forward-compat with CBM2 codes that
 * happen to share the JSON shape).
 */
function validateTeamExport(raw: unknown): TeamExport {
  if (!raw || typeof raw !== "object") {
    throw new TeamImportError("Le payload n'est pas un objet JSON.");
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.version !== "number") {
    throw new TeamImportError("Champ `version` manquant ou invalide.");
  }
  if (r.version > TEAM_EXPORT_VERSION) {
    // Forward-compat: we'll still try to import, but warn the caller
    // via the message. The dialog shows this verbatim.
    throw new TeamImportError(
      `Format CBM${r.version} non supporté par cette version de l'app.`,
    );
  }

  const name = typeof r.name === "string" ? r.name.trim() : "";

  if (!Array.isArray(r.slots)) {
    throw new TeamImportError("Champ `slots` manquant ou invalide.");
  }
  if (r.slots.length > 6) {
    throw new TeamImportError(
      `Trop de Pokémon (${r.slots.length}). Une équipe contient au plus 6 slots.`,
    );
  }

  const slots: TeamExportSlot[] = [];
  r.slots.forEach((s, i) => {
    const slot = validateSlot(s, i);
    if (slot) slots.push(slot);
  });

  return {
    version: r.version,
    name: name || "Équipe sans titre",
    slots,
  };
}

function validateSlot(raw: unknown, index: number): TeamExportSlot | null {
  if (!raw || typeof raw !== "object") {
    throw new TeamImportError(
      `Slot ${index + 1} : entrée invalide (objet attendu).`,
    );
  }
  const s = raw as Record<string, unknown>;

  // `pokemonId: null` is how the JSON v1 format encoded empty slots.
  // We tolerate it but skip — the export side no longer emits them.
  if (s.pokemonId === null || s.pokemonId === undefined) {
    return null;
  }
  if (typeof s.pokemonId !== "string" || !s.pokemonId) {
    throw new TeamImportError(
      `Slot ${index + 1} : \`pokemonId\` manquant ou invalide.`,
    );
  }

  const out: TeamExportSlot = { pokemonId: s.pokemonId };

  if (typeof s.nickname === "string" && s.nickname) {
    out.nickname = s.nickname;
  }
  if (typeof s.selectedAbility === "string" && s.selectedAbility) {
    out.selectedAbility = s.selectedAbility;
  }
  if (typeof s.selectedItem === "string" && s.selectedItem) {
    out.selectedItem = s.selectedItem;
  }
  if (Array.isArray(s.selectedMoves)) {
    const moves = s.selectedMoves
      .filter((m): m is string => typeof m === "string" && !!m)
      .slice(0, 4);
    if (moves.length) out.selectedMoves = moves;
  }
  if (typeof s.nature === "string" && s.nature) {
    out.nature = s.nature;
  }
  if (s.evs && typeof s.evs === "object") {
    const evs = validateEvs(s.evs as Record<string, unknown>, 252);
    if (evs) out.evs = evs;
  }
  if (s.ivs && typeof s.ivs === "object") {
    const ivs = validateEvs(s.ivs as Record<string, unknown>, 31);
    if (ivs) out.ivs = ivs;
  }

  return out;
}

/**
 * Stat-spread validator parameterised on the per-stat cap. EVs cap at
 * 252; IVs cap at 31. Both share the same six-keys shape.
 */
function validateEvs(
  raw: Record<string, unknown>,
  cap: number,
): TeamExportEvs | null {
  const out: TeamExportEvs = {};
  const keys: (keyof TeamExportEvs)[] = ["hp", "atk", "def", "spa", "spd", "spe"];
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= cap) {
      out[k] = v;
    }
  }
  return Object.keys(out).length ? out : null;
}

// ─── Strip empty / undefined keys before serialising ─────────────────

function stripEmpty(team: TeamExport): TeamExport {
  return {
    version: team.version,
    name: team.name,
    slots: team.slots.map(stripEmptySlot),
  };
}

function stripEmptySlot(s: TeamExportSlot): TeamExportSlot {
  const out: TeamExportSlot = { pokemonId: s.pokemonId };
  if (s.nickname) out.nickname = s.nickname;
  if (s.selectedAbility) out.selectedAbility = s.selectedAbility;
  if (s.selectedItem) out.selectedItem = s.selectedItem;
  if (s.selectedMoves && s.selectedMoves.length) {
    out.selectedMoves = s.selectedMoves.slice(0, 4);
  }
  if (s.nature) out.nature = s.nature;
  if (s.evs && Object.keys(s.evs).length) out.evs = s.evs;
  if (s.ivs && Object.keys(s.ivs).length) out.ivs = s.ivs;
  return out;
}

// ─── CBM2 positional codec ───────────────────────────────────────
//
// Wire layout: `[version, name, slots]` where each slot is itself an
// array. Trailing nulls / empty fields in a slot are trimmed so a
// pokémon-only entry encodes as `["pikachu"]`. Drops all-31 IVs and
// all-0 EVs entirely — the importer re-defaults them.

const EVS_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;

function evsToCompact(
  evs: TeamExportEvs | undefined,
  defaultVal: number,
): number[] | null {
  if (!evs) return null;
  const arr = EVS_KEYS.map((k) => (evs[k] ?? defaultVal));
  if (arr.every((v) => v === defaultVal)) return null;
  return arr;
}

function evsFromCompact(
  arr: unknown,
  cap: number,
  defaultVal: number,
): TeamExportEvs | undefined {
  if (!Array.isArray(arr)) return undefined;
  const out: TeamExportEvs = {};
  let any = false;
  for (let i = 0; i < EVS_KEYS.length; i++) {
    const v = arr[i];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > cap) continue;
    if (v !== defaultVal) {
      out[EVS_KEYS[i]!] = v;
      any = true;
    } else {
      // IVs: explicitly write the default so the consuming UI doesn't
      // mistake "absent" for "unspecified". For EVs the absence == 0
      // contract is fine — they collapse to nothing.
      if (defaultVal !== 0) out[EVS_KEYS[i]!] = v;
    }
  }
  return any ? out : undefined;
}

function teamExportToCompact(team: TeamExport): unknown[] {
  const slots = team.slots.map((s) => {
    const moves = s.selectedMoves && s.selectedMoves.length ? s.selectedMoves.slice(0, 4) : null;
    const tuple: (string | number | null | unknown[])[] = [
      s.pokemonId,
      s.nickname ?? null,
      s.selectedAbility ?? null,
      s.selectedItem ?? null,
      moves,
      s.nature ?? null,
      evsToCompact(s.evs, 0),
      evsToCompact(s.ivs, 31),
    ];
    // Trim trailing falsy values so a bare-pokémon slot becomes
    // `["pikachu"]` instead of `["pikachu",null,null,null,null,null,null,null]`.
    while (tuple.length > 1 && isEmptyTail(tuple[tuple.length - 1])) tuple.pop();
    return tuple;
  });
  return [team.version, team.name, slots];
}

function isEmptyTail(v: unknown): boolean {
  if (v == null) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function validateCompactExport(raw: unknown[]): TeamExport {
  if (raw.length < 3) {
    throw new TeamImportError("Code CBM2 invalide : payload trop court.");
  }
  const version = raw[0];
  const name = raw[1];
  const slotsRaw = raw[2];
  if (typeof version !== "number") {
    throw new TeamImportError("Code CBM2 invalide : version manquante.");
  }
  if (version > TEAM_EXPORT_VERSION) {
    throw new TeamImportError(
      `Format CBM${version} non supporté par cette version de l'app.`,
    );
  }
  if (!Array.isArray(slotsRaw)) {
    throw new TeamImportError("Code CBM2 invalide : `slots` doit être un tableau.");
  }
  if (slotsRaw.length > 6) {
    throw new TeamImportError(
      `Trop de Pokémon (${slotsRaw.length}). Une équipe contient au plus 6 slots.`,
    );
  }

  const slots: TeamExportSlot[] = [];
  slotsRaw.forEach((s, i) => {
    if (!Array.isArray(s)) {
      throw new TeamImportError(`Slot ${i + 1} : entrée invalide (tableau attendu).`);
    }
    const pokemonId = s[0];
    if (typeof pokemonId !== "string" || !pokemonId) return;

    const out: TeamExportSlot = { pokemonId };
    const nickname = s[1];
    const ability = s[2];
    const item = s[3];
    const moves = s[4];
    const nature = s[5];
    const evs = s[6];
    const ivs = s[7];

    if (typeof nickname === "string" && nickname) out.nickname = nickname;
    if (typeof ability === "string" && ability) out.selectedAbility = ability;
    if (typeof item === "string" && item) out.selectedItem = item;
    if (Array.isArray(moves)) {
      const cleaned = moves
        .filter((m): m is string => typeof m === "string" && !!m)
        .slice(0, 4);
      if (cleaned.length) out.selectedMoves = cleaned;
    }
    if (typeof nature === "string" && nature) out.nature = nature;
    const e = evsFromCompact(evs, 252, 0);
    if (e) out.evs = e;
    const v = evsFromCompact(ivs, 31, 31);
    if (v) out.ivs = v;

    slots.push(out);
  });

  return {
    version,
    name: typeof name === "string" && name ? name : "Équipe sans titre",
    slots,
  };
}

// ─── base64url (UTF-8 safe) ──────────────────────────────────────────
//
// `btoa` only handles Latin-1, so a name like "Équipe d'élite" would
// throw. We encode through TextEncoder/TextDecoder for full UTF-8
// support — Pokémon names, French accents and emoji all round-trip.

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  // Restore standard base64 alphabet + the padding `=` that base64url
  // strips. `atob` is picky about padding so we always normalise to
  // a multiple of 4.
  const std = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (std.length % 4)) % 4;
  const bin = atob(std + "=".repeat(pad));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
