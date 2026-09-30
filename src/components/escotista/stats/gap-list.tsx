import { EmptyState } from "@/components/ui/empty-state";
import { ListBox, ListHeader } from "@/components/ui/section";
import { ListRow } from "@/components/ui/list-row";
import { eixoColor } from "@/data/eixo-colors";

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
    <ListRow
      bar={eixoColor(a.eixoId)}
      title={<span className="line-clamp-2 font-semibold">{a.text}</span>}
      subtitle={
        <span className="text-[#4A4A44]">
          {missing} de {scoutCount} ainda precisam · {a.eixoName}
        </span>
      }
    />
  );
}

export function GapList({
  topGapsFixed,
  neglectedVariable,
  scoutCount,
  eixoFilter,
  typeFilter,
}: GapListProps) {
  const byEixo = (a: ActivityCoverageView) => eixoFilter === "all" || a.eixoId === eixoFilter;
  const fixed = typeFilter === "variable" ? [] : topGapsFixed.filter(byEixo).slice(0, 8);
  const variable = typeFilter === "fixed" ? [] : neglectedVariable.filter(byEixo).slice(0, 5);

  return (
    <section className="space-y-3" data-testid="stats-gap-list">
      {fixed.length > 0 && (
        <ListBox testId="stats-gap-fixed">
          <ListHeader label="Fixas pendentes" meta={fixed.length} />
          {fixed.map((a) => (
            <GapRow key={a.actionId} a={a} scoutCount={scoutCount} />
          ))}
        </ListBox>
      )}

      {variable.length > 0 && (
        <ListBox testId="stats-gap-variable">
          <ListHeader label="Variáveis pouco exploradas" meta={variable.length} />
          {variable.map((a) => (
            <GapRow key={a.actionId} a={a} scoutCount={scoutCount} />
          ))}
        </ListBox>
      )}

      {fixed.length === 0 && variable.length === 0 && (
        <EmptyState>Nenhuma lacuna neste filtro.</EmptyState>
      )}
    </section>
  );
}

