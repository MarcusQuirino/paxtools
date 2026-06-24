const STAGE_ORDER: { id: string; name: string }[] = [
  { id: "pista", name: "Pista" },
  { id: "trilha", name: "Trilha" },
  { id: "rumo", name: "Rumo" },
  { id: "travessia", name: "Travessia" },
];

export function StageDistribution({
  distribution,
  scoutCount,
}: {
  distribution: Record<string, number>;
  scoutCount: number;
}) {
  return (
    <section
      className="space-y-3 rounded-md border-2 border-black bg-card p-4 shadow-[2px_2px_0px_0px_#000]"
      data-testid="stats-stage-distribution"
    >
      <h3 className="text-sm font-black uppercase">Distribuição por etapa</h3>
      <div className="grid grid-cols-4 gap-2">
        {STAGE_ORDER.map((s) => {
          const count = distribution[s.id] ?? 0;
          const pct = scoutCount === 0 ? 0 : Math.round((count / scoutCount) * 100);
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
