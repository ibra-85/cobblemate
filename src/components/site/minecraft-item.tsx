"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Minecraft-flavoured item icon. We prefer a real wiki image (resolved
 * through MediaWiki's `Special:FilePath` redirect so we don't hard-code
 * hashed paths). When no image is mapped we fall back to a hand-drawn
 * pixel-art SVG sprite using one of the shape templates below.
 *
 * The registry covers every item we surface in the UI today; unknown
 * items fall back to a neutral "?" swatch so the page never breaks
 * when new items show up in upstream data.
 */

type Shape =
  | "berry"
  | "apple"
  | "bottle"
  | "bucket"
  | "carrot"
  | "melonSlice"
  | "vegetable"
  | "grain"
  | "cookie"
  | "tag";

interface ItemMeta {
  /** Primary item colour (used by the SVG sprite fallback). */
  color: string;
  /** Optional secondary/highlight colour for the SVG sprite. */
  accent?: string;
  /** Drawing template used by the pixel-art renderer when no image. */
  shape: Shape;
  /** Human-friendly tooltip. */
  label: string;
  /**
   * Direct image URL. Prefer hardcoded `/images/<hash>/<file>` paths
   * because the wiki's `Special:FilePath` triggers a double redirect
   * that some browsers/networks handle poorly (the image silently
   * fails to load with no error). Empty string = no image, keep SVG.
   */
  image?: string;
}

const WIKI_IMAGES = "https://wiki.cobblemon.com/images";
const WIKI_FILEPATH = "https://wiki.cobblemon.com/index.php/Special:FilePath";

const ITEMS: Record<string, ItemMeta> = {
  // ─── Base cooking-pot ingredients (direct paths, no redirect) ────
  "#c:drinks/milk":          { color: "#f5f5f5", accent: "#9ca3af", shape: "bucket",  label: "Lait Moomoo",     image: `${WIKI_IMAGES}/f/f3/Moomoo_Milk.png` },
  "minecraft:milk_bucket":   { color: "#f5f5f5", accent: "#9ca3af", shape: "bucket",  label: "Lait Moomoo",     image: `${WIKI_IMAGES}/f/f3/Moomoo_Milk.png` },
  "minecraft:honey_bottle":  { color: "#facc15", accent: "#a16207", shape: "bottle",  label: "Pot de miel",     image: `${WIKI_IMAGES}/4/45/Honey_Bottle.png` },
  "cobblemon:vivichoke":     { color: "#a855f7", accent: "#22c55e", shape: "vegetable", label: "Vivichoke",     image: `${WIKI_IMAGES}/c/c2/Vivichoke.png` },
  "cobblemon:hearty_grains": { color: "#facc15", accent: "#a16207", shape: "grain",   label: "Grains nourrissants", image: `${WIKI_IMAGES}/c/cf/Hearty_Grains.png` },
  "cobblemon:poke_snack":    { color: "#f4a44d", accent: "#9a6128", shape: "cookie",  label: "Poké Snack",      image: `${WIKI_IMAGES}/3/31/Pok%C3%A9_Snack.png` },
  // ─── Seasoning items ──────────────────────────────────────────────
  "minecraft:apple":                  { color: "#dc2626", accent: "#16a34a", shape: "apple",      label: "Pomme" },
  "minecraft:golden_apple":           { color: "#facc15", accent: "#fde68a", shape: "apple",      label: "Pomme d'or" },
  "minecraft:enchanted_golden_apple": { color: "#facc15", accent: "#a78bfa", shape: "apple",      label: "Pomme d'or enchantée" },
  "minecraft:glistering_melon_slice": { color: "#fde047", accent: "#22c55e", shape: "melonSlice", label: "Tranche de melon scintillant" },
  "minecraft:golden_carrot":          { color: "#f97316", accent: "#22c55e", shape: "carrot",     label: "Carotte dorée" },
  "minecraft:glow_berries":           { color: "#fb923c", accent: "#fbbf24", shape: "berry",      label: "Lumibaies" },
  "minecraft:sweet_berries":          { color: "#dc2626", accent: "#16a34a", shape: "berry",      label: "Baies sucrées" },
  // ─── Cobblemon berries (typing-boost) — coloured by their type ────
  "cobblemon:rindo_berry":  { color: "#84cc16", accent: "#365314", shape: "berry", label: "Baie Rindo (Plante)" },
  "cobblemon:occa_berry":   { color: "#ef4444", accent: "#7f1d1d", shape: "berry", label: "Baie Occa (Feu)" },
  "cobblemon:passho_berry": { color: "#3b82f6", accent: "#1e3a8a", shape: "berry", label: "Baie Passho (Eau)" },
  "cobblemon:wacan_berry":  { color: "#eab308", accent: "#854d0e", shape: "berry", label: "Baie Wacan (Électrik)" },
  "cobblemon:yache_berry":  { color: "#67e8f9", accent: "#0e7490", shape: "berry", label: "Baie Yache (Glace)" },
  "cobblemon:chople_berry": { color: "#b91c1c", accent: "#450a0a", shape: "berry", label: "Baie Chople (Combat)" },
  "cobblemon:kebia_berry":  { color: "#a855f7", accent: "#581c87", shape: "berry", label: "Baie Kebia (Poison)" },
  "cobblemon:shuca_berry":  { color: "#ca8a04", accent: "#451a03", shape: "berry", label: "Baie Shuca (Sol)" },
  "cobblemon:coba_berry":   { color: "#7dd3fc", accent: "#0c4a6e", shape: "berry", label: "Baie Coba (Vol)" },
  "cobblemon:payapa_berry": { color: "#ec4899", accent: "#831843", shape: "berry", label: "Baie Payapa (Psy)" },
  "cobblemon:tanga_berry":  { color: "#a3e635", accent: "#365314", shape: "berry", label: "Baie Tanga (Insecte)" },
  "cobblemon:charti_berry": { color: "#a3a3a3", accent: "#404040", shape: "berry", label: "Baie Charti (Roche)" },
  "cobblemon:kasib_berry":  { color: "#6d28d9", accent: "#2e1065", shape: "berry", label: "Baie Kasib (Spectre)" },
  "cobblemon:haban_berry":  { color: "#4c1d95", accent: "#1e1b4b", shape: "berry", label: "Baie Haban (Dragon)" },
  "cobblemon:colbur_berry": { color: "#44403c", accent: "#1c1917", shape: "berry", label: "Baie Colbur (Ténèbres)" },
  "cobblemon:babiri_berry": { color: "#94a3b8", accent: "#1e293b", shape: "berry", label: "Baie Babiri (Acier)" },
  "cobblemon:roseli_berry": { color: "#f9a8d4", accent: "#831843", shape: "berry", label: "Baie Roseli (Fée)" },
  "cobblemon:chilan_berry": { color: "#d6d3d1", accent: "#57534e", shape: "berry", label: "Baie Chilan (Normal)" },
  // ─── Special-effect berries ───────────────────────────────────────
  "cobblemon:starf_berry":  { color: "#fbbf24", accent: "#a855f7", shape: "berry", label: "Baie Starf (Shiny)" },
  // ─── Tag aggregates (no wiki page → keep the SVG sprite) ─────────
  "#cobblemon:berries":     { color: "#a855f7", accent: "#525252", shape: "tag",   label: "Toute baie Cobblemon", image: "" },
};

/**
 * Derive a wiki filename from an item id when no direct URL is mapped
 * (e.g. `cobblemon:rindo_berry` → `Rindo_Berry.png`). Resolved via the
 * `Special:FilePath` redirect — fine for berries whose direct hash
 * path we don't keep in the registry.
 */
function fallbackImageUrl(itemId: string): string {
  const tail = itemId.split(":").pop() ?? itemId;
  const filename = tail
    .split("_")
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
    .join("_") + ".png";
  return `${WIKI_FILEPATH}/${encodeURIComponent(filename)}`;
}

/** Resolve the image URL for an item (null = no image, render SVG). */
export function itemImageUrl(itemId: string): string | null {
  // Same dual-key lookup as itemMeta — the recipe pattern yields tags
  // without their `#` prefix, so we have to probe both shapes.
  const meta =
    ITEMS[itemId] ?? ITEMS["#" + itemId] ?? ITEMS[itemId.replace(/^#/, "")];
  if (meta?.image === "") return null;       // explicit opt-out
  if (meta?.image) return meta.image;        // registry-pinned URL
  if (itemId.startsWith("#")) return null;   // unknown tag → no image
  return fallbackImageUrl(itemId);            // best-effort via redirect
}

const DEFAULT_META: ItemMeta = {
  color: "#6b7280", accent: "#374151", shape: "tag", label: "Item",
};

/**
 * Resolve an item id to its registry entry. Minecraft datapack tags
 * can flow through the UI as either `#c:drinks/milk` (datapack form)
 * or `c:drinks/milk` (the bare tag id — what the recipe pattern key
 * yields). Look up both shapes so a single registry key covers both.
 */
export function itemMeta(id: string): ItemMeta {
  return (
    ITEMS[id] ??
    ITEMS["#" + id] ??
    ITEMS[id.replace(/^#/, "")] ??
    { ...DEFAULT_META, label: humanize(id) }
  );
}

function humanize(id: string): string {
  const tail = id.split(/[:/]/).pop() ?? id;
  return tail.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Pixel-art SVG sprites ──────────────────────────────────────────────

interface SpriteProps {
  primary: string;
  accent: string;
}

/**
 * A small pixel-art sprite drawn from filled `<rect>` cells. We pick a
 * 16-unit viewBox so each "pixel" lines up crisply when the slot is
 * 32-40 px wide. `shape-rendering="crispEdges"` keeps the look sharp.
 */
function Sprite({ shape, primary, accent }: SpriteProps & { shape: Shape }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-full"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated" }}
    >
      {renderShape(shape, primary, accent)}
    </svg>
  );
}

// Tiny helper to draw a filled cell rect.
function px(x: number, y: number, fill: string, w = 1, h = 1) {
  return <rect key={`${x},${y},${fill}`} x={x} y={y} width={w} height={h} fill={fill} />;
}

function renderShape(shape: Shape, c: string, a: string): React.ReactNode[] {
  switch (shape) {
    case "berry":      return berry(c, a);
    case "apple":      return apple(c, a);
    case "bottle":     return bottle(c, a);
    case "bucket":     return bucket(c, a);
    case "carrot":     return carrot(c, a);
    case "melonSlice": return melonSlice(c, a);
    case "vegetable":  return vegetable(c, a);
    case "grain":      return grain(c, a);
    case "cookie":     return cookie(c, a);
    case "tag":        return tag(c, a);
  }
}

// ─── Shape templates — each one ~12×12 inside the 16×16 viewBox ────────

function berry(c: string, dark: string): React.ReactNode[] {
  const hi = "#ffffff90";
  return [
    // stem
    px(7, 2, "#22c55e", 2, 2),
    // body
    px(5, 4, c, 6, 1),
    px(4, 5, c, 8, 4),
    px(5, 9, c, 6, 2),
    px(6, 11, c, 4, 1),
    // shadow
    px(10, 5, dark, 1, 5),
    px(11, 6, dark, 1, 4),
    px(7, 11, dark, 3, 1),
    // highlight
    px(5, 5, hi, 2, 1),
    px(5, 6, hi, 1, 1),
  ];
}

function apple(c: string, leaf: string): React.ReactNode[] {
  const hi = "#ffffff80";
  return [
    px(8, 2, "#5d3a1a", 1, 2),                 // stem
    px(9, 3, leaf, 2, 1),                      // leaf
    px(4, 4, c, 8, 1),
    px(3, 5, c, 10, 6),
    px(4, 11, c, 8, 1),
    px(5, 12, c, 6, 1),
    px(3, 5, hi, 2, 2),                        // highlight
    px(11, 9, "#00000040", 1, 2),              // shadow
  ];
}

function bottle(c: string, dark: string): React.ReactNode[] {
  return [
    // neck
    px(7, 2, "#9ca3af", 2, 2),
    px(6, 4, "#9ca3af", 4, 1),
    // body
    px(5, 5, c, 6, 8),
    px(6, 13, c, 4, 1),
    // outline / shadow
    px(10, 5, dark, 1, 8),
    px(9, 13, dark, 1, 1),
    px(5, 12, dark, 5, 1),
  ];
}

function bucket(c: string, dark: string): React.ReactNode[] {
  const rim = "#9ca3af";
  return [
    px(3, 4, rim, 10, 1),    // handle
    px(3, 5, rim, 1, 1),
    px(12, 5, rim, 1, 1),
    px(3, 6, c, 10, 7),      // body
    px(4, 13, c, 8, 1),
    px(5, 14, c, 6, 1),
    px(11, 6, dark, 1, 7),   // shadow
    px(10, 13, dark, 2, 1),
  ];
}

function carrot(c: string, leaf: string): React.ReactNode[] {
  return [
    px(6, 2, leaf, 1, 1),
    px(7, 2, leaf, 2, 2),
    px(5, 3, leaf, 1, 1),
    px(9, 3, leaf, 1, 1),
    px(7, 4, c, 2, 1),
    px(6, 5, c, 4, 1),
    px(6, 6, c, 4, 1),
    px(7, 7, c, 2, 2),
    px(7, 9, c, 2, 2),
    px(7, 11, c, 1, 1),
    px(9, 5, "#00000030", 1, 4),
  ];
}

function melonSlice(c: string, accent: string): React.ReactNode[] {
  return [
    px(2, 4, "#16a34a", 12, 1),   // rind
    px(3, 5, "#22c55e", 10, 1),
    px(3, 6, c, 10, 6),           // flesh
    px(4, 12, c, 8, 1),
    px(5, 13, c, 6, 1),
    px(7, 8, accent, 1, 1),       // seeds
    px(5, 9, accent, 1, 1),
    px(9, 10, accent, 1, 1),
    px(7, 11, accent, 1, 1),
  ];
}

function vegetable(c: string, leaf: string): React.ReactNode[] {
  // Vivichoke-ish — overlapping leaves
  return [
    // leaves on top
    px(6, 3, leaf, 1, 1),
    px(8, 3, leaf, 1, 1),
    px(7, 2, leaf, 1, 2),
    px(5, 4, leaf, 1, 1),
    px(9, 4, leaf, 1, 1),
    // body (overlapping scales)
    px(5, 5, c, 6, 2),
    px(4, 7, c, 8, 2),
    px(5, 9, c, 6, 2),
    px(6, 11, c, 4, 1),
    // scale shadows
    px(7, 6, leaf, 1, 1),
    px(5, 8, leaf, 1, 1),
    px(10, 8, leaf, 1, 1),
    px(7, 10, leaf, 1, 1),
  ];
}

function grain(c: string, dark: string): React.ReactNode[] {
  // wheat sheaf — diamond grains stacked
  return [
    px(7, 2, c, 2, 1),
    px(6, 3, c, 4, 1),
    px(7, 4, dark, 2, 1),
    px(6, 5, c, 4, 1),
    px(5, 6, c, 6, 1),
    px(6, 7, dark, 4, 1),
    px(5, 8, c, 6, 1),
    px(4, 9, c, 8, 1),
    px(5, 10, dark, 6, 1),
    px(4, 11, c, 8, 1),
    px(5, 12, c, 6, 1),
    px(7, 13, c, 2, 1),
  ];
}

function cookie(c: string, dark: string): React.ReactNode[] {
  return [
    // round biscuit
    px(5, 3, c, 6, 1),
    px(4, 4, c, 8, 1),
    px(3, 5, c, 10, 6),
    px(4, 11, c, 8, 1),
    px(5, 12, c, 6, 1),
    // chocolate chips
    px(5, 6, dark, 2, 1),
    px(9, 7, dark, 2, 1),
    px(6, 9, dark, 2, 1),
    px(10, 9, dark, 1, 1),
  ];
}

function tag(c: string, dark: string): React.ReactNode[] {
  return [
    px(3, 3, c, 10, 10),
    px(11, 3, dark, 2, 10),
    px(3, 11, dark, 10, 2),
    px(5, 5, "#ffffffb0", 1, 1),
    px(9, 5, "#ffffffb0", 1, 1),
    px(7, 9, "#ffffffb0", 2, 1),
  ];
}

// ─── Slot UI ───────────────────────────────────────────────────────────

interface SlotProps {
  item?: string;
  title?: string;
  count?: number;
  empty?: boolean;
  dim?: boolean;
  size?: string;
  className?: string;
}

/**
 * A single Minecraft-style inventory slot. Inset bevel, dark-grey
 * recessed background, pixel-art sprite centered in the cell. Stack
 * counts render at bottom-right like the real game.
 */
export function MinecraftSlot({
  item,
  title,
  count,
  empty,
  dim,
  size = "size-10",
  className,
}: SlotProps) {
  const meta = item ? itemMeta(item) : null;
  const label = title ?? meta?.label ?? "Vide";

  const slot = (
    <div
      aria-label={label}
      className={cn(
        "relative grid place-items-center",
        // Inset bevel.
        "border-t-[3px] border-l-[3px] border-b-[3px] border-r-[3px]",
        "border-t-[#373737] border-l-[#373737]",
        "border-b-[#fffefb] border-r-[#fffefb]",
        "bg-[#8b8b8b]",
        empty && "opacity-40",
        dim && "opacity-50",
        size,
        className,
      )}
    >
      {meta && item && <ItemArtwork item={item} meta={meta} />}
      {count != null && count > 1 && (
        <span className="pointer-events-none absolute bottom-[-2px] right-[1px] font-mono text-[10px] font-bold text-white shadow-[1px_1px_0_#000]">
          {count}
        </span>
      )}
    </div>
  );

  // Empty slots don't deserve a tooltip — they'd just say "Vide".
  if (!meta && !title) return slot;

  // base-ui Tooltip honours the `delay` set on the layout-wide
  // TooltipProvider (0 ms) so this is instant — no flaky native delay.
  return (
    <Tooltip>
      <TooltipTrigger render={slot} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Renders the artwork inside a slot — wiki image when available, with
 * the hand-drawn SVG sprite as a silent fallback. We stack them: the
 * SVG sits underneath at the same position; the img layers on top and
 * paints over it once it loads. If the img 404s the SVG shows through.
 */
function ItemArtwork({ item, meta }: { item: string; meta: ItemMeta }) {
  const url = itemImageUrl(item);
  return (
    <div className="relative size-[80%]">
      <div className="absolute inset-0">
        <Sprite
          shape={meta.shape}
          primary={meta.color}
          accent={meta.accent ?? meta.color}
        />
      </div>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={meta.label}
          // No `title` here — the Tooltip on the parent slot owns the
          // hover label, otherwise browsers render a redundant native
          // tooltip with a delay on top of the Radix one.
          loading="lazy"
          className="absolute inset-0 size-full object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      )}
    </div>
  );
}

// ─── Panel UI ──────────────────────────────────────────────────────────

/**
 * Outer panel mimicking a Minecraft inventory background — light grey
 * surface with raised bevel. Use as the parent of `MinecraftSlot`s.
 */
export function MinecraftPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-block bg-[#c6c6c6] p-3",
        "border-t-[3px] border-l-[3px] border-b-[3px] border-r-[3px]",
        "border-t-[#fffefb] border-l-[#fffefb]",
        "border-b-[#555555] border-r-[#555555]",
        className,
      )}
    >
      {children}
    </div>
  );
}
