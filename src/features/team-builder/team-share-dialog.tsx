"use client";

import { useMemo, useState } from "react";
import { Check, Code2, Copy, Download, Link as LinkIcon, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { TeamSlot } from "@/types";
import { POKEMON_BY_ID } from "@/data/pokemon";
import {
  TeamImportError,
  buildShareUrl,
  exportTeamToCode,
  exportTeamToJson,
  importTeamFromCode,
  slotsFromTeamExport,
  teamExportFromSlots,
} from "@/lib/team-share-codec";

interface Props {
  slots: TeamSlot[];
  name: string;
  onImport: (name: string, slots: TeamSlot[]) => void;
  /** Controlled open state. When provided, the dialog is fully driven
   *  by the parent (no internal trigger button rendered) — that's how
   *  the team-builder's actions menu opens it without nesting two
   *  triggers. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Team share / restore dialog.
 *
 * Two surfaces over the same `TeamExport` payload:
 *  - **Code (`CBM1:…`)** — default. Short, opaque, copy-paste-friendly.
 *  - **JSON** — power-user / debug fallback. Same data, pretty-printed.
 *
 * Import auto-detects which form the user pasted (prefix `CBM1:` vs
 * leading `{`), so there's a single textarea instead of two.
 *
 * Both formats round-trip the full slot config (ability, item, moves,
 * nature, EVs). The previous implementation only carried `pokemonId`
 * + `selectedMoves`, silently dropping every other field — fixed
 * here so an imported team is a complete restoration.
 */
export function TeamShareDialog({
  slots,
  name,
  onImport,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  // Controlled / uncontrolled bridge — when the parent passes `open`,
  // the dialog is fully driven from outside (used by the team-builder
  // actions menu). Otherwise the dialog manages its own state and
  // renders the default trigger button.
  const controlled = openProp !== undefined;
  const open = controlled ? openProp! : internalOpen;
  const setOpen = (next: boolean) => {
    if (!controlled) setInternalOpen(next);
    onOpenChangeProp?.(next);
  };

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filledSlots = slots.filter((s) => s.pokemonId).length;

  // Memoise the export — re-encoding base64url on every keystroke of
  // the team name input above would be wasted work since the dialog
  // is closed 99% of the time. Gated on `open` so the codec only runs
  // when the textareas are actually visible. Returns empty strings
  // while closed; the textareas hold blank values that no one sees.
  const { code, json, link } = useMemo(() => {
    if (!open) return { code: "", json: "", link: "" };
    const team = teamExportFromSlots(name, slots);
    return {
      code: exportTeamToCode(team),
      json: exportTeamToJson(team),
      // Origin is only available client-side; falls back to a
      // path-relative URL during SSR which still works once the user
      // hits Copier (the click handler runs on the client).
      link: buildShareUrl(
        team,
        typeof window !== "undefined" ? window.location.origin : "",
      ),
    };
  }, [open, name, slots]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {
      toast.error("Impossible de copier dans le presse-papiers.");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success("Code copié !");
      setTimeout(() => setCopiedCode(false), 1500);
    } catch {
      toast.error("Impossible de copier dans le presse-papiers.");
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      setCopiedJson(true);
      toast.success("JSON copié !");
      setTimeout(() => setCopiedJson(false), 1500);
    } catch {
      toast.error("Impossible de copier dans le presse-papiers.");
    }
  }

  function tryImport() {
    setError(null);
    try {
      const parsed = importTeamFromCode(pasted);

      // Cross-check `pokemonId` against the local registry. The
      // codec doesn't import the dataset (keeps it pure), so this
      // is where unknown / typo'd ids get filtered out — we keep
      // the slot in place but blank it rather than failing the
      // whole import.
      const sanitized = parsed.slots.map((s) =>
        POKEMON_BY_ID[s.pokemonId] ? s : { ...s, pokemonId: "" },
      );
      const valid = sanitized.filter((s) => s.pokemonId);
      if (valid.length === 0) {
        setError(
          "Aucun Pokémon reconnu dans cet export — ids inconnus pour cette version.",
        );
        return;
      }

      const finalSlots = slotsFromTeamExport({ ...parsed, slots: valid });
      onImport(parsed.name, finalSlots);
      toast.success(`Équipe importée : ${parsed.name}`);
      setOpen(false);
      setPasted("");
    } catch (e) {
      if (e instanceof TeamImportError) {
        setError(e.message);
      } else {
        setError(
          e instanceof Error ? e.message : "Import impossible (erreur inconnue).",
        );
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setPasted("");
          setError(null);
        }
      }}
    >
      {/* Default trigger only when the dialog is uncontrolled — the
          team-builder's actions menu uses controlled mode and doesn't
          want a separate visible trigger button. */}
      {!controlled && (
        <DialogTrigger
          render={
            <Button variant="outline">
              <Upload data-icon="inline-start" />
              Partager / importer
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Partage d&apos;équipe</DialogTitle>
          <DialogDescription>
            Partage l&apos;équipe via un code court, ou colle un code
            reçu d&apos;un ami pour l&apos;importer. Le JSON brut reste
            disponible pour le debug.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export">
          <TabsList className="w-full">
            <TabsTrigger value="export" className="flex-1">
              <Download data-icon="inline-start" />
              Exporter
            </TabsTrigger>
            <TabsTrigger value="import" className="flex-1">
              <Upload data-icon="inline-start" />
              Importer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              {filledSlots}/6 Pokémon dans cette équipe.
            </p>

            {/* Shareable link — headline action. One click → URL in
                the clipboard, recipient pastes anywhere (browser bar,
                Discord, …) and lands on the builder with the team
                already loaded. Code + JSON stay below as fallbacks. */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lien à partager
              </label>
              <Textarea
                value={link}
                readOnly
                rows={2}
                className="max-h-32 resize-none overflow-y-auto break-all font-mono text-xs"
              />
              <Button onClick={copyLink} className="w-full">
                {copiedLink ? (
                  <>
                    <Check data-icon="inline-start" />
                    Lien copié
                  </>
                ) : (
                  <>
                    <LinkIcon data-icon="inline-start" />
                    Copier le lien
                  </>
                )}
              </Button>
            </div>

            {/* Compact code — fallback for places where a URL doesn't
                fit nicely (PM message limits, embedded posts). */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Code CBM1
              </label>
              <Textarea
                value={code}
                readOnly
                rows={3}
                className="max-h-40 resize-none overflow-y-auto break-all font-mono text-xs"
              />
              <Button onClick={copyCode} variant="outline" className="w-full">
                {copiedCode ? (
                  <>
                    <Check data-icon="inline-start" />
                    Code copié
                  </>
                ) : (
                  <>
                    <Copy data-icon="inline-start" />
                    Copier le code
                  </>
                )}
              </Button>
            </div>

            {/* JSON fallback — collapsed by default behind a
                `<details>` so the dialog stays focused on the headline
                action. The native disclosure widget keeps the
                interaction obvious without any extra component. */}
            <details className="group/json rounded-md border bg-muted/30">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium">
                <Code2 className="size-3.5" />
                Format JSON (avancé / debug)
              </summary>
              <div className="flex flex-col gap-2 border-t px-3 py-2">
                {/* JSON is read-only — render in a `<pre>` inside a
                    ScrollArea instead of a Textarea so long lines
                    (item ids with "minecraft:" prefix, deeply nested
                    EVs) scroll horizontally inside the container
                    rather than pushing the dialog past the viewport.
                    User still copies via the button below. */}
                <ScrollArea className="h-60 w-full max-w-full rounded-md border bg-background">
                  <pre className="min-w-0 whitespace-pre p-3 font-mono text-[11px] leading-snug">
                    {json}
                  </pre>
                </ScrollArea>
                <Button onClick={copyJson} variant="outline" size="sm">
                  {copiedJson ? (
                    <>
                      <Check data-icon="inline-start" />
                      JSON copié
                    </>
                  ) : (
                    <>
                      <Copy data-icon="inline-start" />
                      Copier le JSON
                    </>
                  )}
                </Button>
              </div>
            </details>
          </TabsContent>

          <TabsContent value="import" className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Colle un lien de partage, un code{" "}
              <code className="rounded bg-muted px-1 font-mono">CBM1:…</code> ou
              un export JSON. Le format est détecté automatiquement.
            </p>
            {/* `max-h-40` caps the textarea to ~160px so a very long
                pasted CBM1 / URL doesn't push the dialog past the
                viewport — internal scroll takes over once content
                exceeds 8 wrapped lines. `break-all` + `whitespace-pre-wrap`
                ensure even unbroken base64url payloads wrap cleanly
                inside the bounded height. */}
            <Textarea
              value={pasted}
              onChange={(e) => {
                setPasted(e.target.value);
                if (error) setError(null);
              }}
              rows={8}
              placeholder="https://… ?share=CBM1%3A…  ou  CBM1:eyJ…  ou  {…}"
              className="max-h-40 resize-none overflow-y-auto break-all whitespace-pre-wrap font-mono text-xs"
              autoFocus
            />
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button onClick={tryImport} disabled={!pasted.trim()}>
              Importer
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
