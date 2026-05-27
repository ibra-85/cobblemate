import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/site/sidebar";
import { Header } from "@/components/site/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/site/theme-provider";
import { WishlistProvider } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "CobbleMate — compagnon Cobblemon 1.7",
  description:
    "Assistant moderne pour Cobblemon : Pokédex, builder d'équipe, assistant de combat, spawns, PokéSnacks et matchups de types.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn("h-full antialiased", mono.variable, "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider>
          <WishlistProvider>
            <TooltipProvider delay={200}>
              <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Header />
                  <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
                </div>
              </div>
              <Toaster richColors closeButton />
            </TooltipProvider>
          </WishlistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
