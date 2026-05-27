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
          Les Pokémon que tu veux encore attraper, avec leurs spawns et snacks.
        </p>
      </header>
      <WishlistView />
    </div>
  );
}
