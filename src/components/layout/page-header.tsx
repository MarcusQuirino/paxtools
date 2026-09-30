/**
 * Page headers (Design A "top bar"):
 *
 * - Tab screen: eyebrow 12 caps (ramo · grupo / seção · grupo) over a 28/900
 *   title, avatar or actions on the right. Replaces every "PAXTOOLS" wordmark.
 * - Pushed screen (`back` given): 44px back target + coloured crumb (eixo
 *   colour or muted) + 22/900 title.
 *
 * `ViewerAvatar` is the data-bound avatar (photo/initials on gold) linking to
 * Perfil/Ajustes; pass `avatar={<ViewerAvatar/>}` on tab screens.
 */
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { cn } from "@/lib/utils";

export const BACK_CLASS =
  "-ml-2 grid size-11 shrink-0 place-items-center rounded-md text-[#141414] hover:bg-black/5";

export function BackIcon() {
  return <ChevronLeft className="size-[26px]" strokeWidth={2.5} aria-hidden />;
}

/** 44px back button (history/back callback). */
export function BackButton({ onClick, ariaLabel = "Voltar" }: { onClick: () => void; ariaLabel?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={BACK_CLASS}>
      <BackIcon />
    </button>
  );
}

/** 44px back link (routed): `<BackLink link={<Link to="…" search={…} />} />`. */
export function BackLink({
  link,
  ariaLabel = "Voltar",
}: {
  link: ReactElement<{ className?: string; children?: ReactNode }>;
  ariaLabel?: string;
}) {
  return cloneElement(link, {
    "aria-label": ariaLabel,
    className: BACK_CLASS,
    children: <BackIcon />,
  } as Record<string, unknown>);
}

/**
 * The signed-in user's avatar (44px, gold): links to `/settings` unless
 * `link={false}` (on the Perfil/Ajustes page itself).
 */
export function ViewerAvatar({ link = true }: { link?: boolean }) {
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const face = (
    <PersonAvatar
      id={user?._id ?? "viewer"}
      name={user?.name}
      email={user?.email}
      image={user?.image}
      size={44}
      tint="#F4C430"
    />
  );
  if (!link) return face;
  return (
    <Link to="/settings" aria-label="Abrir perfil" className="shrink-0 rounded-full">
      {face}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  avatar,
  actions,
  back,
  crumbColor,
  className,
  testId,
  eyebrowTestId = "page-eyebrow",
}: {
  /** Context line above the title. On pushed screens this is the crumb. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Right slot on tab screens — usually <ViewerAvatar/>. */
  avatar?: ReactNode;
  /** Right slot for buttons (both `avatar` and `actions` may be given). */
  actions?: ReactNode;
  /** Back control → pushed-screen variant (22px title, coloured crumb). */
  back?: ReactNode;
  /** Crumb colour on pushed screens (eixo colour); default muted. */
  crumbColor?: string;
  className?: string;
  testId?: string;
  /** data-testid of the eyebrow on tab screens (e2e reads the context line). */
  eyebrowTestId?: string;
}) {
  if (back) {
    return (
      <header className={cn("flex items-center gap-2.5 pb-1", className)} data-testid={testId}>
        {back}
        <div className="min-w-0 flex-1">
          {eyebrow != null && eyebrow !== "" && (
            <p
              className="truncate text-[12px] font-extrabold uppercase tracking-[0.08em]"
              style={{ color: crumbColor ?? "#8A887F" }}
            >
              {eyebrow}
            </p>
          )}
          <h1 className="text-[22px] font-black leading-[1.1] tracking-[-0.02em] text-[#141414]">
            {title}
          </h1>
        </div>
        {actions}
        {avatar}
      </header>
    );
  }
  return (
    <header className={cn("flex items-end justify-between gap-3 pt-1", className)} data-testid={testId}>
      <div className="min-w-0">
        <p
          data-testid={eyebrowTestId}
          className="min-h-4 truncate text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A887F]"
        >
          {eyebrow}
        </p>
        <h1 className="text-[28px] font-black leading-[1.05] tracking-[-0.02em] text-[#141414]">
          {title}
        </h1>
      </div>
      {(actions || avatar) && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {avatar}
        </div>
      )}
    </header>
  );
}
