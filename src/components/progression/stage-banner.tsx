import type { Etapa, Irr } from "@/data/progression-rules";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type StageBannerProps = {
  etapas: Etapa[];
  irr: Irr;
  stage: Etapa;
  nextStage: Etapa | null;
  completedBlockCount: number;
  pendingBlockCount: number;
  irrComplete: boolean;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The etapa hero — the ONE heavy element of Progressão (emerald, 4px ink
 * shadow). 34/900 stage name, a dot→bar track of the ramo's etapas (3 or 4),
 * "Faltam N blocos para X" with a gold highlight, and a meta line with the
 * approved count and what's aguardando aprovação. The IRR-complete variant is
 * gold.
 */
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

  if (irrComplete) {
    return (
      <div
        data-testid="stage-hero"
        className="flex items-center gap-3 rounded-[10px] border-2 border-[#141414] bg-[#F4C430] p-4 text-[#141414] shadow-[4px_4px_0_#141414]"
      >
        <Trophy className="size-10 shrink-0" strokeWidth={2.2} aria-hidden />
        <div>
          <h2 className="text-[26px] font-black leading-[1.05] tracking-[-0.02em]">{irr.name}!</h2>
          <p className="mt-1 text-[15px] font-semibold">Parabéns! Reconhecimento de Ramo completo.</p>
        </div>
      </div>
    );
  }

  const target = nextStage
    ? { n: nextStage.blocksRequired - completedBlockCount, name: nextStage.name }
    : { n: Math.max(0, threshold - completedBlockCount), name: irr.name };
  const currentIndex = etapas.findIndex((e) => e.id === stage.id);

  return (
    <div
      data-testid="stage-hero"
      className="rounded-[10px] border-2 border-[#141414] bg-[#0E6B4E] p-4 text-white shadow-[4px_4px_0_#141414]"
    >
      <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-white/85">Etapa atual</p>
      <h2 className="mt-0.5 mb-3.5 text-[34px] font-black leading-none tracking-[-0.02em]">
        {stage.name}
      </h2>

      <ol
        className="mb-3 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
        aria-label="Etapas do ramo"
      >
        {etapas.map((e, i) => {
          const done = i < currentIndex;
          const cur = i === currentIndex;
          return (
            <li
              key={e.id}
              aria-current={cur ? "step" : undefined}
              className={cn(
                "min-w-0 text-center text-[12px] font-extrabold",
                done || cur ? "opacity-100" : "opacity-65",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mb-1.5 block h-2 rounded border-2",
                  cur
                    ? "border-[#141414] bg-[#F4C430]"
                    : done
                      ? "border-white bg-white"
                      : "border-white/50 bg-white/25",
                )}
              />
              <span className="block truncate">{e.name}</span>
            </li>
          );
        })}
      </ol>

      {target.n > 0 ? (
        <p className="text-[17px] font-extrabold leading-tight">
          Faltam{" "}
          <b className="rounded bg-[#F4C430] px-1.5 text-[#141414]">{plural(target.n, "bloco", "blocos")}</b>{" "}
          para {target.name}
        </p>
      ) : (
        <p className="text-[17px] font-extrabold leading-tight">
          Todos os blocos concluídos — falta o checklist da {irr.name}
        </p>
      )}
      <p className="mt-1 text-[13px] text-white/85" data-testid="stage-meta">
        {completedBlockCount} de {threshold} blocos concluídos
        {pendingBlockCount > 0 && ` · ${pendingBlockCount} aguardando aprovação`}
      </p>
    </div>
  );
}
