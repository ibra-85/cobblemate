import { Swords, Calculator, Grid3x3 } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BattleHelper } from "@/features/battle-helper/battle-helper";
import { TeamVsTeam } from "@/features/battle-helper/team-vs-team";
import { DamageCalc } from "@/features/calc/damage-calc";

export const metadata = { title: "Combat · CobbleMate" };

export default function BattlePage() {
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

      <Tabs defaultValue="assistant">
        <TabsList>
          <TabsTrigger value="assistant">
            <Swords data-icon="inline-start" />
            Assistant
          </TabsTrigger>
          <TabsTrigger value="vs-team">
            <Grid3x3 data-icon="inline-start" />
            Team vs Team
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
        <TabsContent value="calc" className="mt-4">
          <DamageCalc />
        </TabsContent>
      </Tabs>
    </div>
  );
}
