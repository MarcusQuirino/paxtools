import { Card, Section } from "@/components/ui/section";
import { eixoColor } from "@/data/eixo-colors";

type EixoCoverageView = {
  eixoId: string;
  eixoName: string;
  coveragePct: number;
  fixedAvgCompletion: number;
  variableAvgCompletion: number;
  fixedCount: number;
  variableCount: number;
};

/** One bar per eixo in its own colour (eixo-colors.ts), 12px meta under it. */
export function CoverageBars({ eixos }: { eixos: EixoCoverageView[] }) {
  return (
    <Section label="Cobertura por área" first>
      <Card testId="stats-eixo-bars" className="space-y-3.5">
        {eixos.map((e) => {
          const pct = Math.min(100, Math.max(0, Math.round(e.coveragePct)));
          return (
            <div key={e.eixoId}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[15px] font-extrabold leading-tight">
                  {e.eixoName}
                </span>
                <span className="shrink-0 text-[15px] font-black tabular-nums">{pct}%</span>
              </div>
              <div
                className="mt-1.5 h-3 overflow-hidden rounded-md border-2 border-[#141414] bg-[#EEE9DC]"
                role="meter"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${e.eixoName}: ${pct}%`}
              >
                <div
                  className="h-full transition-[width]"
                  style={{ width: `${pct}%`, background: eixoColor(e.eixoId) }}
                />
              </div>
              <p className="mt-1 text-[12px] font-bold text-[#8A887F]">
                Fixas {Math.round(e.fixedAvgCompletion * 100)}% · Variáveis{" "}
                {Math.round(e.variableAvgCompletion * 100)}%
              </p>
            </div>
          );
        })}
      </Card>
    </Section>
  );
}
