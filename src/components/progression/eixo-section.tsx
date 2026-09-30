import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Eixo } from "@/data/types";
import { eixoColor } from "@/data/eixo-colors";
import { ListBox } from "@/components/ui/section";
import { eixoMetaLine, type BlocoSummary } from "@/lib/bloco-summary";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import { BlocoRow } from "./bloco-card";

type EixoSectionProps = {
  eixo: Eixo;
  summaries: Map<string, BlocoSummary>;
  completedBlockIds: Set<string>;
  pendingBlockIds: Set<string>;
  escoteiroId?: Id<"users">;
  defaultOpen?: boolean;
};

/**
 * One eixo on Progressão (Design A frame 1): a static list with a collapsible
 * header — 8px eixo bar, 16/900 name, "2 de 4 blocos · 1 aguardando" — and one
 * BlocoRow per bloco. One level only: a bloco opens its own screen.
 */
export function EixoSection({
  eixo,
  summaries,
  completedBlockIds,
  pendingBlockIds,
  escoteiroId,
  defaultOpen = true,
}: EixoSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const color = eixoColor(eixo.id);
  const panelId = `eixo-${eixo.id}-blocos`;
  return (
    <ListBox className="mb-3" testId={`eixo-${eixo.id}`}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-14 w-full items-center gap-3 pr-3 text-left hover:bg-black/[0.02]"
        >
          <span
            aria-hidden
            className="w-2 shrink-0 self-stretch border-r-2 border-[#141414]"
            style={{ background: color }}
          />
          <span className="min-w-0 flex-1 py-3">
            <span className="block text-[16px] font-black leading-[1.15] tracking-[-0.01em]">
              {eixo.name}
            </span>
            <span className="mt-0.5 block text-[12px] font-bold text-[#8A887F]">
              {eixoMetaLine(eixo, completedBlockIds, pendingBlockIds)}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn("size-6 shrink-0 text-[#4A4A44] transition-transform", open && "rotate-180")}
            strokeWidth={2.5}
          />
        </button>
      </h3>
      {open && (
        <div id={panelId} className="border-t-2 border-[#141414]">
          {eixo.blocos.map((bloco) => {
            const summary = summaries.get(bloco.id);
            if (!summary) return null;
            return (
              <BlocoRow key={bloco.id} bloco={bloco} summary={summary} escoteiroId={escoteiroId} />
            );
          })}
        </div>
      )}
    </ListBox>
  );
}
