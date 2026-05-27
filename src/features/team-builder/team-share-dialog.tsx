"use client";

import { useState } from "react";
import { Download, Upload, Copy, Check } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { TeamSlot } from "@/types";
import { POKEMON_BY_ID } from "@/data/pokemon";

interface Props {
  slots: TeamSlot[];
  name: string;
  onImport: (name: string, slots: TeamSlot[]) => void;
}

interface SerializedTeam {
  version: 1;
  name: string;
  slots: { pokemonId: string | null; nickname?: string; selectedMoves?: string[] }[];
}

/**
 * Lightweight team share / restore. JSON keeps it human-readable so a
 * power user can paste it into Discord without binary noise.
 */
export function TeamShareDialog({ slots, name, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filledSlots = slots.filter((s) => s.pokemonId).length;

  const exported = JSON.stringify(
    { version: 1, name, slots } satisfies SerializedTeam,
    null,
    2,
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(exported);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Impossible de copier dans le presse-papiers.");
    }
  }

  function tryImport() {
    setError(null);
    try {
      const parsed = JSON.parse(pasted) as SerializedTeam;
      if (parsed.version !== 1 || !Array.isArray(parsed.slots)) {
        throw new Error("Format inconnu");
      }
      // Validate every pokemonId actually exists locally.
      const cleaned: TeamSlot[] = parsed.slots
        .slice(0, 6)
        .map((s) => ({
          pokemonId:
            s.pokemonId && POKEMON_BY_ID[s.pokemonId] ? s.pokemonId : null,
          nickname: s.nickname,
          selectedMoves: s.selectedMoves,
        }));
      while (cleaned.length < 6) cleaned.push({ pokemonId: null });

      onImport(parsed.name || "Équipe importée", cleaned);
      toast.success("Équipe importée.");
      setOpen(false);
      setPasted("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON invalide");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload data-icon="inline-start" />
            Partager / importer
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Partage d&apos;équipe</DialogTitle>
          <DialogDescription>
            Exporte l&apos;équipe actuelle en JSON ou colle un export reçu d&apos;un
            ami pour l&apos;importer.
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
            <Textarea
              value={exported}
              readOnly
              rows={10}
              className="font-mono text-xs"
            />
            <Button onClick={copy} variant="outline">
              {copied ? (
                <>
                  <Check data-icon="inline-start" />
                  Copié
                </>
              ) : (
                <>
                  <Copy data-icon="inline-start" />
                  Copier le JSON
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="import" className="flex flex-col gap-3">
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={10}
              placeholder='{"version":1,"name":"…","slots":[…]}'
              className="font-mono text-xs"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={tryImport} disabled={!pasted.trim()}>
              Importer
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
