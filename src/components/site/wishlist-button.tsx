"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  pokemonId: string;
  pokemonName: string;
  size?: "default" | "sm" | "icon";
}

export function WishlistButton({ pokemonId, pokemonName, size = "default" }: Props) {
  const { has, toggle, hydrated } = useWishlist();
  const active = has(pokemonId);

  return (
    <Button
      variant={active ? "secondary" : "outline"}
      size={size}
      disabled={!hydrated}
      onClick={() => {
        toggle(pokemonId);
        toast(
          active
            ? `${pokemonName} retiré de la wishlist.`
            : `${pokemonName} ajouté à la wishlist.`,
        );
      }}
    >
      <Heart
        data-icon="inline-start"
        className={cn(active && "fill-current text-destructive")}
      />
      {size !== "icon" && (active ? "Dans la wishlist" : "Ajouter à la wishlist")}
    </Button>
  );
}
