import { useLayoutEffect, useRef } from "react";
import type { RevisaoCard } from "@/lib/revisao-deck";
import type { SwipeKind } from "@/lib/revisao-session";
import {
  dragStamp,
  resolveDrag,
  type DragOutcome,
} from "@/lib/revisao-gesture";
import { cn } from "@/lib/utils";

/** Where a swiped card flies off to. */
const FLING: Record<SwipeKind, string> = {
  done: "translate(140%, 0) rotate(20deg)",
  skip: "translate(-140%, 0) rotate(-20deg)",
  plan: "translate(0, -130%)",
};

const STAMPS: { kind: SwipeKind; label: string; className: string }[] = [
  {
    kind: "done",
    label: "Já fiz",
    className: "left-4 top-[22%] -rotate-[14deg] text-green-600",
  },
  {
    kind: "skip",
    label: "Não",
    className: "right-4 top-[22%] rotate-[14deg] text-red-600",
  },
  {
    kind: "plan",
    label: "⭐ Plano",
    className: "bottom-[18%] left-1/2 -translate-x-1/2 text-yellow-700",
  },
];

type SwipeCardProps = {
  card: RevisaoCard;
  /** Show "⭐ No seu plano" (escoteiro mode only). */
  showPlanTag: boolean;
  /** The card underneath: static, slightly scaled down. */
  under?: boolean;
  planEnabled?: boolean;
  canUndo?: boolean;
  /** Set when the card is being swiped away; flies it off with its stamp. */
  leaving?: SwipeKind | null;
  /** A drag released past the threshold. */
  onRelease?: (outcome: DragOutcome) => void;
};

/**
 * One Revisão rápida card: eixo-colored header, ação text and tags. The top card is dragged with plain pointer events;
 * transform/stamps are written straight to the DOM so a drag never re-renders.
 */
export function SwipeCard({
  card,
  showPlanTag,
  under = false,
  planEnabled = false,
  canUndo = false,
  leaving = null,
  onRelease,
}: SwipeCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const stampRefs = useRef<Partial<Record<SwipeKind, HTMLDivElement | null>>>(
    {},
  );
  const drag = useRef<{ x: number; y: number; dx: number; dy: number } | null>(
    null,
  );

  const setStamp = (kind: SwipeKind | null, opacity: number) => {
    for (const s of STAMPS) {
      const el = stampRefs.current[s.kind];
      if (el) el.style.opacity = s.kind === kind ? String(opacity) : "0";
    }
  };

  const snapBack = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform .25s";
    el.style.transform = "";
    setStamp(null, 0);
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!leaving || !el) return;
    setStamp(leaving, 1);
    el.style.transition = "transform .28s ease-in";
    el.style.transform = FLING[leaving];
  }, [leaving]);

  const interactive = !under && !leaving;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-drag]")) return;
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = "none";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.dx = e.clientX - d.x;
    d.dy = e.clientY - d.y;
    e.currentTarget.style.transform = `translate(${d.dx}px, ${d.dy}px) rotate(${d.dx / 18}deg)`;
    const stamp = dragStamp(d, planEnabled);
    setStamp(stamp?.kind ?? null, stamp?.opacity ?? 0);
  };

  const onPointerEnd = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const outcome = resolveDrag(d, { planEnabled, canUndo });
    if (!outcome || outcome === "undo") snapBack();
    if (outcome) onRelease?.(outcome);
  };

  return (
    <div
      ref={ref}
      data-testid={under ? undefined : "revisao-card"}
      aria-hidden={under || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      className={cn(
        "absolute inset-0 flex select-none flex-col overflow-hidden rounded-lg border-2 border-black bg-white shadow-[5px_5px_0px_0px_#000] will-change-transform",
        under && "pointer-events-none translate-y-2.5 scale-95 brightness-[.97]",
      )}
    >
      <div
        className="cursor-grab touch-none border-b-2 border-black px-4 py-3 text-white"
        style={{ backgroundColor: card.eixo.color }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-90">
          {card.eixo.name}
        </p>
        <p className="mt-0.5 text-base font-black uppercase leading-tight">
          {card.bloco.name}
        </p>
      </div>

      <div className="flex-1 touch-none overflow-y-auto p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Tag>{card.actionType === "fixed" ? "Fixa" : "Variável"}</Tag>
          {showPlanTag && card.inPlano && (
            <Tag className="bg-yellow-400">⭐ No seu plano</Tag>
          )}
          {card.blocoComplete && (
            <Tag className="bg-gray-300">Bloco já completo</Tag>
          )}
        </div>
        <p
          data-testid={under ? undefined : "revisao-card-text"}
          className="text-lg font-bold leading-snug"
        >
          {card.text}
        </p>
      </div>

      {STAMPS.map((s) => (
        <div
          key={s.kind}
          ref={(el) => {
            stampRefs.current[s.kind] = el;
          }}
          className={cn(
            "pointer-events-none absolute rounded-lg border-4 border-current bg-white px-3 py-1 text-2xl font-black uppercase opacity-0",
            s.className,
          )}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}

function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded border-2 border-black bg-white px-1.5 text-[11px] font-black uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
