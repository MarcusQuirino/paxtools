import type { Eixo } from "@/data/types";
import { Progress } from "@/components/ui/progress";

type OverallProgressProps = {
  eixos: Eixo[];
  completedBlockIds: Set<string>;
  pendingBlockIds: Set<string>;
};

export function OverallProgress({
  eixos,
  completedBlockIds,
  pendingBlockIds,
}: OverallProgressProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {eixos.map((eixo) => {
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
            className="rounded-md border-2 border-black bg-card p-3 space-y-2 shadow-[3px_3px_0px_0px_#000]"
            style={{ borderLeftWidth: 4, borderLeftColor: eixo.color }}
          >
            <p className="text-xs font-black uppercase truncate">{eixo.name}</p>
            <Progress
              value={approvedPercent}
              pendingValue={pendingPercent}
              indicatorColor={eixo.color}
              pendingColor={eixo.color}
            />
            <p className="text-[10px] font-medium text-muted-foreground">
              {approved}/{total} blocos
              {pending > 0 && ` (+${pending})`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
