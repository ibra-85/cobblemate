"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Search,
  X,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Filter as FilterIcon,
  Plus,
  Check,
  Sparkles,
  Sword,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TypeBadge } from "@/components/site/type-badge";
import { TYPES_META } from "@/data/types";
import { lookupMove } from "@/data/moves";
import { allLearnableMoveIds, getMoveLearners } from "@/data/move-learners";
import { cn } from "@/lib/utils";
import type { PokemonTypeId, MoveCategory } from "@/types";

const CATEGORY_BADGE: Record<MoveCategory, string> = {
  physical: "Phys", special: "Spé", status: "Stat",
};

const ALL_TYPES = Object.keys(TYPES_META) as PokemonTypeId[];

type SortKey = "power" | "name" | "accuracy" | "pp" | "learners";

const CATEGORY_OPTIONS: { value: MoveCategory; label: string }[] = [
  { value: "physical", label: "Physique" },
  { value: "special",  label: "Spéciale" },
  { value: "status",   label: "Statut" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "power",    label: "Puissance" },
  { value: "name",     label: "Nom (A→Z)" },
  { value: "accuracy", label: "Précision" },
  { value: "pp",       label: "PP" },
  { value: "learners", label: "Apprentissage" },
];

const PAGE_SIZE = 60;

interface MoveRow {
  id: string;
  name: string;
  nameEn: string;
  type: PokemonTypeId;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number;
  learners: number;
  haystack: string;
}

/**
 * Build every learnable move's row once. The 802-row list is fine to
 * keep in memory; anything heavier (sorting, search) is memoised
 * against the active filters in the component.
 */
function buildRows(): MoveRow[] {
  return allLearnableMoveIds()
    .map((id) => {
      const m = lookupMove(id);
      if (!m) return null;
      const l = getMoveLearners(id);
      const learners =
        l.level.length + l.tm.length + l.egg.length + l.tutor.length +
        l.legacy.length + l.special.length;
      const nameEn = m.nameEn ?? "";
      return {
        id,
        name: m.name,
        nameEn,
        type: m.type as PokemonTypeId,
        category: m.category,
        power: m.power,
        accuracy: m.accuracy,
        pp: m.pp,
        learners,
        haystack: `${m.name} ${nameEn} ${id}`.toLowerCase(),
      } satisfies MoveRow;
    })
    .filter((r): r is MoveRow => r !== null);
}

export default function MovesListingPage() {
  const allRows = useMemo(() => buildRows(), []);
  const [query, setQuery] = useState("");
  // Multi-select filter sets — same OR semantics as the pokédex
  // FiltersBar: empty set means "no constraint on this dimension".
  const [types, setTypes] = useState<Set<PokemonTypeId>>(new Set());
  const [categories, setCategories] = useState<Set<MoveCategory>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("power");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = allRows.filter((r) => {
      if (types.size > 0 && !types.has(r.type)) return false;
      if (categories.size > 0 && !categories.has(r.category)) return false;
      if (q && !r.haystack.includes(q)) return false;
      return true;
    });
    list.sort((a, b) => {
      const dir = sortDesc ? -1 : 1;
      switch (sortKey) {
        case "name":     return dir * a.name.localeCompare(b.name);
        case "power":    return dir * ((a.power ?? -1) - (b.power ?? -1));
        case "accuracy": return dir * ((a.accuracy ?? -1) - (b.accuracy ?? -1));
        case "pp":       return dir * (a.pp - b.pp);
        case "learners": return dir * (a.learners - b.learners);
      }
    });
    return list;
  }, [allRows, query, types, categories, sortKey, sortDesc]);

  // Clamp the page index whenever the filter pool shrinks beyond it.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const hasFilters =
    query !== "" || types.size > 0 || categories.size > 0;

  function resetAll() {
    setQuery("");
    setTypes(new Set());
    setCategories(new Set());
    setPage(1);
  }

  function toggleType(t: PokemonTypeId) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
    setPage(1);
  }

  function toggleCategory(c: MoveCategory) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
    setPage(1);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Attaques
        </h1>
        <p className="text-sm text-muted-foreground">
          {allRows.length} attaques apprises par au moins un Pokémon dans Cobblemon.
          Ouvre une fiche pour voir tous les Pokémon qui la connaissent.
        </p>
      </header>

      {/* ─── Filter toolbar ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="min-w-[14rem] flex-1 sm:max-w-xs">
            <InputGroupAddon>
              <Search className="size-4 opacity-60" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Rechercher une attaque…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
            {query && (
              <InputGroupAddon
                className="cursor-pointer"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
              >
                <X className="size-4 opacity-60 hover:opacity-100" />
              </InputGroupAddon>
            )}
          </InputGroup>

          {/* Active filter chips + a single "+ Filtre" button — same
              pattern as the pokédex toolbar. Empty filter sets render
              nothing, so the row stays compact when no filter active. */}
          <FiltersBar
            types={types}
            categories={categories}
            onToggleType={toggleType}
            onToggleCategory={toggleCategory}
            onClearTypes={() => { setTypes(new Set()); setPage(1); }}
            onClearCategories={() => { setCategories(new Set()); setPage(1); }}
          />

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAll}
              className="text-muted-foreground"
            >
              <RotateCcw data-icon="inline-start" />
              Vider
            </Button>
          )}

          {/* Sort group, pinned right like the pokedex toolbar. */}
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={sortKey}
              onValueChange={(v) => v && setSortKey(v as SortKey)}
            >
              <SelectTrigger className="min-w-[10rem] bg-background">
                <SelectValue placeholder="Tri">
                  {(value) =>
                    SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Tri"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDesc((v) => !v)}
              aria-label="Inverser le sens du tri"
              title={sortDesc ? "Décroissant" : "Croissant"}
            >
              <ArrowDownUp
                className={cn(
                  "size-4 transition-transform",
                  !sortDesc && "rotate-180",
                )}
              />
            </Button>
          </div>
        </div>

        {/* ─── Result summary ─────────────────────────────────────── */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{filtered.length}</strong> /{" "}
            {allRows.length} attaque{filtered.length > 1 ? "s" : ""}
            {hasFilters ? " correspondant aux filtres" : ""}
            {pageCount > 1 && (
              <>
                {" "}— page{" "}
                <strong className="text-foreground">{safePage}</strong> / {pageCount}
              </>
            )}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <X className="size-3" />
              Tout réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* ─── Results ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Aucune attaque ne correspond à ces filtres.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((r) => (
              <MoveRow key={r.id} row={r} />
            ))}
          </div>

          {pageCount > 1 && (
            <Pagination
              page={safePage}
              pageCount={pageCount}
              onChange={(p) => {
                setPage(p);
                // Bring the user back to the top of the grid — otherwise
                // they're stranded mid-page after clicking "next".
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function MoveRow({ row }: { row: MoveRow }) {
  const showEn = row.nameEn && row.nameEn !== row.name;
  return (
    <Link
      href={`/moves/${row.id}`}
      className="group flex items-center gap-2 rounded-md border bg-card p-2 text-sm transition-colors hover:bg-accent/40"
    >
      <TypeBadge type={row.type} size="sm" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{row.name}</span>
        {showEn && (
          <span className="truncate text-[10px] italic text-muted-foreground">
            {row.nameEn}
          </span>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2 font-mono text-[10px] text-muted-foreground">
        <Badge variant="secondary" className="px-1.5">
          {CATEGORY_BADGE[row.category]}
        </Badge>
        <span className="tabular-nums">{row.power ?? "—"}p</span>
        <span title={`Apprise par ${row.learners} entrées de learnset`}>
          · {row.learners}
        </span>
      </div>
    </Link>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

/**
 * Numbered pager with elision (… for skipped ranges). Always shows
 * the current page, the first and last, plus a window of neighbours.
 * Keeps the row to ~7 buttons even for 100-page result sets.
 */
function Pagination({ page, pageCount, onChange }: PaginationProps) {
  const pages = buildPageButtons(page, pageCount);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-center gap-1.5 pt-2"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft data-icon="inline-start" />
        Précédent
      </Button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(p)}
            className="min-w-9"
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={page === pageCount}
        onClick={() => onChange(page + 1)}
      >
        Suivant
        <ChevronRight data-icon="inline-end" />
      </Button>
    </nav>
  );
}

function buildPageButtons(page: number, pageCount: number): (number | "ellipsis")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...set].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

// ─── Filters bar ────────────────────────────────────────────────────────
//
// Mirror of the pokédex `FiltersBar` pattern, scoped to moves:
//   - One "+ Filtre" / "Filtres" dropdown to add a category.
//   - Active filters render as chips before the button. Each chip
//     exposes an editor popover (Type → searchable multi-select,
//     Catégorie → small checkbox list).
//   - Empty filter sets stay collapsed; the row is compact when the
//     user hasn't started filtering.

interface FiltersBarProps {
  types: Set<PokemonTypeId>;
  categories: Set<MoveCategory>;
  onToggleType: (t: PokemonTypeId) => void;
  onToggleCategory: (c: MoveCategory) => void;
  onClearTypes: () => void;
  onClearCategories: () => void;
}

function FiltersBar({
  types,
  categories,
  onToggleType,
  onToggleCategory,
  onClearTypes,
  onClearCategories,
}: FiltersBarProps) {
  const hasAny = types.size > 0 || categories.size > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {types.size > 0 && (
        <TypeChip
          values={types}
          onToggle={onToggleType}
          onClear={onClearTypes}
        />
      )}
      {categories.size > 0 && (
        <CategoryChip
          values={categories}
          onToggle={onToggleCategory}
          onClear={onClearCategories}
        />
      )}

      <AddFilterButton
        hasAny={hasAny}
        types={types}
        categories={categories}
        onToggleType={onToggleType}
        onToggleCategory={onToggleCategory}
      />
    </div>
  );
}

// ─── Add-filter dropdown ────────────────────────────────────────────────

function AddFilterButton({
  hasAny,
  types,
  categories,
  onToggleType,
  onToggleCategory,
}: {
  hasAny: boolean;
  types: Set<PokemonTypeId>;
  categories: Set<MoveCategory>;
  onToggleType: (t: PokemonTypeId) => void;
  onToggleCategory: (c: MoveCategory) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={hasAny ? "ghost" : "outline"}
            size="sm"
            className="border-dashed"
          >
            {hasAny ? (
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
      <DropdownMenuContent className="w-52" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Catégories</DropdownMenuLabel>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sparkles className="text-muted-foreground" />
              Type
              {types.size > 0 && (
                <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
                  {types.size}
                </Badge>
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="p-0">
                <TypePicker selected={types} onToggle={onToggleType} />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sword className="text-muted-foreground" />
              Catégorie
              {categories.size > 0 && (
                <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
                  {categories.size}
                </Badge>
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="min-w-40">
                {CATEGORY_OPTIONS.map((o) => (
                  <DropdownMenuCheckboxItem
                    key={o.value}
                    checked={categories.has(o.value)}
                    onCheckedChange={() => onToggleCategory(o.value)}
                    closeOnClick={false}
                  >
                    {o.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Searchable type picker (used in dropdown sub + chip popover) ─────

function TypePicker({
  selected,
  onToggle,
}: {
  selected: Set<PokemonTypeId>;
  onToggle: (t: PokemonTypeId) => void;
}) {
  return (
    <Command className="w-56">
      <CommandInput placeholder="Filtrer un type…" />
      <CommandList className="max-h-[260px]">
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup>
          {ALL_TYPES.map((t) => {
            const checked = selected.has(t);
            return (
              <CommandItem
                key={t}
                value={TYPES_META[t].label}
                onSelect={() => onToggle(t)}
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
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: TYPES_META[t].color }}
                />
                <span className="truncate">{TYPES_META[t].label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// ─── Active-filter chips ────────────────────────────────────────────────

function TypeChip({
  values,
  onToggle,
  onClear,
}: {
  values: Set<PokemonTypeId>;
  onToggle: (t: PokemonTypeId) => void;
  onClear: () => void;
}) {
  const arr = [...values];
  const summary =
    values.size === 1
      ? TYPES_META[arr[0]!].label
      : `${values.size} types`;
  const dots = arr.slice(0, 3).map((t) => TYPES_META[t].color);

  return (
    <ChipShell icon={<Sparkles className="size-3.5 text-muted-foreground" />} label="Type" onClear={onClear}>
      <Popover>
        <PopoverTrigger className="flex items-center gap-1.5 px-2 py-1 text-foreground transition hover:bg-muted/50">
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
          <span className="truncate">{summary}</span>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <TypePicker selected={values} onToggle={onToggle} />
        </PopoverContent>
      </Popover>
    </ChipShell>
  );
}

function CategoryChip({
  values,
  onToggle,
  onClear,
}: {
  values: Set<MoveCategory>;
  onToggle: (c: MoveCategory) => void;
  onClear: () => void;
}) {
  const arr = [...values];
  const summary =
    values.size === 1
      ? CATEGORY_OPTIONS.find((o) => o.value === arr[0])?.label ?? ""
      : `${values.size} catégories`;

  return (
    <ChipShell icon={<Sword className="size-3.5 text-muted-foreground" />} label="Catégorie" onClear={onClear}>
      <Popover>
        <PopoverTrigger className="flex items-center gap-1.5 px-2 py-1 text-foreground transition hover:bg-muted/50">
          <span className="truncate">{summary}</span>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          {CATEGORY_OPTIONS.map((o) => {
            const checked = values.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onToggle(o.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition hover:bg-muted",
                )}
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
                {o.label}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </ChipShell>
  );
}

function ChipShell({
  icon,
  label,
  onClear,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border bg-muted text-xs">
      <span className="flex items-center gap-1.5 border-r px-2 py-1 text-foreground">
        {icon}
        {label}
      </span>
      {children}
      <button
        type="button"
        onClick={onClear}
        className="border-l px-1.5 py-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        aria-label="Retirer ce filtre"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
