import { BattleHelper } from "@/features/battle-helper/battle-helper";

export const metadata = { title: "Assistant de combat · CobbleMate" };

export default function BattlePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Assistant de combat</h1>
        <p className="text-sm text-muted-foreground">
          Sélectionne ton équipe et le Pokémon adverse : on te dit qui envoyer et
          quelle attaque utiliser.
        </p>
      </header>
      <BattleHelper />
    </div>
  );
}
