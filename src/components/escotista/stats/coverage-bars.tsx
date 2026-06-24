type EixoCoverageView = {
  eixoId: string;
  eixoName: string;
  coveragePct: number;
  fixedAvgCompletion: number;
  variableAvgCompletion: number;
  fixedCount: number;
  variableCount: number;
};

const CHART_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CoverageBars({ eixos }: { eixos: EixoCoverageView[] }) {
  return (
    <section
      className="space-y-3 rounded-md border-2 border-black bg-card p-4 shadow-[2px_2px_0px_0px_#000]"
      data-testid="stats-eixo-bars"
    >
      <h3 className="text-sm font-black uppercase">Cobertura por área</h3>
      {eixos.map((e, i) => {
        const pct = Math.round(e.coveragePct);
        return (
          <div key={e.eixoId} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="truncate">{e.eixoName}</span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full border-2 border-black bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, pct))}%`,
                  backgroundColor: CHART_VARS[i % CHART_VARS.length],
                }}
                role="meter"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${e.eixoName}: ${pct}%`}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Fixas {Math.round(e.fixedAvgCompletion * 100)}% · Variáveis{" "}
              {Math.round(e.variableAvgCompletion * 100)}%
            </p>
          </div>
        );
      })}
    </section>
  );
}
