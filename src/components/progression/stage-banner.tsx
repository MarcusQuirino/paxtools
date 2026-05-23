import { LIS_DE_OURO_BLOCKS, STAGES } from "@/data/progression-rules";
import { getBlocksToLisDeOuro } from "@/lib/completion-logic";
import type { Stage } from "@/data/progression-rules";
import { Trophy } from "lucide-react";

type StageBannerProps = {
  stage: Stage;
  nextStage: Stage | null;
  completedBlockCount: number;
  pendingBlockCount: number;
  lisDeOuro: boolean;
};

export function StageBanner({
  stage,
  nextStage,
  completedBlockCount,
  pendingBlockCount,
  lisDeOuro,
}: StageBannerProps) {
  const approvedPercent = (completedBlockCount / LIS_DE_OURO_BLOCKS) * 100;
  const pendingPercent = (pendingBlockCount / LIS_DE_OURO_BLOCKS) * 100;

  if (lisDeOuro) {
    return (
      <div className="rounded-md border-2 border-black bg-yellow-400 p-5 text-black shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center gap-3">
          <Trophy className="size-10" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Lis de Ouro!</h1>
            <p className="text-sm font-medium">
              Parabéns! Reconhecimento de Ramo completo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const blocksToNext = nextStage
    ? nextStage.blocksRequired - completedBlockCount
    : 0;
  const blocksToLis = getBlocksToLisDeOuro(completedBlockCount);

  return (
    <div className="rounded-md border-2 border-black bg-emerald-700 px-4 py-3 text-white shadow-[4px_4px_0px_0px_#065f46]">
      <div className="flex items-baseline justify-between mb-1.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
            Etapa Atual
          </p>
          <h1 className="text-lg font-black text-white leading-tight uppercase">
            {stage.name}
          </h1>
        </div>
        <span className="text-xs font-bold opacity-80">
          {completedBlockCount}/{LIS_DE_OURO_BLOCKS} blocos
          {pendingBlockCount > 0 && ` (+${pendingBlockCount})`}
        </span>
      </div>

      <div className="relative pt-5 pb-0.5">
        {STAGES.map((s) => {
          const position = (s.blocksRequired / LIS_DE_OURO_BLOCKS) * 100;
          const isCompleted = completedBlockCount >= s.blocksRequired;
          const isCurrent = s.id === stage.id;
          return (
            <div
              key={s.id}
              className="absolute -top-0.5 z-10 flex flex-col items-center"
              style={{
                left: `${position}%`,
                transform: "translateX(-50%)",
              }}
            >
              <img
                src={s.image}
                alt={s.name}
                className={`size-7 rounded transition-all ${
                  isCurrent
                    ? "ring-2 ring-white scale-110"
                    : isCompleted
                      ? "opacity-100"
                      : "opacity-40 grayscale"
                }`}
              />
            </div>
          );
        })}

        <div className="h-3 w-full rounded-sm border-2 border-white/60 bg-white/20 relative overflow-hidden">
          {pendingPercent > 0 && (
            <div
              className="absolute inset-0 h-full rounded-sm bg-white/40 transition-all"
              style={{ width: `${approvedPercent + pendingPercent}%` }}
            />
          )}
          <div
            className="absolute inset-0 h-full rounded-sm bg-white transition-all"
            style={{ width: `${approvedPercent}%` }}
          />
        </div>
      </div>

      {nextStage ? (
        <p className="text-[11px] font-bold opacity-80 mt-1 text-white">
          +{blocksToNext} bloco{blocksToNext !== 1 ? "s" : ""} para{" "}
          <strong>{nextStage.name}</strong>
        </p>
      ) : blocksToLis > 0 ? (
        <p className="text-[11px] font-bold opacity-80 mt-1 text-white">
          +{blocksToLis} bloco{blocksToLis !== 1 ? "s" : ""} para{" "}
          <strong>Lis de Ouro</strong>
        </p>
      ) : null}
    </div>
  );
}
