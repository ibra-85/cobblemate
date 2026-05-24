import Link from "next/link";
import {
  Users,
  Swords,
  BookOpen,
  MapPin,
  Cookie,
  Sparkles,
  Flame,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { POKEMON } from "@/data/pokemon";
import { MOVES } from "@/data/moves";
import { SPAWNS } from "@/data/spawns";
import { POKESNACKS } from "@/data/pokesnacks";

const QUICK_LINKS = [
  { href: "/team-builder", label: "Builder d'équipe",   desc: "Compose 6 Pokémon, analyse instantanée.", icon: Users },
  { href: "/battle",       label: "Assistant de combat", desc: "Choisis le bon Pokémon à envoyer.",       icon: Swords },
  { href: "/pokedex",      label: "Pokédex Cobblemon",   desc: "Stats, talents, spawns, contres.",        icon: BookOpen },
  { href: "/spawns",       label: "Spawns",              desc: "Pokémon par biome, météo, dimension.",    icon: MapPin },
  { href: "/pokesnacks",   label: "PokéSnacks",          desc: "Quel snack pour attirer quel Pokémon.",   icon: Cookie },
  { href: "/moves",        label: "Attaques",            desc: "Recherche et effets détaillés.",          icon: Flame },
  { href: "/types",        label: "Types & faiblesses",  desc: "Table complète des 18 types.",            icon: Sparkles },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-8">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Compagnon Cobblemon 1.7.3</Badge>
          <Badge variant="outline">v0.1</Badge>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
            Bienvenue sur CobbleMate
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Construis tes équipes, analyse leurs faiblesses, et trouve en un clin
            d&apos;œil le meilleur Pokémon à envoyer contre n&apos;importe quel adversaire.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/team-builder" />}>
            Lancer le builder
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/battle" />}
          >
            Ouvrir l&apos;assistant de combat
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat label="Pokémon"    value={POKEMON.length}    sub="base locale" />
        <Stat label="Attaques"   value={MOVES.length}      sub="référencées" />
        <Stat label="Spawns"     value={SPAWNS.length}     sub="conditions" />
        <Stat label="PokéSnacks" value={POKESNACKS.length} sub="recettes" />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Modules</h2>
          <p className="text-sm text-muted-foreground">
            Tout ce dont tu as besoin pour jouer Cobblemon plus efficacement.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, desc, icon: Icon }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full transition-colors hover:border-foreground/20 hover:bg-accent/40">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-md border bg-background">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-base">{label}</CardTitle>
                  </div>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Ouvrir
                  <ArrowRight className="ml-1 inline size-3 transition group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-bold tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{sub}</CardContent>
    </Card>
  );
}
