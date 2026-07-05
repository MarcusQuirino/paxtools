import { getRamoRules } from "@/data/progression-rules";
import type { Ramo } from "@/data/progression-data";

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
    <section
      className="space-y-3 rounded-md border-2 border-black bg-card p-4 shadow-[2px_2px_0px_0px_#000]"
      data-testid="stats-stage-distribution"
    >
      <h3 className="text-sm font-black uppercase">Distribuição por etapa</h3>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
      >
        {etapas.map((s) => {
          const count = distribution[s.id] ?? 0;
          const pct = scoutCount === 0 ? 0 : Math.min(100, Math.round((count / scoutCount) * 100));
          return (
            <div
              key={s.id}
              className="rounded-md border-2 border-black bg-muted p-2 text-center"
            >
              <p className="text-xl font-black">{count}</p>
              <p className="text-[10px] font-bold text-muted-foreground">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">{pct}%</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
