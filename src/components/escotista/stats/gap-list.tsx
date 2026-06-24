type ActivityCoverageView = {
  actionId: string;
  blocoId: string;
  eixoId: string;
  eixoName: string;
  type: "fixed" | "variable";
  text: string;
  completedCount: number;
};

type GapListProps = {
  topGapsFixed: ActivityCoverageView[];
  neglectedVariable: ActivityCoverageView[];
  scoutCount: number;
  eixoFilter: string;
  typeFilter: "all" | "fixed" | "variable";
};

function GapRow({ a, scoutCount }: { a: ActivityCoverageView; scoutCount: number }) {
  const missing = Math.max(0, scoutCount - a.completedCount);
  return (
    <li className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/40 p-2 text-xs">
      <span className="line-clamp-2 font-medium">{a.text}</span>
      <span className="shrink-0 font-bold text-amber-700">
        {missing} de {scoutCount} ainda precisam
      </span>
    </li>
  );
}

export function GapList({
  topGapsFixed,
  neglectedVariable,
  scoutCount,
  eixoFilter,
  typeFilter,
}: GapListProps) {
  const byEixo = (a: ActivityCoverageView) =>
    eixoFilter === "all" || a.eixoId === eixoFilter;
  const fixed =
    typeFilter === "variable" ? [] : topGapsFixed.filter(byEixo).slice(0, 8);
  const variable =
    typeFilter === "fixed" ? [] : neglectedVariable.filter(byEixo).slice(0, 5);

  return (
    <section
      className="space-y-4 rounded-md border-2 border-black bg-card p-4 shadow-[2px_2px_0px_0px_#000]"
      data-testid="stats-gap-list"
    >
      <h3 className="text-sm font-black uppercase">Lacunas</h3>

      {fixed.length > 0 && (
        <div className="space-y-2" data-testid="stats-gap-fixed">
          <p className="text-xs font-bold uppercase text-muted-foreground">
            Atividades fixas pendentes
          </p>
          <ul className="space-y-1.5">
            {fixed.map((a) => (
              <GapRow key={a.actionId} a={a} scoutCount={scoutCount} />
            ))}
          </ul>
        </div>
      )}

      {variable.length > 0 && (
        <div className="space-y-2 opacity-80" data-testid="stats-gap-variable">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">
            Variáveis pouco exploradas
          </p>
          <ul className="space-y-1.5">
            {variable.map((a) => (
              <GapRow key={a.actionId} a={a} scoutCount={scoutCount} />
            ))}
          </ul>
        </div>
      )}

      {fixed.length === 0 && variable.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma lacuna neste filtro.</p>
      )}
    </section>
  );
}
