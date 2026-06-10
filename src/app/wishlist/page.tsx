import { WishlistView } from "@/features/wishlist/wishlist-view";

export const metadata = { title: "Wishlist · CobbleMate" };

export default function WishlistPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Wishlist de capture
        </h1>
        <p className="text-sm text-muted-foreground">
          Les Pokémon que tu veux attraper — biomes Minecraft vanilla,
          recette &laquo;&nbsp;Meilleur choix&nbsp;&raquo; (EV-attractor) et EV yield
          pour chacun. Marque les captures, filtre par type/rareté, ou
          groupe par biome pour planifier tes sessions de chasse.
        </p>
      </header>
      <WishlistView />
    </div>
  );
}
