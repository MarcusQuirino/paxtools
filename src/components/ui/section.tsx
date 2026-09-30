/**
 * Static containers (Design A "calm" rule): 2px ink border, 10px radius, NO
 * shadow. Shadows are reserved for tappable/primary elements (see
 * docs: /tmp/paxtools-designs/design-system.md → "Shadow rule").
 */
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Caps section label (13/900/+8%) with an optional muted meta on the right. */
export function SectionHeading({
  label,
  meta,
  className,
  as: Tag = "h2",
}: {
  label: ReactNode;
  meta?: ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className={cn("mb-2 mt-5 flex items-baseline justify-between gap-3", className)}>
      <Tag className="text-[13px] font-black uppercase tracking-[0.08em] text-[#141414]">
        {label}
      </Tag>
      {meta != null && meta !== "" && (
        <span className="shrink-0 text-[13px] font-bold text-[#8A887F]">{meta}</span>
      )}
    </div>
  );
}

/** SectionHeading + its content. `first` drops the top margin. */
export function Section({
  label,
  meta,
  first,
  className,
  children,
}: {
  label: ReactNode;
  meta?: ReactNode;
  first?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <SectionHeading label={label} meta={meta} className={first ? "mt-0" : undefined} />
      {children}
    </section>
  );
}

/**
 * Static card: paper, 2px ink border, 10px radius, 14px padding, no shadow.
 * `accent` paints an 8px left border in an eixo colour (bloco / especialidade
 * head). `tint` sets the background (use an eixo tint or a semantic tint).
 */
export function Card({
  accent,
  tint,
  className,
  style,
  children,
  testId,
}: {
  accent?: string;
  tint?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn("rounded-[10px] border-2 border-[#141414] bg-white p-3.5", className)}
      style={{
        ...(accent ? { borderLeftWidth: 8, borderLeftColor: accent } : null),
        ...(tint ? { background: tint } : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Static list container: rows inside separate with 1.5px line-soft dividers. */
export function ListBox({
  children,
  className,
  testId,
}: {
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn("overflow-hidden rounded-[10px] border-2 border-[#141414] bg-white", className)}
    >
      {children}
    </div>
  );
}

/** Tinted header row inside a ListBox: caps label left, meta right. */
export function ListHeader({
  label,
  meta,
  tint = "#F4F1E8",
  className,
}: {
  label: ReactNode;
  meta?: ReactNode;
  tint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b-2 border-[#141414] px-3.5 py-2.5",
        className,
      )}
      style={{ background: tint }}
    >
      <span className="shrink-0 whitespace-nowrap text-[13px] font-black uppercase tracking-[0.06em]">
        {label}
      </span>
      {meta != null && meta !== "" && (
        <span className="text-right text-[13px] font-extrabold text-[#4A4A44]">{meta}</span>
      )}
    </div>
  );
}

/** Small muted note under a list (12px — the type floor). */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-2 text-[12px] text-[#8A887F]", className)}>{children}</p>;
}
