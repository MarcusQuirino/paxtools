import { ListBox, Section } from "@/components/ui/section";
import { ListRow } from "@/components/ui/list-row";
import { MiniBar } from "@/components/ui/progress-ring";
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

export function MostDone({
  activities,
  scoutCount,
}: {
  activities: ActivityCoverageView[];
  scoutCount: number;
}) {
  const top = activities.slice(0, 5);
  return (
    <Section label="Mais realizadas" meta="top 5">
      <ListBox testId="stats-most-done">
        {top.map((a) => {
          const pct = scoutCount === 0 ? 0 : Math.min(100, Math.round((a.completedCount / scoutCount) * 100));
          const color = eixoColor(a.eixoId);
          return (
            <ListRow
              key={a.actionId}
              tall
              bar={color}
              title={<span className="line-clamp-2 font-semibold">{a.text}</span>}
              subtitle={`${a.completedCount} de ${scoutCount} · ${a.eixoName}`}
              extra={
                <span
                  role="meter"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${a.text}: ${a.completedCount}/${scoutCount}`}
                  className="block"
                >
                  <MiniBar pct={pct} color={color} width={140} />
                </span>
              }
            />
          );
        })}
      </ListBox>
    </Section>
  );
}
