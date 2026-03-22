import { EIXOS } from "@/data/progression-data";
import { Progress } from "@/components/ui/progress";

type OverallProgressProps = {
  completedBlockIds: Set<string>;
};

export function OverallProgress({ completedBlockIds }: OverallProgressProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {EIXOS.map((eixo) => {
        const done = eixo.blocos.filter((b) =>
          completedBlockIds.has(b.id),
        ).length;
        const total = eixo.blocos.length;
        const percent = (done / total) * 100;

        return (
          <div
            key={eixo.id}
            className="rounded-lg border bg-card p-3 space-y-2"
            style={{ borderLeftWidth: 4, borderLeftColor: eixo.color }}
          >
            <p className="text-xs font-semibold truncate">{eixo.name}</p>
            <Progress
              value={percent}
              className="h-1.5"
              indicatorColor={eixo.color}
            />
            <p className="text-[10px] text-muted-foreground">
              {done}/{total} blocos
            </p>
          </div>
        );
      })}
    </div>
  );
}
