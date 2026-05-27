"use client";

import { useState } from "react";
import {
  Filter as FilterIcon,
  Plus,
  X,
  Check,
  Sparkles as SparklesIcon,
  Equal,
  RotateCcw,
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  type ActiveFilter,
  type CategoricalFilter,
  type CategoricalKind,
  type FilterContext,
  type FilterMode,
  type PowerFilter,
  makeFilterId,
} from "./filter-types";
import {
  CATEGORICAL_KINDS,
  FILTER_KIND_META,
  formatValue,
  getOptions,
  valueColor,
} from "./filter-options";
import { FILTER_PRESETS, type FilterPreset } from "./filter-presets";

export type { ActiveFilter } from "./filter-types";

// ─── Public component ────────────────────────────────────────────────────

interface Props {
  filters: ActiveFilter[];
  onChange: (next: ActiveFilter[]) => void;
  context: FilterContext;
}

/**
 * Pokédex filter toolbar.
 *
 * Public surface: an array of `ActiveFilter` (include or exclude per kind,
 * or a BST range). No "operators" — multi-select OR semantics + a single
 * include/exclude toggle covers everything the old model expressed, with
 * one less concept to learn.
 */
export function FiltersBar({ filters, onChange, context }: Props) {
  function upsertCategorical(kind: CategoricalKind, value: string) {
    const existing = filters.find(
      (f): f is CategoricalFilter => f.kind === kind,
    );
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

  function togglePower() {
    const existing = filters.find((f) => f.kind === "power");
    if (existing) {
      onChange(filters.filter((f) => f.id !== existing.id));
      return;
    }
    onChange([
      ...filters,
      {
        id: makeFilterId("power"),
        kind: "power",
        range: [context.powerMin, context.powerMax],
      },
    ]);
  }

  function patchFilter(id: string, patch: Partial<ActiveFilter>) {
    onChange(
      filters.map((f) =>
        f.id === id ? ({ ...f, ...patch } as ActiveFilter) : f,
      ),
    );
  }

  function removeFilter(id: string) {
    onChange(filters.filter((f) => f.id !== id));
  }

  function applyPreset(preset: FilterPreset) {
    const built = preset.build(context);
    const replacedKinds = new Set(built.map((f) => f.kind));
    onChange([
      ...filters.filter((f) => !replacedKinds.has(f.kind)),
      ...built,
    ]);
  }

  const isPowerActive = filters.some((f) => f.kind === "power");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) =>
        f.kind === "power" ? (
          <PowerChip
            key={f.id}
            filter={f}
            context={context}
            onPatch={(patch) => patchFilter(f.id, patch)}
            onRemove={() => removeFilter(f.id)}
          />
        ) : (
          <CategoricalChip
            key={f.id}
            filter={f}
            context={context}
            onPatch={(patch) => patchFilter(f.id, patch)}
            onRemove={() => removeFilter(f.id)}
          />
        ),
      )}

      <AddFilterButton
        hasFilters={filters.length > 0}
        isPowerActive={isPowerActive}
        context={context}
        onPickCategorical={upsertCategorical}
        onTogglePower={togglePower}
        onApplyPreset={applyPreset}
        isValueSelected={(kind, value) =>
          filters.some(
            (f) =>
              f.kind === kind && (f as CategoricalFilter).values.includes(value),
          )
        }
      />

      {filters.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          className="text-muted-foreground"
        >
          <RotateCcw data-icon="inline-start" />
          Vider
        </Button>
      )}
    </div>
  );
}

// ─── Add-filter popover ──────────────────────────────────────────────────

interface AddFilterProps {
  hasFilters: boolean;
  isPowerActive: boolean;
  context: FilterContext;
  onPickCategorical: (kind: CategoricalKind, value: string) => void;
  onTogglePower: () => void;
  onApplyPreset: (preset: FilterPreset) => void;
  isValueSelected: (kind: CategoricalKind, value: string) => boolean;
}

function AddFilterButton({
  hasFilters,
  isPowerActive,
  context,
  onPickCategorical,
  onTogglePower,
  onApplyPreset,
  isValueSelected,
}: AddFilterProps) {
  const PowerIcon = FILTER_KIND_META.power.icon;

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
                <Plus data-icon="inline-start" />
                Filtre
              </>
            ) : (
              <>
                <FilterIcon data-icon="inline-start" />
                Filtres
              </>
            )}
          </Button>
        }
      />
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filtres rapides</DropdownMenuLabel>
          {FILTER_PRESETS.map((p) => {
            const Icon = p.icon;
            return (
              <DropdownMenuItem
                key={p.id}
                onClick={() => onApplyPreset(p)}
              >
                <Icon className="text-muted-foreground" />
                {p.label}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuItem onClick={onTogglePower}>
            <PowerIcon className="text-muted-foreground" />
            Plage de stats
            {isPowerActive && (
              <Check className="ml-auto size-4 text-primary" />
            )}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Catégories</DropdownMenuLabel>
          {CATEGORICAL_KINDS.map((kind) => {
            const meta = FILTER_KIND_META[kind];
            const Icon = meta.icon;
            const options = getOptions(kind, context);
            return (
              <DropdownMenuSub key={kind}>
                <DropdownMenuSubTrigger>
                  <Icon className="text-muted-foreground" />
                  {meta.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="max-h-[--available-height] min-w-44 overflow-y-auto">
                    {options.map((o) => (
                      <DropdownMenuCheckboxItem
                        key={o.value}
                        checked={isValueSelected(kind, o.value)}
                        onCheckedChange={() =>
                          onPickCategorical(kind, o.value)
                        }
                        closeOnClick={false}
                      >
                        {o.color && (
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: o.color }}
                          />
                        )}
                        {o.label}
                      </DropdownMenuCheckboxItem>
                    ))}
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

// ─── Chip — categorical ──────────────────────────────────────────────────

interface CategoricalChipProps {
  filter: CategoricalFilter;
  context: FilterContext;
  onPatch: (patch: Partial<CategoricalFilter>) => void;
  onRemove: () => void;
}

function CategoricalChip({
  filter,
  context,
  onPatch,
  onRemove,
}: CategoricalChipProps) {
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

      <ModeToggle
        mode={filter.mode}
        onToggle={(mode) => onPatch({ mode })}
      />

      <ValuesEditor
        filter={filter}
        context={context}
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
  context,
  onChange,
}: {
  filter: CategoricalFilter;
  context: FilterContext;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = getOptions(filter.kind, context);

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
        <ValuesSummary filter={filter} />
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
                        "grid size-4 place-items-center rounded-sm border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    {o.color && (
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: o.color }}
                      />
                    )}
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between border-t px-2 py-1.5 text-[11px]">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onChange(options.map((o) => o.value))}
            >
              Tout cocher
            </button>
            <span className="text-muted-foreground">
              {filter.values.length}/{options.length}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onChange([])}
            >
              Tout décocher
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ValuesSummary({ filter }: { filter: CategoricalFilter }) {
  if (filter.values.length === 0) {
    return <span className="italic opacity-60">choisir…</span>;
  }

  const showDots = filter.kind === "type" || filter.kind === "rarity";
  const dots = showDots
    ? filter.values
        .slice(0, 3)
        .map((v) => valueColor(filter.kind, v))
        .filter((c): c is string => Boolean(c))
    : [];

  if (filter.values.length === 1) {
    return (
      <>
        {dots[0] && (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dots[0] }}
          />
        )}
        <span className="truncate">
          {formatValue(filter.kind, filter.values[0]!)}
        </span>
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
        <strong className="font-medium">{filter.values.length}</strong>{" "}
        {pluralValues(filter.kind, filter.values.length)}
      </span>
    </>
  );
}

function pluralValues(kind: CategoricalKind, n: number): string {
  const base =
    kind === "type"
      ? "type"
      : kind === "generation"
        ? "génération"
        : kind === "role"
          ? "rôle"
          : kind === "biome"
            ? "biome"
            : "rareté";
  return n > 1 ? base + "s" : base;
}

// ─── Chip — power ────────────────────────────────────────────────────────

interface PowerChipProps {
  filter: PowerFilter;
  context: FilterContext;
  onPatch: (patch: Partial<PowerFilter>) => void;
  onRemove: () => void;
}

function PowerChip({ filter, context, onPatch, onRemove }: PowerChipProps) {
  const meta = FILTER_KIND_META.power;
  const Icon = meta.icon;

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border bg-muted text-xs">
      <span className="flex items-center gap-1.5 border-r px-2 py-1 text-foreground">
        <Icon className="size-3.5 text-muted-foreground" />
        {meta.label}
      </span>
      <PowerRangeButton
        range={filter.range}
        min={context.powerMin}
        max={context.powerMax}
        onChange={(range) => onPatch({ range })}
      />
      <RemoveButton onRemove={onRemove} />
    </div>
  );
}

function PowerRangeButton({
  range,
  min,
  max,
  onChange,
}: {
  range: [number, number];
  min: number;
  max: number;
  onChange: (range: [number, number]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1.5 px-2 py-1 font-mono text-foreground transition hover:bg-muted/50">
        {range[0]}
        <span className="text-muted-foreground">–</span>
        {range[1]}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium uppercase tracking-wide text-muted-foreground">
              Puissance totale (BST)
            </span>
            <span className="font-mono text-foreground">
              {range[0]} – {range[1]}
            </span>
          </div>
          <Slider
            value={range}
            min={min}
            max={max}
            step={5}
            onValueChange={(v) => {
              if (Array.isArray(v) && v.length >= 2) {
                onChange([v[0]!, v[1]!]);
              }
            }}
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>min {min}</span>
            <button
              type="button"
              onClick={() => onChange([min, max])}
              className="hover:text-foreground"
            >
              réinitialiser
            </button>
            <span>max {max}</span>
          </div>
          <p className="border-t pt-2 text-[11px] leading-relaxed text-muted-foreground">
            <SparklesIcon className="-mt-0.5 mr-1 inline size-3" />
            Somme des 6 stats de base. Un starter ≈ 300, un légendaire ≈ 600+.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────

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

