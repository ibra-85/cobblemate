import { TYPES_META } from "@/data/types";
import type { PokemonTypeId } from "@/types";
import { cn } from "@/lib/utils";

interface TypeBadgeProps {
  type: PokemonTypeId;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TypeBadge({ type, size = "md", className }: TypeBadgeProps) {
  const meta = TYPES_META[type];
  const sizeClass =
    size === "sm"
      ? "text-[10px] px-1.5 py-0.5"
      : size === "lg"
        ? "text-sm px-3 py-1"
        : "text-xs px-2 py-0.5";

  // Unknown types (e.g. Gen 9 "Stellar" tera type coming from Smogon data
  // — we don't ship a color for it) render as a neutral pill instead of
  // crashing on `meta.color`.
  if (!meta) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border bg-muted font-semibold uppercase tracking-wide text-muted-foreground",
          sizeClass,
          className,
        )}
      >
        {type}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold uppercase tracking-wide shadow-sm",
        sizeClass,
        className,
      )}
      style={{ backgroundColor: meta.color, color: meta.fg }}
    >
      {meta.label}
    </span>
  );
}

interface TypeBadgesProps {
  types: PokemonTypeId[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TypeBadges({ types, size, className }: TypeBadgesProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {types.map((t) => (
        <TypeBadge key={t} type={t} size={size} />
      ))}
    </div>
  );
}
