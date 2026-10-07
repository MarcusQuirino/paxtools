import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { placeCard, type Rect, type TourStep } from "@/lib/tour";

/** How long to wait for a step's target before giving up on it. */
const TARGET_TIMEOUT_MS = 2500;
/** Breathing room between the target's edges and the spotlight. */
const SPOTLIGHT_PAD = 6;

function findTarget(target: string): Element | null {
  return document.querySelector(`[data-tour="${target}"]`);
}

/**
 * Whether the route's page has finished rendering: every required anchor of
 * its steps is on screen. Layout chrome (the bottom nav) renders before the
 * page's data, so a single anchor is not enough to call an optional one absent.
 */
function routeReady(steps: TourStep[], route: string): boolean {
  return steps.every(
    (s) => s.route !== route || s.optional || !s.target || findTarget(s.target),
  );
}

/** The target's box, padded and clipped to the viewport. */
function spotlightRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  const top = Math.max(0, r.top - SPOTLIGHT_PAD);
  const left = Math.max(0, r.left - SPOTLIGHT_PAD);
  const bottom = Math.min(window.innerHeight, r.bottom + SPOTLIGHT_PAD);
  const right = Math.min(window.innerWidth, r.right + SPOTLIGHT_PAD);
  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/**
 * Full-screen coach-mark overlay: dims the page, cuts a spotlight around the
 * current step's target and shows a card explaining it. The page underneath
 * is inert while the tour runs, so a stray tap can't navigate away mid-step.
 */
export function GuidedTour({
  steps,
  onClose,
}: {
  steps: TourStep[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [index, setIndex] = useState(0);
  // Which way the member is moving, so a missing optional step is skipped
  // in the same direction instead of bouncing them back.
  const [direction, setDirection] = useState<1 | -1>(1);
  // Both tagged with the step they belong to, so moving on resets them
  // without an effect having to clear them.
  const [spot, setSpot] = useState<{ stepId: string; rect: Rect } | null>(null);
  const [resolvedStep, setResolvedStep] = useState<string | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  // Optional steps whose feature this page doesn't have, so "Passo X de N"
  // counts only the steps the member will actually see.
  const [absent, setAbsent] = useState<ReadonlySet<string>>(() => new Set());
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const step = steps[Math.min(index, steps.length - 1)]!;
  const rect = spot?.stepId === step.id ? spot.rect : null;
  const resolved = resolvedStep === step.id;
  const isFirst = index === 0;
  const isLast = index >= steps.length - 1;

  const refreshAbsent = useCallback(
    (route: string) => {
      const ids = steps
        .filter(
          (s) =>
            s.optional && s.route === route && s.target && !findTarget(s.target),
        )
        .map((s) => s.id);
      setAbsent((prev) =>
        prev.size === ids.length && ids.every((id) => prev.has(id))
          ? prev
          : new Set(ids),
      );
    },
    [steps],
  );

  const go = useCallback(
    (delta: 1 | -1) => {
      setDirection(delta);
      setIndex((i) => Math.min(Math.max(i + delta, 0), steps.length - 1));
    },
    [steps.length],
  );

  const next = useCallback(() => {
    if (isLast) onClose();
    else go(1);
  }, [isLast, onClose, go]);

  // Each step lives on a route; get there first. Keyed on the step alone so
  // a redirect by the page's own guard is never fought.
  useEffect(() => {
    if (pathname !== step.route) void navigate({ to: step.route });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  // Find the target (it may still be loading), bring it into view and keep
  // the spotlight glued to it while the page scrolls or reflows.
  useEffect(() => {
    const stepId = step.id;
    let el: Element | null = null;
    let raf = 0;
    const measure = () => {
      if (el) setSpot({ stepId, rect: spotlightRect(el) });
    };
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(onMove);
    const startedAt = performance.now();

    // Waits for the page to render before showing even an untargeted card,
    // so the counter already knows which optional steps this page lacks.
    const lookup = () => {
      const ready = routeReady(steps, step.route);
      if (ready) refreshAbsent(step.route);
      const timedOut = performance.now() - startedAt > TARGET_TIMEOUT_MS;
      if (!step.target) {
        if (ready || timedOut) setResolvedStep(stepId);
        return ready || timedOut;
      }
      el = findTarget(step.target);
      if (el) {
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        el.scrollIntoView({
          block: "center",
          behavior: reduceMotion ? "auto" : "smooth",
        });
        resize.observe(el);
        measure();
        setResolvedStep(stepId);
        return true;
      }
      // The page has rendered but this optional target isn't on it: the
      // feature is absent here, so skip without waiting.
      if (step.optional && (ready || timedOut)) {
        go(direction);
        return true;
      }
      if (timedOut) setResolvedStep(stepId); // explain it anyway, centred
      return timedOut;
    };

    const poll = lookup() ? 0 : window.setInterval(() => {
      if (lookup()) window.clearInterval(poll);
    }, 100);

    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.clearInterval(poll);
      cancelAnimationFrame(raf);
      resize.disconnect();
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
    // Runs once per step: `direction` is read as it was when the step began
    // (re-running on it would skip again), the rest is fixed for the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, go, refreshAbsent]);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    setCardHeight(card.offsetHeight);
    const ro = new ResizeObserver(() => setCardHeight(card.offsetHeight));
    ro.observe(card);
    return () => ro.disconnect();
  }, [resolved]);

  useEffect(() => {
    if (resolved) primaryRef.current?.focus({ preventScroll: true });
  }, [resolved, step.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft" && !isFirst) go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, next, go, isFirst]);

  const cardTop = placeCard(rect, cardHeight, viewportHeight);
  const position = steps
    .slice(0, index + 1)
    .filter((s) => !absent.has(s.id)).length;
  const total = steps.length - absent.size;
  const titleId = `tour-title-${step.id}`;

  return (
    <div data-testid="guided-tour" className="fixed inset-0 z-[100]">
      {/* Swallows taps so the page stays put under the tour. */}
      <div className="absolute inset-0" aria-hidden />
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-md outline-3 outline-[#F4C430] transition-all duration-200 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 bg-black/60" />
      )}

      {resolved && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-tour-step={step.id}
          className="fixed left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 space-y-3 rounded-md border-2 border-black bg-card p-4 shadow-[4px_4px_0px_0px_#000] transition-[top] duration-200 ease-out"
          style={{ top: cardTop }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                Passo {position} de {total}
              </p>
              <h2 id={titleId} className="text-lg font-black leading-tight text-foreground">
                {step.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar tutorial"
              className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          <p className="text-sm font-medium leading-relaxed text-foreground/90">
            {step.body}
          </p>
          <div className="flex items-center justify-between gap-2 pt-1">
            {isLast ? (
              <span />
            ) : (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Pular
              </Button>
            )}
            <div className="flex gap-2">
              {!isFirst && (
                <Button variant="outline" size="sm" onClick={() => go(-1)}>
                  Voltar
                </Button>
              )}
              <Button ref={primaryRef} size="sm" onClick={next}>
                {isFirst ? "Vamos lá" : isLast ? "Concluir" : "Próximo"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
