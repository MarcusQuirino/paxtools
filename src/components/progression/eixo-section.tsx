import type { ReactNode } from "react";
import type { Eixo, CustomAction } from "@/data/types";
import { Accordion } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import type { ProgressionState } from "@/lib/progression-state";
import { BlocoCard } from "./bloco-card";
import type { Id } from "../../../convex/_generated/dataModel";

type EixoSectionProps = {
  eixo: Eixo;
  /** Extra content below the blocos (the plano's starred especialidades). */
  footer?: ReactNode;
  /** The escoteiro's progression state (src/lib/progression-state). */
  progression: ProgressionState<CustomAction>;
  onToggleAction: (actionId: string) => void;
  onAddCustom: (blocoId: string, text: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
  plannedKeys?: Set<string>;
  onTogglePlanned?: (itemKey: string) => void;
  blocoFilter?: (blocoId: string) => boolean;
  planOnly?: boolean;
  lockApproved?: boolean;
  /** Target scout in the escotista impersonation view (#53) — threads to the
   * specialty "ver" deep-link. */
  escoteiroId?: Id<"users">;
  onToggleBadgeRequirement?: (badgeId: string, requirementIndex: number) => void;
};

export function EixoSection({
  eixo,
  progression,
  onToggleAction,
  onAddCustom,
  onToggleCustom,
  onDeleteCustom,
  plannedKeys,
  onTogglePlanned,
  blocoFilter,
  planOnly,
  lockApproved,
  escoteiroId,
  footer,
  onToggleBadgeRequirement,
}: EixoSectionProps) {
  const visibleBlocos = blocoFilter
    ? eixo.blocos.filter((b) => blocoFilter(b.id))
    : eixo.blocos;
  if (visibleBlocos.length === 0 && !footer) return null;
  const approvedInEixo = eixo.blocos.filter((b) =>
    progression.completedBlockIds.has(b.id),
  ).length;
  const pendingInEixo = eixo.blocos.filter((b) =>
    progression.pendingBlockIds.has(b.id),
  ).length;
  const total = eixo.blocos.length;

  const approvedPercent = (approvedInEixo / total) * 100;
  const pendingPercent = (pendingInEixo / total) * 100;

  return (
    <section className="rounded-md overflow-hidden border-2 border-black bg-card">
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
            progression={progression}
            color={eixo.color}
            colorLight={eixo.colorLight}
            onToggleAction={onToggleAction}
            onAddCustom={onAddCustom}
            onToggleCustom={onToggleCustom}
            onDeleteCustom={onDeleteCustom}
            plannedKeys={plannedKeys}
            onTogglePlanned={onTogglePlanned}
            planOnly={planOnly}
            lockApproved={lockApproved}
            escoteiroId={escoteiroId}
            onToggleBadgeRequirement={onToggleBadgeRequirement}
          />
        ))}
      </Accordion>
      {footer}
    </section>
  );
}
