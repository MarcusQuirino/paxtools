import { KpiTile } from "@/components/ui/kpi-tile";
import { Section } from "@/components/ui/section";
import { getRamoRules } from "@/data/progression-rules";
import type { Ramo } from "@/data/progression-data";
import { cn } from "@/lib/utils";

/**
 * Scouts per etapa as KPI tiles (2×2 for 4 etapas, 3 across for 3). The count
 * sits in its own span so it reads as the tile's number; the share is meta.
 */
export function StageDistribution({
  ramo,
  distribution,
  scoutCount,
}: {
  ramo: Ramo;
  distribution: Record<string, number>;
  scoutCount: number;
}) {
  const etapas = getRamoRules(ramo).etapas;
  return (
    <Section label="Distribuição por etapa" meta={`${scoutCount} no ramo`}>
      <div
        className={cn("grid gap-2", etapas.length === 3 ? "grid-cols-3" : "grid-cols-2")}
        data-testid="stats-stage-distribution"
      >
        {etapas.map((s) => {
          const count = distribution[s.id] ?? 0;
          const pct =
            scoutCount === 0 ? 0 : Math.min(100, Math.round((count / scoutCount) * 100));
          return (
            <KpiTile
              key={s.id}
              value={
                <>
                  <span>{count}</span>
                  <span className="ml-1.5 text-[13px] font-extrabold text-[#8A887F]">
                    {pct}%
                  </span>
                </>
              }
              label={s.name}
            />
          );
        })}
      </div>
    </Section>
  );
}
