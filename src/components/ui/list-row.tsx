/**
 * One row of a ListBox: optional 8px eixo bar or leading slot, 15/800 title,
 * 12/600 subtitle, optional extra line (snippet, mini bar), trailing slot and
 * chevron. ≥56px tall (64 with an extra line), 1.5px line-soft divider on top
 * (none on the first row). Renders as a router Link (pass the element:
 * `link={<Link to="…" search={…} />}` — typing stays at the call site), a
 * button, or a div.
 */
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function RowChevron({ className }: { className?: string }) {
  return (
    <ChevronRight
      className={cn("size-5 shrink-0 text-[#8A887F]", className)}
      strokeWidth={2.5}
      aria-hidden
    />
  );
}

export type SubtitleTone = "muted" | "pending" | "approved";

const TONE: Record<SubtitleTone, string> = {
  muted: "#8A887F",
  pending: "#6B4A00",
  approved: "#0E6B4E",
};

type Base = {
  /** Eixo colour → 8px bar on the left edge (flush with the row). */
  bar?: string;
  /** Leading slot (avatar, ring, number) — used instead of `bar`. */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  subtitleTone?: SubtitleTone;
  /** Extra line under the subtitle: snippet, MiniBar, signals. */
  extra?: ReactNode;
  /** Right side, before the chevron: pills, counts. */
  trailing?: ReactNode;
  chevron?: boolean;
  /** Tall (64px) rows for lists with an extra line. */
  tall?: boolean;
  className?: string;
  testId?: string;
  /** Extra data-* attributes (data-state etc.). */
  data?: Record<string, string | undefined>;
};

type AsLink = Base & { link: ReactElement<{ className?: string; children?: ReactNode }>; onClick?: never };
type AsButton = Base & { onClick: () => void; link?: never; disabled?: boolean };
type AsDiv = Base & { link?: never; onClick?: never };

export type ListRowProps = AsLink | AsButton | AsDiv;

export function ListRow(props: ListRowProps) {
  const {
    bar,
    leading,
    title,
    subtitle,
    subtitleTone = "muted",
    extra,
    trailing,
    chevron,
    tall,
    className,
    testId,
    data,
  } = props;
  const interactive = "link" in props && props.link != null || "onClick" in props && props.onClick != null;
  const cls = cn(
    "flex w-full items-center gap-3 border-t-[1.5px] border-[#D9D5C9] text-left text-[#141414] first:border-t-0",
    tall ? "min-h-16" : "min-h-14",
    bar ? "py-2.5 pr-3" : "px-3 py-2.5",
    interactive && "hover:bg-black/[0.02] active:bg-black/[0.04]",
    className,
  );
  const dataAttrs = Object.fromEntries(
    Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]),
  );
  const body = (
    <>
      {bar && <span className="w-2 shrink-0 self-stretch" style={{ background: bar }} aria-hidden />}
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight">{title}</span>
        {subtitle != null && subtitle !== "" && (
          <span
            className="mt-0.5 block text-[12px] font-semibold"
            style={{ color: TONE[subtitleTone] }}
          >
            {subtitle}
          </span>
        )}
        {extra}
      </span>
      {trailing}
      {chevron && <RowChevron />}
    </>
  );

  if ("link" in props && props.link) {
    return cloneElement(props.link, {
      className: cls,
      "data-testid": testId,
      ...dataAttrs,
      children: body,
    } as Record<string, unknown>);
  }
  if ("onClick" in props && props.onClick) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        disabled={props.disabled}
        data-testid={testId}
        {...dataAttrs}
        className={cn(cls, "disabled:opacity-60")}
      >
        {body}
      </button>
    );
  }
  return (
    <div data-testid={testId} {...dataAttrs} className={cls}>
      {body}
    </div>
  );
}

/** Snippet line for search results: the item text that matched. */
export function RowSnippet({ children }: { children: ReactNode }) {
  return (
    <span className="mt-1 line-clamp-2 block border-l-[3px] border-[#D9D5C9] pl-2 text-[12px] text-[#4A4A44]">
      {children}
    </span>
  );
}

/**
 * Dashed full-width row-like button ("+ Ação personalizada", "Ver as N…").
 * Emerald text, 52px, no shadow — it's a secondary affordance, not a CTA.
 */
export function DashedRowButton({
  children,
  onClick,
  link,
  className,
  testId,
}: {
  children: ReactNode;
  onClick?: () => void;
  /** `link={<Link to="…" />}` — rendered as that link. */
  link?: ReactElement<{ className?: string; children?: ReactNode }>;
  className?: string;
  testId?: string;
}) {
  const cls = cn(
    "mt-2 flex min-h-[52px] w-full items-center gap-3 rounded-[10px] border-2 border-dashed border-[#D9D5C9] px-3 text-left text-[15px] font-extrabold text-[#0E6B4E] hover:bg-black/[0.02]",
    className,
  );
  if (link) {
    return cloneElement(link, { className: cls, "data-testid": testId, children } as Record<string, unknown>);
  }
  return (
    <button type="button" onClick={onClick} data-testid={testId} className={cls}>
      {children}
    </button>
  );
}
