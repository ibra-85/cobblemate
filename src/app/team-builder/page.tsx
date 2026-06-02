import { TeamBuilder } from "@/features/team-builder/team-builder";
import {
  importTeamFromCode,
  slotsFromTeamExport,
} from "@/lib/team-share-codec";
import type { TeamSlot } from "@/types";

export const metadata = { title: "Builder d'équipe · CobbleMate" };

/**
 * Two entry-point query params:
 *  - **`?team=<id>`** — load a saved team from the dashboard. The id
 *    is resolved client-side after `useSavedTeams` hydrates because
 *    saved teams live in localStorage.
 *  - **`?share=<CBM1:…>`** — load a team from a shared link. We
 *    decode the payload here (the codec is pure, runs server-side)
 *    and hand the result to the client as `initialShared`. The
 *    builder treats it as a *temporary import* — `editingId` stays
 *    null, a "Importée — non sauvegardée" chip shows on the toolbar,
 *    and the primary button is "Sauvegarder" (never auto-overwrite
 *    an existing saved team).
 *
 * Next 16 surfaces `searchParams` as a `Promise` — has to be awaited.
 */
export default async function TeamBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; share?: string }>;
}) {
  const { team, share } = await searchParams;

  let initialShared: { name: string; slots: TeamSlot[] } | null = null;
  if (share) {
    try {
      const parsed = importTeamFromCode(share);
      initialShared = {
        name: parsed.name,
        slots: slotsFromTeamExport(parsed),
      };
    } catch {
      // Decode failed — let the builder render its empty state.
      // The client could surface an error toast but a silent fallback
      // matches the rest of the codec's defensive posture.
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Builder d&apos;équipe</h1>
        <p className="text-sm text-muted-foreground">
          Compose ton équipe de 6 Pokémon : faiblesses, couverture et rôles
          sont analysés en temps réel.
        </p>
      </header>
      <TeamBuilder initialTeamId={team} initialShared={initialShared} />
    </div>
  );
}
