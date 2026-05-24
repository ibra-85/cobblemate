import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ALL_TYPES, calculateTypeEffectiveness } from "@/lib/type-chart";
import { TYPES_META } from "@/data/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Table des types · CobbleMate" };

function cellClass(m: number) {
  if (m === 0) return "bg-foreground/80 text-background";
  if (m === 0.5) return "bg-primary/15 text-foreground";
  if (m === 2) return "bg-destructive/15 text-destructive";
  return "text-muted-foreground";
}

export default function TypesPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Types & efficacité
        </h1>
        <p className="text-sm text-muted-foreground">
          Lignes : type attaquant. Colonnes : type défenseur. Survole une case
          pour voir la valeur exacte.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">× 1 (neutre)</Badge>
        <Badge variant="outline" className="border-destructive/30 text-destructive">
          × 2 (faiblesse)
        </Badge>
        <Badge variant="outline">× 0.5 (résistance)</Badge>
        <Badge variant="default">× 0 (immunité)</Badge>
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card p-2 text-left">
                  ATK \ DEF
                </th>
                {ALL_TYPES.map((t) => (
                  <th key={t} className="p-1">
                    <span
                      className="block rounded px-1 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: TYPES_META[t].color,
                        color: TYPES_META[t].fg,
                      }}
                    >
                      {TYPES_META[t].label.slice(0, 3)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_TYPES.map((atk) => (
                <tr key={atk} className="border-t">
                  <th className="sticky left-0 z-10 bg-card p-1 text-left">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: TYPES_META[atk].color,
                        color: TYPES_META[atk].fg,
                      }}
                    >
                      {TYPES_META[atk].label}
                    </span>
                  </th>
                  {ALL_TYPES.map((def) => {
                    const m = calculateTypeEffectiveness(atk, [def]);
                    return (
                      <td
                        key={def}
                        className={cn(
                          "p-1 text-center font-mono text-[10px]",
                          cellClass(m),
                        )}
                        title={`${TYPES_META[atk].label} → ${TYPES_META[def].label} = ×${m}`}
                      >
                        {m === 1 ? "·" : `×${m}`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doubles types</CardTitle>
          <CardDescription>
            Multiplie simplement les deux colonnes.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Ex : Glace sur un Dragon/Sol = ×2 × ×2 = <strong className="text-destructive">×4</strong>.
          Plante sur un Feu/Vol = ×0.5 × ×0.5 = <strong>×0.25</strong>.
        </CardContent>
      </Card>
    </div>
  );
}
