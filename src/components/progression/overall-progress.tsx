import { EIXOS } from "@/data/progression-data";
import { Progress } from "@/components/ui/progress";

type OverallProgressProps = {
  completedBlockIds: Set<string>;
  pendingBlockIds: Set<string>;
};

export function OverallProgress({
  completedBlockIds,
  pendingBlockIds,
}: OverallProgressProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {EIXOS.map((eixo) => {
        const approved = eixo.blocos.filter((b) =>
          completedBlockIds.has(b.id),
        ).length;
        const pending = eixo.blocos.filter((b) =>
          pendingBlockIds.has(b.id),
        ).length;
        const total = eixo.blocos.length;
        const approvedPercent = (approved / total) * 100;
        const pendingPercent = (pending / total) * 100;

        return (
          <div
            key={eixo.id}
            className="rounded-lg border bg-card p-3 space-y-2"
            style={{ borderLeftWidth: 4, borderLeftColor: eixo.color }}
          >
            <p className="text-xs font-semibold truncate">{eixo.name}</p>
            <Progress
              value={approvedPercent}
              pendingValue={pendingPercent}
              className="h-1.5"
              indicatorColor={eixo.color}
              pendingColor={eixo.color}
            />
            <p className="text-[10px] text-muted-foreground">
              {approved}/{total} blocos
              {pending > 0 && ` (+${pending})`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
