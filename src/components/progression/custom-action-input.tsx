import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CustomAction } from "@/data/types";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { DashedRowButton } from "@/components/ui/list-row";
import { HardButton } from "@/components/ui/hard-button";
import { Input } from "@/components/ui/input";
import { encodePlanKey } from "@/lib/plan-keys";
import { ActionItem } from "./action-item";

/** 44px delete target for a custom ação (never hidden behind hover). */
export function DeleteCustomButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remover"
      className="-my-2 grid size-11 shrink-0 place-items-center rounded-md text-[#8A887F] transition-colors hover:bg-[#FCE4E4] hover:text-[#C62828]"
    >
      <Trash2 className="size-5" aria-hidden />
    </button>
  );
}

type CustomActionRowsProps = {
  blocoId: string;
  customActions: CustomAction[];
  onToggle: (id: Id<"customActions">) => void;
  onDelete: (id: Id<"customActions">) => void;
  plannedKeys?: Set<string>;
  onTogglePlanned?: (itemKey: string) => void;
  lockApproved?: boolean;
};

/** The bloco's ações personalizadas, as ação rows inside the Variáveis list. */
export function CustomActionRows({
  blocoId,
  customActions,
  onToggle,
  onDelete,
  plannedKeys,
  onTogglePlanned,
  lockApproved,
}: CustomActionRowsProps) {
  return (
    <>
      {customActions
        .filter((c) => c.blocoId === blocoId)
        .map((action) => {
          const isLocked =
            !!lockApproved && action.completed && action.status !== "pending";
          const planKey = encodePlanKey({ kind: "custom", customActionId: action._id });
          return (
            <ActionItem
              key={action._id}
              id={`custom-${action._id}`}
              kind="Ação personalizada"
              text={action.text}
              checked={action.completed}
              status={action.status}
              onToggle={() => onToggle(action._id)}
              planned={plannedKeys?.has(planKey)}
              onTogglePlanned={onTogglePlanned ? () => onTogglePlanned(planKey) : undefined}
              lockApproved={lockApproved}
              trailing={!isLocked ? <DeleteCustomButton onClick={() => onDelete(action._id)} /> : null}
            />
          );
        })}
    </>
  );
}

/**
 * Dashed "+ Ação personalizada" row that opens a bottom sheet with a 48px
 * input — replaces the cramped inline input + 36px button.
 */
export function AddCustomAction({
  blocoId,
  onAdd,
}: {
  blocoId: string;
  onAdd: (blocoId: string, text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const trimmed = text.trim();

  const submit = () => {
    if (!trimmed) return;
    onAdd(blocoId, trimmed);
    setText("");
    setOpen(false);
  };

  return (
    <>
      <DashedRowButton onClick={() => setOpen(true)} testId="add-custom-action">
        <Plus className="size-6 shrink-0" strokeWidth={2.5} aria-hidden />
        Ação personalizada
      </DashedRowButton>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="Nova ação personalizada">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div>
              <p className="text-[16px] font-black">Nova ação personalizada</p>
              <p className="mt-0.5 text-[13px] text-[#4A4A44]">
                Conta como ação variável deste bloco depois que um escotista aprovar.
              </p>
            </div>
            <Input
              autoFocus
              aria-label="Ação personalizada"
              placeholder="Descreva a ação…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              data-testid="custom-action-text"
            />
            <div className="flex gap-2">
              <SheetClose asChild>
                <HardButton tone="paper" className="flex-1">
                  Cancelar
                </HardButton>
              </SheetClose>
              <HardButton type="submit" className="flex-1" disabled={!trimmed} data-testid="custom-action-submit">
                Adicionar
              </HardButton>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
