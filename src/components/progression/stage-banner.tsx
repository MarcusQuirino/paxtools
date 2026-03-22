import { Progress } from "@/components/ui/progress";
import { LIS_DE_OURO_BLOCKS } from "@/data/progression-rules";
import type { Stage } from "@/data/progression-rules";
import { Trophy, Star } from "lucide-react";

type StageBannerProps = {
  stage: Stage;
  nextStage: Stage | null;
  completedBlockCount: number;
  lisDeOuro: boolean;
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
              Parabéns! Todos os 18 blocos completos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const blocksToNext = nextStage
    ? nextStage.blocksRequired - completedBlockCount
    : 0;

  return (
    <div className="rounded-xl bg-gradient-to-r from-green-700 to-green-600 p-5 text-white shadow-lg">
      <div className="flex items-center gap-3 mb-3">
        <Star className="size-8 drop-shadow" />
        <div>
          <p className="text-xs uppercase tracking-wider opacity-80">
            Etapa Atual
          </p>
          <h1 className="text-xl font-bold">
            {STAGE_LABELS[stage.id] || stage.name}
          </h1>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{completedBlockCount}/{LIS_DE_OURO_BLOCKS} blocos completos</span>
          <span className="opacity-80">Lis de Ouro</span>
        </div>
        <Progress
          value={percent}
          className="h-2.5 bg-white/30 [&>[data-slot=progress-indicator]]:bg-white"
        />
        {nextStage && (
          <p className="text-xs opacity-80 mt-1">
            Complete mais {blocksToNext} bloco{blocksToNext !== 1 ? "s" : ""}{" "}
            para avançar para{" "}
            <strong>{STAGE_LABELS[nextStage.id] || nextStage.name}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
