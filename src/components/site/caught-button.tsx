"use client";

import { Check, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCaught } from "@/hooks/use-caught";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  pokemonId: string;
  pokemonName: string;
  size?: "default" | "sm" | "icon";
}

/**
 * "Capturé" toggle — sibling of `WishlistButton`, same emerald visual
 * language as the wishlist's caught state. Drop it anywhere inside
 * the global `CaughtProvider` (mounted in the root layout).
 */
export function CaughtButton({ pokemonId, pokemonName, size = "default" }: Props) {
  const { has, toggle, hydrated } = useCaught();
  const active = has(pokemonId);

  return (
    <Button
      variant={active ? "secondary" : "outline"}
      size={size}
      disabled={!hydrated}
      aria-label={active ? "Marquer comme non capturé" : "Marquer comme capturé"}
      onClick={() => {
        toggle(pokemonId);
        toast(
          active
            ? `${pokemonName} marqué comme non capturé.`
            : `${pokemonName} capturé ! Living dex mis à jour.`,
        );
      }}
      className={cn(
        active &&
          "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300",
      )}
    >
      {active ? (
        <Check data-icon="inline-start" />
      ) : (
        <CircleDashed data-icon="inline-start" />
      )}
      {size !== "icon" && (active ? "Capturé" : "Marquer capturé")}
    </Button>
  );
}
