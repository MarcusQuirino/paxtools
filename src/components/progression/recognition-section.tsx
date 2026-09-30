import { Lock } from "lucide-react";
import type { Irr } from "@/data/progression-rules";
import { ActionCheck } from "@/components/ui/action-check";
import { EmptyState } from "@/components/ui/empty-state";
import { ListBox, ListHeader, Section } from "@/components/ui/section";
import { StatusPill, StatusText } from "@/components/ui/status-pill";
import { EMERALD } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type RecognitionSectionProps = {
  irr: Irr;
  blocksComplete: boolean;
  approvedIrrItemIds: Set<string>;
  pendingIrrItemIds: Set<string>;
  irrComplete: boolean;
  onToggleItem: (itemId: string) => void;
  lockApproved?: boolean;
};

/**
 * "Reconhecimento de Ramo" (Design A): a neutral locked row until the 18
 * blocos are done, then the IRR checklist with semantic ActionCheck states.
 */
export function RecognitionSection({
  irr,
  blocksComplete,
  approvedIrrItemIds,
  pendingIrrItemIds,
  irrComplete,
  onToggleItem,
  lockApproved,
}: RecognitionSectionProps) {
  const total = irr.items.length;

  if (!blocksComplete) {
    return (
      <Section label="Reconhecimento de Ramo">
        <EmptyState
          icon={<Lock strokeWidth={2.2} aria-hidden />}
          title={irr.name}
          testId="irr-locked"
        >
          Complete todos os {irr.blockThreshold} blocos para desbloquear o checklist · {total} requisitos
        </EmptyState>
      </Section>
    );
  }

  const approvedCount = irr.items.filter((item) =>
    item.auto ? blocksComplete : approvedIrrItemIds.has(item.id),
  ).length;
  const pendingCount = irr.items.filter(
    (item) => !item.auto && pendingIrrItemIds.has(item.id),
  ).length;

  return (
    <Section
      label="Reconhecimento de Ramo"
      meta={irrComplete ? <StatusPill state="approved">Completo</StatusPill> : undefined}
    >
      <ListBox testId="irr-checklist">
        <ListHeader
          label={irr.name}
          meta={
            <span style={irrComplete ? { color: EMERALD } : undefined}>
              {approvedCount}/{total} requisitos
              {pendingCount > 0 && ` · ${pendingCount} aguardando`}
            </span>
          }
        />
        {irr.items.map((item) => {
          const isApproved = item.auto ? blocksComplete : approvedIrrItemIds.has(item.id);
          const isPending = !item.auto && !isApproved && pendingIrrItemIds.has(item.id);
          const state = isApproved ? "approved" : isPending ? "pending" : "open";
          const disabled = item.auto || (!!lockApproved && isApproved);
          return (
            <div
              key={item.id}
              data-state={state}
              className="flex min-h-14 items-start gap-3 border-t-[1.5px] border-[#D9D5C9] py-3 pr-3 pl-3 first:border-t-0"
            >
              <ActionCheck
                id={item.id}
                state={state}
                onClick={() => onToggleItem(item.id)}
                disabled={disabled}
                ariaLabel={item.text}
              />
              <div
                className={cn("min-w-0 flex-1 pt-0.5", !disabled && "cursor-pointer")}
                onClick={disabled ? undefined : () => onToggleItem(item.id)}
              >
                <span
                  className={cn(
                    "block text-[15px] leading-[1.4]",
                    state === "approved" && "text-[#8A887F] line-through decoration-[#0E6B4E]",
                  )}
                >
                  {item.text}
                </span>
                <StatusText state={state}>
                  {item.auto && isApproved ? "Automático · 18 blocos" : undefined}
                </StatusText>
              </div>
            </div>
          );
        })}
      </ListBox>
    </Section>
  );
}
