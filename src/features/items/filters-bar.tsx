"use client";

import { useState } from "react";
import {
  Filter as FilterIcon,
  Plus,
  X,
  Check,
  Equal,
  RotateCcw,
  Sparkles,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Items filter toolbar — same chip pattern as the Pokédex /
 * PokéSnacks filter bars so the whole app feels consistent. The
 * kinds here are deliberately narrow (category + rarity) since the
 * items catalog is a much smaller dataset than Pokémon.
 */

export type ItemsFilterKind = "category" | "rarity";
export type FilterMode = "include" | "exclude";

export interface ItemsFilter {
  id: string;
  kind: ItemsFilterKind;
  mode: FilterMode;
  values: string[];
}

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

export interface FilterKindMeta {
  kind: ItemsFilterKind;
  label: string;
  icon: LucideIcon;
}

export const FILTER_KIND_META: Record<ItemsFilterKind, FilterKindMeta> = {
  category: { kind: "category", label: "Catégorie", icon: Crown },
  rarity:   { kind: "rarity",   label: "Rareté",    icon: Sparkles },
};

const KIND_ORDER: ItemsFilterKind[] = ["category", "rarity"];

let nextId = 0;
function makeFilterId(kind: ItemsFilterKind): string {
  nextId += 1;
  return `if-${kind}-${Date.now().toString(36)}-${nextId}`;
}

interface Props {
  filters: ItemsFilter[];
  onChange: (next: ItemsFilter[]) => void;
  options: Record<ItemsFilterKind, FilterOption[]>;
}

export function ItemsFiltersBar({ filters, onChange, options }: Props) {
  function upsert(kind: ItemsFilterKind, value: string) {
    const existing = filters.find((f) => f.kind === kind);
    if (existing) {
      const has = existing.values.includes(value);
      const nextValues = has
        ? existing.values.filter((v) => v !== value)
        : [...existing.values, value];
      if (nextValues.length === 0) {
        onChange(filters.filter((f) => f.id !== existing.id));
        return;
      }
      onChange(
        filters.map((f) =>
          f.id === existing.id ? { ...existing, values: nextValues } : f,
        ),
      );
      return;
    }
    onChange([
      ...filters,
      { id: makeFilterId(kind), kind, mode: "include", values: [value] },
    ]);
  }

  function patch(id: string, patchObj: Partial<ItemsFilter>) {
    onChange(
      filters.map((f) => (f.id === id ? ({ ...f, ...patchObj } as ItemsFilter) : f)),
    );
  }

  function remove(id: string) {
    onChange(filters.filter((f) => f.id !== id));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <CategoricalChip
          key={f.id}
          filter={f}
          options={options[f.kind]}
          onPatch={(p) => patch(f.id, p)}
          onRemove={() => remove(f.id)}
        />
      ))}

      <AddFilterButton
        hasFilters={filters.length > 0}
        options={options}
        onPick={upsert}
        isValueSelected={(kind, value) =>
          filters.some((f) => f.kind === kind && f.values.includes(value))
        }
      />

      {filters.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          className="text-muted-foreground"
        >
          <RotateCcw className="size-3.5" />
          Vider
        </Button>
      )}
    </div>
  );
}

// ─── Add-filter dropdown ─────────────────────────────────────────────────

function AddFilterButton({
  hasFilters,
  options,
  onPick,
  isValueSelected,
}: {
  hasFilters: boolean;
  options: Record<ItemsFilterKind, FilterOption[]>;
  onPick: (kind: ItemsFilterKind, value: string) => void;
  isValueSelected: (kind: ItemsFilterKind, value: string) => boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={hasFilters ? "ghost" : "outline"}
            size="sm"
            className="border-dashed"
          >
            {hasFilters ? (
              <>
                <Plus className="size-3.5" />
                Filtre
              </>
            ) : (
              <>
                <FilterIcon className="size-3.5" />
                Filtres
              </>
            )}
          </Button>
        }
      />
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Catégories</DropdownMenuLabel>
          {KIND_ORDER.map((kind) => {
            const meta = FILTER_KIND_META[kind];
            const Icon = meta.icon;
            const opts = options[kind];
            if (!opts || opts.length === 0) return null;
            return (
              <DropdownMenuSub key={kind}>
                <DropdownMenuSubTrigger>
                  <Icon className="text-muted-foreground" />
                  {meta.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="min-w-44">
                    <div className="max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto">
                      {opts.map((o) => (
                        <DropdownMenuCheckboxItem
                          key={o.value}
                          checked={isValueSelected(kind, o.value)}
                          onCheckedChange={() => onPick(kind, o.value)}
                          closeOnClick={false}
                        >
                          {o.color && (
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: o.color }}
                            />
                          )}
                          {o.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Chip ───────────────────────────────────────────────────────────────

function CategoricalChip({
  filter,
  options,
  onPatch,
  onRemove,
}: {
  filter: ItemsFilter;
  options: FilterOption[];
  onPatch: (patch: Partial<ItemsFilter>) => void;
  onRemove: () => void;
}) {
  const meta = FILTER_KIND_META[filter.kind];
  const Icon = meta.icon;
  const isExclude = filter.mode === "exclude";

  return (
    <div
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-md border bg-muted text-xs",
        isExclude && "border-destructive/40",
      )}
    >
      <span className="flex items-center gap-1.5 border-r px-2 py-1 text-foreground">
        <Icon className="size-3.5 text-muted-foreground" />
        {meta.label}
      </span>

      <ModeToggle mode={filter.mode} onToggle={(mode) => onPatch({ mode })} />

      <ValuesEditor
        filter={filter}
        options={options}
        onChange={(values) => onPatch({ values })}
      />

      <RemoveButton onRemove={onRemove} />
    </div>
  );
}

function ModeToggle({
  mode,
  onToggle,
}: {
  mode: FilterMode;
  onToggle: (mode: FilterMode) => void;
}) {
  const isExclude = mode === "exclude";
  return (
    <button
      type="button"
      onClick={() => onToggle(isExclude ? "include" : "exclude")}
      title={isExclude ? "Exclure ces valeurs" : "Inclure ces valeurs"}
      aria-label={isExclude ? "Exclure" : "Inclure"}
      className={cn(
        "border-r px-1.5 py-1 font-mono text-[11px] transition",
        isExclude
          ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {isExclude ? "≠" : <Equal className="size-3" />}
    </button>
  );
}

function ValuesEditor({
  filter,
  options,
  onChange,
}: {
  filter: ItemsFilter;
  options: FilterOption[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(v: string) {
    onChange(
      filter.values.includes(v)
        ? filter.values.filter((x) => x !== v)
        : [...filter.values, v],
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex max-w-[18rem] items-center gap-1.5 px-2 py-1 text-foreground transition hover:bg-muted/50">
        <ValuesSummary filter={filter} options={options} />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`Filtrer ${FILTER_KIND_META[filter.kind].label.toLowerCase()}…`}
          />
          <CommandList>
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const checked = filter.values.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => toggle(o.value)}
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-sm border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    {o.color && (
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: o.color }}
                      />
                    )}
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ValuesSummary({
  filter,
  options,
}: {
  filter: ItemsFilter;
  options: FilterOption[];
}) {
  if (filter.values.length === 0) {
    return <span className="italic opacity-60">choisir…</span>;
  }

  const dots = filter.values
    .slice(0, 3)
    .map((v) => options.find((o) => o.value === v)?.color)
    .filter((c): c is string => Boolean(c));

  if (filter.values.length === 1) {
    const o = options.find((x) => x.value === filter.values[0]);
    return (
      <>
        {dots[0] && (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dots[0] }}
          />
        )}
        <span className="truncate">{o?.label ?? filter.values[0]}</span>
      </>
    );
  }

  return (
    <>
      {dots.length > 0 && (
        <span className="flex -space-x-1">
          {dots.map((c, i) => (
            <span
              key={i}
              className="size-2.5 rounded-full ring-2 ring-muted"
              style={{ backgroundColor: c }}
            />
          ))}
        </span>
      )}
      <span className="truncate">
        <strong className="font-medium">{filter.values.length}</strong> valeurs
      </span>
    </>
  );
}

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="border-l px-1.5 py-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
      aria-label="Retirer ce filtre"
    >
      <X className="size-3" />
    </button>
  );
}
