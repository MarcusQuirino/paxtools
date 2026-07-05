import type { Etapa, Irr } from "@/data/progression-rules";
import { Trophy } from "lucide-react";

type StageBannerProps = {
  etapas: Etapa[];
  irr: Irr;
  stage: Etapa;
  nextStage: Etapa | null;
  completedBlockCount: number;
  pendingBlockCount: number;
  irrComplete: boolean;
};

export function StageBanner({
  etapas,
  irr,
  stage,
  nextStage,
  completedBlockCount,
  pendingBlockCount,
  irrComplete,
}: StageBannerProps) {
  const threshold = irr.blockThreshold;
  const approvedPercent = (completedBlockCount / threshold) * 100;
  const pendingPercent = (pendingBlockCount / threshold) * 100;

  if (irrComplete) {
    return (
      <div className="rounded-md border-2 border-black bg-yellow-400 p-5 text-black shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center gap-3">
          <Trophy className="size-10" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">{irr.name}!</h1>
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
  const remainingToIrr = Math.max(0, threshold - completedBlockCount);

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
          {completedBlockCount}/{threshold} blocos
          {pendingBlockCount > 0 && ` (+${pendingBlockCount})`}
        </span>
      </div>

      <div className="relative pt-5 pb-2">
        {etapas.map((s) => {
          const position = (s.blocksRequired / threshold) * 100;
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
              {s.image ? (
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
              ) : (
                <span
                  aria-label={s.name}
                  className={`grid size-7 place-items-center rounded-full border-2 border-white bg-white/20 text-[10px] font-black transition-all ${
                    isCurrent
                      ? "ring-2 ring-white scale-110 bg-white text-emerald-800"
                      : isCompleted
                        ? "opacity-100"
                        : "opacity-40"
                  }`}
                >
                  {s.name.charAt(0)}
                </span>
              )}
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
      ) : remainingToIrr > 0 ? (
        <p className="text-[11px] font-bold opacity-80 mt-1 text-white">
          +{remainingToIrr} bloco{remainingToIrr !== 1 ? "s" : ""} para{" "}
          <strong>{irr.name}</strong>
        </p>
      ) : null}
    </div>
  );
}
