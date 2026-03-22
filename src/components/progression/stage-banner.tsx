import { LIS_DE_OURO_BLOCKS, STAGES } from "@/data/progression-rules";
import { getBlocksToLisDeOuro } from "@/lib/completion-logic";
import type { Stage } from "@/data/progression-rules";
import { Trophy } from "lucide-react";

type StageBannerProps = {
  stage: Stage;
  nextStage: Stage | null;
  completedBlockCount: number;
  lisDeOuro: boolean;
};

const STAGE_IMAGES: Record<string, string> = {
  pista: "/pista.png",
  trilha: "/trilha.png",
  rumo: "/rumo.png",
  travessia: "/travessia.png",
};

const STAGE_LABELS: Record<string, string> = {
  pista: "Pista",
  trilha: "Trilha",
  rumo: "Rumo",
  travessia: "Travessia",
};

export function StageBanner({
  stage,
  nextStage,
  completedBlockCount,
  lisDeOuro,
}: StageBannerProps) {
  const percent = (completedBlockCount / LIS_DE_OURO_BLOCKS) * 100;

  if (lisDeOuro) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Trophy className="size-10 drop-shadow" />
          <div>
            <h1 className="text-xl font-bold">Lis de Ouro!</h1>
            <p className="text-sm opacity-90">
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
    <div className="rounded-xl bg-gradient-to-r from-green-700 to-green-600 px-4 py-3 text-white shadow-lg">
      <div className="flex items-baseline justify-between mb-1.5">
        <div>
          <p className="text-[10px] uppercase tracking-wider opacity-80">
            Etapa Atual
          </p>
          <h1 className="text-lg font-bold text-white leading-tight">
            {STAGE_LABELS[stage.id] || stage.name}
          </h1>
        </div>
        <span className="text-xs opacity-80">
          {completedBlockCount}/{LIS_DE_OURO_BLOCKS} blocos
        </span>
      </div>

      {/* Progress bar with stage milestone images */}
      <div className="relative pt-5 pb-0.5">
        {/* Stage milestone images */}
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
                src={STAGE_IMAGES[s.id]}
                alt={STAGE_LABELS[s.id]}
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

        {/* The bar itself */}
        <div className="h-2 w-full rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {nextStage ? (
        <p className="text-[11px] opacity-80 mt-1 text-white">
          +{blocksToNext} bloco{blocksToNext !== 1 ? "s" : ""} para{" "}
          <strong>{STAGE_LABELS[nextStage.id] || nextStage.name}</strong>
        </p>
      ) : blocksToLis > 0 ? (
        <p className="text-[11px] opacity-80 mt-1 text-white">
          +{blocksToLis} bloco{blocksToLis !== 1 ? "s" : ""} para{" "}
          <strong>Lis de Ouro</strong>
        </p>
      ) : null}
    </div>
  );
}
