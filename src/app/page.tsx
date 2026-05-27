import Link from "next/link";
import { Users, Heart, ArrowRight, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroBanner } from "@/features/dashboard/hero-banner";
import { FeaturedPokemon } from "@/features/dashboard/featured-pokemon";
import { SavedTeamsPreview } from "@/features/dashboard/saved-teams-preview";
import { WishlistPreview } from "@/features/dashboard/wishlist-preview";
import { DatabaseStrip } from "@/features/dashboard/database-strip";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <HeroBanner />

      <section className="grid items-stretch gap-6 lg:grid-cols-[1fr_1fr_320px]">
        <ColumnCard
          icon={Users}
          title="Mes équipes"
          href="/team-builder"
        >
          <SavedTeamsPreview />
        </ColumnCard>

        <ColumnCard icon={Heart} title="Wishlist" href="/wishlist">
          <WishlistPreview />
        </ColumnCard>

        <ColumnCard
          icon={Sparkles}
          title="Pokémon du jour"
          accent
        >
          <FeaturedPokemon />
        </ColumnCard>
      </section>

      <DatabaseStrip />
    </div>
  );
}

function ColumnCard({
  icon: Icon,
  title,
  href,
  accent = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={`flex h-full flex-col ${accent ? "bg-gradient-to-br from-card via-card to-primary/5" : ""}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <span className="grid size-7 place-items-center rounded-md border bg-background">
              <Icon className="size-4 text-muted-foreground" />
            </span>
            {title}
          </CardTitle>
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Tout voir
              <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}
