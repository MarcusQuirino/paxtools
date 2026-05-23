import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  LIS_DE_OURO_ITEMS,
  LIS_DE_OURO_COLOR,
} from "@/data/progression-rules";
import { Check, Clock, Lock, Trophy } from "lucide-react";

type LisDeOuroSectionProps = {
  blocksComplete: boolean;
  approvedLisItemIds: Set<string>;
  pendingLisItemIds: Set<string>;
  lisDeOuro: boolean;
  onToggleItem: (itemId: string) => void;
  lockApproved?: boolean;
};

export function LisDeOuroSection({
  blocksComplete,
  approvedLisItemIds,
  pendingLisItemIds,
  lisDeOuro,
  onToggleItem,
  lockApproved,
}: LisDeOuroSectionProps) {
  const approvedCount = LIS_DE_OURO_ITEMS.filter((item) =>
    item.auto ? blocksComplete : approvedLisItemIds.has(item.id),
  ).length;
  const pendingCount = LIS_DE_OURO_ITEMS.filter(
    (item) => !item.auto && pendingLisItemIds.has(item.id),
  ).length;
  const totalCount = LIS_DE_OURO_ITEMS.length;
  const approvedPercent = (approvedCount / totalCount) * 100;
  const pendingPercent = (pendingCount / totalCount) * 100;

  return (
    <section className="rounded-sm overflow-hidden border-2 border-black bg-card shadow-[3px_3px_0_0_#000]">
      <div
        className="px-4 py-3 text-white border-b-2 border-black"
        style={{ backgroundColor: LIS_DE_OURO_COLOR }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4" />
            <h2 className="font-black text-base uppercase tracking-wide">Reconhecimento de Ramo</h2>
          </div>
          {lisDeOuro ? (
            <Badge className="bg-white/20 text-white border-white text-[10px] px-1.5 py-0">
              <Check className="size-3 mr-0.5" />
              Completo
            </Badge>
          ) : (
            <span className="text-xs font-bold opacity-90">
              {approvedCount}/{totalCount} requisitos
              {pendingCount > 0 && ` (+${pendingCount})`}
            </span>
          )}
        </div>
        <Progress
          value={approvedPercent}
          pendingValue={pendingPercent}
          className="mt-2 border-white/60 bg-white/20 [&>[data-slot=progress-indicator]]:bg-white [&>[data-slot=progress-indicator-pending]]:bg-white"
        />
      </div>

      <div className="p-3 space-y-1">
        {!blocksComplete && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted border-2 border-black px-3 py-2 mb-2">
            <Lock className="size-3.5 shrink-0" />
            <span>
              Complete todos os 18 blocos para desbloquear o checklist.
            </span>
          </div>
        )}

        {LIS_DE_OURO_ITEMS.map((item) => {
          const isAutoItem = item.auto;
          const isApproved = isAutoItem
            ? blocksComplete
            : approvedLisItemIds.has(item.id);
          const isPending = !isAutoItem && pendingLisItemIds.has(item.id);
          const isChecked = isApproved || isPending;
          const isLocked = !!lockApproved && isApproved && !isAutoItem;
          const isDisabled = !blocksComplete || isLocked;

          return (
            <label
              key={item.id}
              htmlFor={item.id}
              className={`flex items-start gap-3 p-3 min-h-[44px] transition-colors ${
                isDisabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-muted"
              }`}
            >
              <Checkbox
                id={item.id}
                checked={isChecked}
                onCheckedChange={() => {
                  if (!isAutoItem) onToggleItem(item.id);
                }}
                disabled={isDisabled || isAutoItem}
                className="mt-0.5 size-5"
                style={
                  isChecked
                    ? {
                        backgroundColor: LIS_DE_OURO_COLOR,
                        borderColor: LIS_DE_OURO_COLOR,
                        opacity: isPending ? 0.4 : 1,
                      }
                    : undefined
                }
              />
              <span
                className={`text-sm leading-relaxed flex-1 ${
                  isChecked
                    ? isPending
                      ? "text-muted-foreground/60"
                      : "line-through text-muted-foreground"
                    : ""
                }`}
              >
                {item.text}
              </span>
              {isPending && (
                <Clock className="size-3.5 text-slate-400 mt-0.5 shrink-0" />
              )}
            </label>
          );
        })}
      </div>
    </section>
  );
}
