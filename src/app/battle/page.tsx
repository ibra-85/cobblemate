import { Swords, Calculator, Grid3x3, Flame } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BattleHelper } from "@/features/battle-helper/battle-helper";
import { TeamVsTeam } from "@/features/battle-helper/team-vs-team";
import { RaidMode } from "@/features/battle-helper/raid-mode";
import { DamageCalc } from "@/features/calc/damage-calc";

export const metadata = { title: "Combat · CobbleMate" };

/**
 * Accepted query string:
 *   ?tab=calc          — land on the damage calculator
 *   ?attacker=<id>     — pre-fill the attacker
 *   ?defender=<id>     — pre-fill the defender
 *   ?move=<id or name> — pre-fill the move (lookupMove resolves both)
 *
 * The Strategy panel on a Pokémon page uses this to spin up a quick
 * "Tester ce set" flow with attacker + first move already wired.
 */
export default async function BattlePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const tab = pick("tab");
  const initialTab =
    tab === "calc" || tab === "vs-team" || tab === "assistant" || tab === "raid"
      ? tab
      : "assistant";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Combat
        </h1>
        <p className="text-sm text-muted-foreground">
          Assistant pour un adversaire isolé, matrice contre une équipe entière,
          ou calc de dégâts précis.
        </p>
      </header>

      {/* `key={initialTab}` so a same-route navigation that flips
          `?tab=…` (e.g. the "Tester dans le calc" CTA from the
          assistant) actually remounts the Tabs with the new default.
          Without it, the URL would update but the tab state would
          stay on its previous value because `defaultValue` is only
          consumed at mount time. */}
      <Tabs key={initialTab} defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="assistant">
            <Swords data-icon="inline-start" />
            Assistant
          </TabsTrigger>
          <TabsTrigger value="vs-team">
            <Grid3x3 data-icon="inline-start" />
            Team vs Team
          </TabsTrigger>
          <TabsTrigger value="raid">
            <Flame data-icon="inline-start" />
            Raid (type)
          </TabsTrigger>
          <TabsTrigger value="calc">
            <Calculator data-icon="inline-start" />
            Calc dégâts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="mt-4">
          <BattleHelper />
        </TabsContent>
        <TabsContent value="vs-team" className="mt-4">
          <TeamVsTeam />
        </TabsContent>
        <TabsContent value="raid" className="mt-4">
          <RaidMode />
        </TabsContent>
        <TabsContent value="calc" className="mt-4">
          <DamageCalc
            initialAttacker={pick("attacker")}
            initialDefender={pick("defender")}
            initialMove={pick("move")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
