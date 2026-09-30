/**
 * Pieces shared by every especialidade screen (escoteiro detail, escotista
 * catalog detail, escotista ficha): the head card, the level boxes, one
 * checklist item row, the older-ramo step-card header, and small formatters.
 * Presentational — behaviour comes in via props.
 */
import { useState, type ReactNode } from "react";
import { ActionCheck, type CheckState } from "@/components/ui/action-check";
import { ProgressBar } from "@/components/ui/progress-ring";
import { Card } from "@/components/ui/section";
import { StatusText } from "@/components/ui/status-pill";
import { AMBER_INK } from "@/lib/design-tokens";

export function shortDate(ts: number | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const days = Math.floor(
    (new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) /
      86_400_000,
  );
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  return d
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    .replace(" de ", " ")
    .replace(".", "");
}

export function firstName(name: string | null | undefined, fallback = "o escoteiro"): string {
  return (name ?? fallback).trim().split(/\s+/)[0] ?? fallback;
}

/** Level-threshold boxes: Nível 1 = half the items, Nível 2 = all. */
export function LevelBoxes({
  total,
  approved,
  reached,
}: {
  total: number;
  /** When given, shows "falta(m) N" / "conquistado" instead of the thresholds. */
  approved?: number;
  reached?: 0 | 1 | 2;
}) {
  const half = total / 2;
  const box = (label: string, need: number, level: 1 | 2, bg: string) => {
    const hit = reached != null && reached >= level;
    const missing = approved != null ? need - approved : null;
    return (
      <div
        className="rounded-md border-2 border-[#141414] px-2.5 py-2 text-[12px] font-bold text-[#4A4A44]"
        style={{ background: approved == null || hit ? bg : "#fff" }}
        data-testid={`level-box-${level}`}
        data-reached={hit ? "true" : "false"}
      >
        <b className="block text-[14px] text-[#141414]">{label}</b>
        {missing == null
          ? `${need} de ${total} itens`
          : hit
            ? "conquistado"
            : missing === 1
              ? "falta 1 item"
              : `faltam ${missing} itens`}
      </div>
    );
  };
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {box("Nível 1", half, 1, "#E3E8F8")}
      {box("Nível 2", total, 2, "#F4C430")}
    </div>
  );
}

/**
 * Head card of a younger especialidade with progress: "N de M itens",
 * pending note, striped progress bar, level boxes.
 */
export function ItemProgressHead({
  color,
  total,
  approved,
  pending,
  level,
  description,
  testId,
}: {
  color: string;
  total: number;
  approved: number;
  pending: number;
  level: 0 | 1 | 2;
  description?: string;
  testId?: string;
}) {
  return (
    <Card accent={color} className="mb-3 mt-2" testId={testId}>
      {description && (
        <p className="mb-3 text-[14px] leading-[1.45] text-[#4A4A44]">{description}</p>
      )}
      <div className="flex items-baseline justify-between gap-3 text-[14px] font-extrabold">
        <span>
          <span data-testid="ficha-approved-count">{approved}</span> de {total} itens
        </span>
        <span
          className="text-[12px] font-bold"
          style={{ color: pending ? AMBER_INK : "#8A887F" }}
        >
          {pending ? `${pending} aguardando aprovação` : "nada aguardando"}
        </span>
      </div>
      <ProgressBar
        className="mt-1.5"
        color={color}
        approvedPct={(approved / total) * 100}
        pendingPct={((approved + pending) / total) * 100}
      />
      <LevelBoxes total={total} approved={approved} reached={level} />
    </Card>
  );
}

/**
 * One numbered checklist item: ActionCheck (48px target) + 15px text +
 * 12px status line + optional inline actions (Aprovar / Rejeitar).
 * `state` "pending" = aguardando aprovação (amber + clock).
 */
export function SpecialtyItemRow({
  index,
  text,
  state,
  onToggle,
  disabled,
  busy,
  status,
  actions,
  ariaLabel,
}: {
  index: number;
  text: string;
  state: CheckState;
  onToggle?: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Status line text; defaults to the semantic label for the state. */
  status?: ReactNode;
  actions?: ReactNode;
  ariaLabel?: string;
}) {
  const label =
    ariaLabel ??
    (state === "approved"
      ? `Item ${index + 1} aprovado`
      : state === "pending"
        ? `Item ${index + 1} aguardando aprovação`
        : `Marcar item ${index + 1}`);
  return (
    <div
      data-testid={`ficha-item-${index}`}
      data-state={state}
      className={`flex min-h-14 items-start gap-3 border-t-[1.5px] border-[#D9D5C9] py-3 pl-3 pr-2 first-of-type:border-t-0 ${
        busy ? "opacity-60" : ""
      }`}
    >
      <ActionCheck state={state} onClick={onToggle} disabled={disabled || busy} ariaLabel={label} />
      <div className="min-w-0 flex-1 pt-0.5 text-[15px] leading-[1.4]">
        <span
          className={
            state === "approved" ? "text-[#8A887F] line-through decoration-[#0E6B4E]" : ""
          }
        >
          <b className="text-[#141414]">{index + 1}.</b> {text}
        </span>
        {state !== "selected" && (
          <StatusText state={state === "open" ? "open" : state}>{status}</StatusText>
        )}
        {actions && <span className="mt-2 flex gap-1.5">{actions}</span>}
      </div>
    </div>
  );
}

/** Older-ramo step card header: numbered circle + label + right meta, on the eixo tint. */
export function StepHeader({
  ordinal,
  label,
  tint,
  right,
}: {
  ordinal: number;
  label: string;
  tint: string;
  right?: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2.5 border-b-2 border-[#141414] px-3 py-2.5"
      style={{ background: tint }}
    >
      <span className="grid size-7 place-items-center rounded-full border-2 border-[#141414] bg-[#0E6B4E] text-[13px] font-black text-white">
        {ordinal}
      </span>
      <h3 className="text-[16px] font-black">{label}</h3>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

/** Suggestions list (older-ramo etapas): first three, then "Ver as N sugestões". */
export function Suggestions({ items }: { items: string[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 3);
  return (
    <>
      <ul className="list-disc py-2 pl-[30px] pr-3 text-[13px] leading-snug text-[#4A4A44]">
        {shown.map((s, i) => (
          <li key={i} className="my-1">
            {s}
          </li>
        ))}
      </ul>
      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="block min-h-11 w-full px-3 pb-2 text-left text-[13px] font-extrabold text-[#0E6B4E]"
        >
          {all ? "Mostrar menos" : `Ver as ${items.length} sugestões`}
        </button>
      )}
    </>
  );
}
