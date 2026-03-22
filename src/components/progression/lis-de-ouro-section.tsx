import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  LIS_DE_OURO_ITEMS,
  LIS_DE_OURO_COLOR,
} from "@/data/progression-rules";
import { Check, Lock, Trophy } from "lucide-react";

type LisDeOuroSectionProps = {
  blocksComplete: boolean;
  completedLisItemIds: Set<string>;
  lisDeOuro: boolean;
  onToggleItem: (itemId: string) => void;
};

export function LisDeOuroSection({
  blocksComplete,
  completedLisItemIds,
  lisDeOuro,
  onToggleItem,
}: LisDeOuroSectionProps) {
  const completedCount = LIS_DE_OURO_ITEMS.filter((item) =>
    item.auto ? blocksComplete : completedLisItemIds.has(item.id),
  ).length;
  const totalCount = LIS_DE_OURO_ITEMS.length;
  const percent = (completedCount / totalCount) * 100;

  return (
    <section className="rounded-xl overflow-hidden border bg-card shadow-sm">
      <div
        className="px-4 py-3 text-white"
        style={{ backgroundColor: LIS_DE_OURO_COLOR }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4" />
            <h2 className="font-bold text-base">Reconhecimento de Ramo</h2>
          </div>
          {lisDeOuro ? (
            <Badge className="bg-white/20 text-white text-[10px] px-1.5 py-0">
              <Check className="size-3 mr-0.5" />
              Completo
            </Badge>
          ) : (
            <span className="text-xs opacity-90">
              {completedCount}/{totalCount} requisitos
            </span>
          )}
        </div>
        <Progress
          value={percent}
          className="mt-2 h-1.5 bg-white/30 [&>[data-slot=progress-indicator]]:bg-white"
        />
      </div>

      <div className="p-3 space-y-1">
        {!blocksComplete && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-2">
            <Lock className="size-3.5 shrink-0" />
            <span>
              Complete todos os 18 blocos para desbloquear o checklist.
            </span>
          </div>
        )}

        {LIS_DE_OURO_ITEMS.map((item) => {
          const isAutoItem = item.auto;
          const isChecked = isAutoItem
            ? blocksComplete
            : completedLisItemIds.has(item.id);
          const isDisabled = !blocksComplete;

          return (
            <label
              key={item.id}
              htmlFor={item.id}
              className={`flex items-start gap-3 rounded-lg p-3 min-h-[44px] transition-colors ${
                isDisabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-muted/50 active:bg-muted"
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
                      }
                    : undefined
                }
              />
              <span
                className={`text-sm leading-relaxed ${isChecked ? "line-through text-muted-foreground" : ""}`}
              >
                {item.text}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
