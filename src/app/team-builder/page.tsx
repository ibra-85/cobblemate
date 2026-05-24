import { TeamBuilder } from "@/features/team-builder/team-builder";

export const metadata = { title: "Builder d'équipe · CobbleMate" };

export default function TeamBuilderPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Builder d&apos;équipe</h1>
        <p className="text-sm text-muted-foreground">
          Compose ton équipe de 6 Pokémon : faiblesses, couverture et rôles
          sont analysés en temps réel.
        </p>
      </header>
      <TeamBuilder />
    </div>
  );
}
