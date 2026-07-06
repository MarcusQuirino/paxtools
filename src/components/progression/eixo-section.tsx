import type { Eixo, CustomAction, CompletionStatus } from "@/data/types";
import { Accordion } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { BlocoCard } from "./bloco-card";
import type { Id } from "../../../convex/_generated/dataModel";

type EixoSectionProps = {
  eixo: Eixo;
  approvedActionIds: Set<string>;
  pendingActionIds: Set<string>;
  actionStatusMap: Map<string, CompletionStatus>;
  completedBlockIds: Set<string>;
  pendingBlockIds: Set<string>;
  /** Blocos satisfied via an earned especialidade (level ≥ 1), computed on read (#44). */
  earnedSpecialtyBlocoIds?: Set<string>;
  /** Canonical ids of specialties earned via items (#44), for marking the exact checkbox. */
  earnedSpecialtyIds?: Set<string>;
  customActions: CustomAction[];
  completedSpecialties: {
    blocoId: string;
    specialtyName: string;
    status: CompletionStatus;
  }[];
  onToggleAction: (actionId: string) => void;
  onToggleSpecialty: (blocoId: string, specialtyName: string) => void;
  onAddCustom: (blocoId: string, text: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
  plannedKeys?: Set<string>;
  onTogglePlanned?: (itemKey: string) => void;
  blocoFilter?: (blocoId: string) => boolean;
  planOnly?: boolean;
  lockApproved?: boolean;
};

export function EixoSection({
  eixo,
  approvedActionIds,
  pendingActionIds,
  actionStatusMap,
  completedBlockIds,
  pendingBlockIds,
  earnedSpecialtyBlocoIds,
  earnedSpecialtyIds,
  customActions,
  completedSpecialties,
  onToggleAction,
  onToggleSpecialty,
  onAddCustom,
  onToggleCustom,
  onDeleteCustom,
  plannedKeys,
  onTogglePlanned,
  blocoFilter,
  planOnly,
  lockApproved,
}: EixoSectionProps) {
  const visibleBlocos = blocoFilter
    ? eixo.blocos.filter((b) => blocoFilter(b.id))
    : eixo.blocos;
  if (visibleBlocos.length === 0) return null;
  const approvedInEixo = eixo.blocos.filter((b) =>
    completedBlockIds.has(b.id),
  ).length;
  const pendingInEixo = eixo.blocos.filter((b) =>
    pendingBlockIds.has(b.id),
  ).length;
  const total = eixo.blocos.length;

  const approvedPercent = (approvedInEixo / total) * 100;
  const pendingPercent = (pendingInEixo / total) * 100;

  return (
    <section className="rounded-md overflow-hidden border-2 border-black bg-card shadow-[4px_4px_0px_0px_#065f46]">
      <div
        className="px-4 py-3 text-white border-b-2 border-black"
        style={{ backgroundColor: eixo.color }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-black text-base uppercase tracking-tight">{eixo.name}</h2>
          <span className="text-xs font-bold opacity-90">
            {approvedInEixo}/{total} blocos
            {pendingInEixo > 0 && ` (+${pendingInEixo} pendente${pendingInEixo > 1 ? "s" : ""})`}
          </span>
        </div>
        <Progress
          value={approvedPercent}
          pendingValue={pendingPercent}
          className="mt-2 border-white/60 bg-white/20 [&>[data-slot=progress-indicator]]:bg-white [&>[data-slot=progress-indicator-pending]]:bg-white/50"
        />
      </div>

      <Accordion type="single" collapsible>
        {visibleBlocos.map((bloco) => (
          <BlocoCard
            key={bloco.id}
            bloco={bloco}
            approvedActionIds={approvedActionIds}
            pendingActionIds={pendingActionIds}
            actionStatusMap={actionStatusMap}
            customActions={customActions}
            completedSpecialties={completedSpecialties}
            earnedViaSpecialty={earnedSpecialtyBlocoIds?.has(bloco.id)}
            earnedSpecialtyIds={earnedSpecialtyIds}
            color={eixo.color}
            colorLight={eixo.colorLight}
            onToggleAction={onToggleAction}
            onToggleSpecialty={onToggleSpecialty}
            onAddCustom={onAddCustom}
            onToggleCustom={onToggleCustom}
            onDeleteCustom={onDeleteCustom}
            plannedKeys={plannedKeys}
            onTogglePlanned={onTogglePlanned}
            planOnly={planOnly}
            lockApproved={lockApproved}
          />
        ))}
      </Accordion>
    </section>
  );
}
