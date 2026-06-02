"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, X, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
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
  lookupAbility,
  getAbilityLearners,
  allAbilitySlugs,
} from "@/data/abilities-pokeapi";
import { frAbility } from "@/data/smogon";

type SortKey = "name" | "learners";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name",     label: "Nom (A→Z)" },
  { value: "learners", label: "Nombre de porteurs" },
];

const PAGE_SIZE = 60;

interface AbilityRow {
  slug: string;
  nameFr: string;
  nameEn: string;
  shortEffect: string | null;
  learners: number;
  hiddenLearners: number;
  haystack: string;
}

function buildRows(): AbilityRow[] {
  const out: AbilityRow[] = [];
  for (const slug of allAbilitySlugs()) {
    const a = lookupAbility(slug);
    if (!a) continue;
    const learners = getAbilityLearners(slug);
    const hidden = learners.filter((l) => l.hidden).length;
    const nameFr = frAbility(a.nameEn).label;
    out.push({
      slug,
      nameFr,
      nameEn: a.nameEn,
      shortEffect: a.shortEffect,
      learners: learners.length,
      hiddenLearners: hidden,
      haystack: `${nameFr} ${a.nameEn} ${slug}`.toLowerCase(),
    });
  }
  return out;
}

export default function AbilitiesListingPage() {
  const allRows = useMemo(() => buildRows(), []);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("learners");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = allRows.filter((r) => !q || r.haystack.includes(q));
    list.sort((a, b) => {
      const dir = sortDesc ? -1 : 1;
      if (sortKey === "name") return dir * a.nameFr.localeCompare(b.nameFr);
      return dir * (a.learners - b.learners);
    });
    return list;
  }, [allRows, query, sortKey, sortDesc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Talents
        </h1>
        <p className="text-sm text-muted-foreground">
          {allRows.length} talents portés par au moins un Pokémon dans Cobblemon.
          Chaque fiche liste les Pokémon qui le possèdent, en talent normal ou caché.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="min-w-[14rem] flex-1 sm:max-w-md">
            <InputGroupAddon>
              <Search className="size-4 opacity-60" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Rechercher un talent…"
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

          <div className="ml-auto flex items-center gap-2">
            <Select value={sortKey} onValueChange={(v) => v && setSortKey(v as SortKey)}>
              <SelectTrigger className="min-w-[10rem] bg-background">
                <SelectValue>
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
              size="sm"
              onClick={() => setSortDesc((v) => !v)}
              aria-label="Inverser le sens du tri"
            >
              {sortDesc ? "↓" : "↑"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{filtered.length}</strong> /{" "}
          {allRows.length} talent{filtered.length > 1 ? "s" : ""}
          {pageCount > 1 && (
            <>
              {" "}— page{" "}
              <strong className="text-foreground">{safePage}</strong> / {pageCount}
            </>
          )}
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Aucun talent ne correspond à ces filtres.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((r) => (
              <AbilityRow key={r.slug} row={r} />
            ))}
          </div>

          {pageCount > 1 && (
            <Pagination
              page={safePage}
              pageCount={pageCount}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function AbilityRow({ row }: { row: AbilityRow }) {
  const showEn = row.nameEn && row.nameEn !== row.nameFr;
  return (
    <Link
      href={`/abilities/${row.slug}`}
      className="group flex flex-col gap-1.5 rounded-md border bg-card p-3 text-sm transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center gap-2">
        <Wand2 className="size-4 shrink-0 text-amber-500/70" />
        <span className="truncate font-medium">{row.nameFr}</span>
        {showEn && (
          <span className="truncate text-[10px] italic text-muted-foreground">
            {row.nameEn}
          </span>
        )}
        <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
          {row.learners}
          {row.hiddenLearners > 0 && (
            <span className="ml-1 text-primary/80">
              · {row.hiddenLearners} caché
            </span>
          )}
        </Badge>
      </div>
      {row.shortEffect && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {row.shortEffect}
        </p>
      )}
    </Link>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

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
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
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
