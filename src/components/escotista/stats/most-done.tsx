type ActivityCoverageView = {
  actionId: string;
  blocoId: string;
  eixoId: string;
  eixoName: string;
  type: "fixed" | "variable";
  text: string;
  completedCount: number;
};

export function MostDone({
  activities,
  scoutCount,
}: {
  activities: ActivityCoverageView[];
  scoutCount: number;
}) {
  const top = activities.slice(0, 5);
  return (
    <section
      className="space-y-3 rounded-md border-2 border-black bg-card p-4 shadow-[2px_2px_0px_0px_#000]"
      data-testid="stats-most-done"
    >
      <h3 className="text-sm font-black uppercase">Mais realizadas</h3>
      <ul className="space-y-2">
        {top.map((a) => {
          const pct = scoutCount === 0 ? 0 : Math.round((a.completedCount / scoutCount) * 100);
          return (
            <li key={a.actionId} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="line-clamp-2 font-medium">{a.text}</span>
                <span className="shrink-0 font-bold text-muted-foreground">
                  {a.completedCount}/{scoutCount}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
