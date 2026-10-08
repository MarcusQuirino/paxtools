import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConvexMutation } from "@convex-dev/react-query";
import type { FunctionReturnType } from "convex/server";
import { Check, Star, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { RevisaoCard } from "@/lib/revisao-deck";
import { encodePlanKey } from "@/lib/plan-keys";
import { notifyLevelUps } from "@/lib/level-up-toast";
import { userErrorMessage } from "@/lib/user-error-message";
import {
  beginUndo,
  settleUndo,
  startSession,
  summarize,
  swipe,
  type SwipeKind,
} from "@/lib/revisao-session";
import type { DragOutcome } from "@/lib/revisao-gesture";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SwipeCard } from "./swipe-card";

type MarkReceipt = FunctionReturnType<typeof api.progression.markAction>;

/** What a swipe did on the server, kept so undo can revert exactly that. */
type ServerReceipt =
  | { kind: "mark"; mark: MarkReceipt }
  | { kind: "plan"; itemKey: string; added: boolean }
  | null;

/** Settles to null when the call failed (already surfaced as a toast). */
type PendingReceipt = Promise<ServerReceipt>;

/** Swipe-away animation length; the next card shows once it's done. */
const FLING_MS = 260;

export type RevisaoTarget = { id: Id<"users">; name: string };

/**
 * The Revisão rápida deck screen. `deck` is a snapshot taken once per run, so
 * the reactive conclusões/Plano updating mid-run never reshuffles it.
 * Without `target` the viewer reviews their own ações (marks go pending, ↑
 * adds to their Plano); with it an escotista marks for that escoteiro
 * (approved immediately, no Plano).
 */
export function RevisaoScreen({
  deck,
  target,
}: {
  deck: RevisaoCard[];
  target?: RevisaoTarget;
}) {
  const escotista = !!target;
  const planEnabled = !escotista;
  const targetUserId = target?.id;

  const [session, setSession] = useState(() =>
    startSession<PendingReceipt | null>(deck.length),
  );
  const [exited, setExited] = useState(false);
  const [leaving, setLeaving] = useState<SwipeKind | null>(null);

  const markAction = useConvexMutation(api.progression.markAction);
  const undoMarkAction = useConvexMutation(api.progression.undoMarkAction);
  const addToPlan = useConvexMutation(api.plan.addToPlan);
  const removeFromPlan = useConvexMutation(api.plan.removeFromPlan);

  // Server calls run one at a time, in swipe order, so an undo can't overtake
  // the mark it reverts (or a re-swipe overtake the undo).
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = useCallback(<T,>(op: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(op);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  const summary = summarize(session);
  const showSummary = exited || summary.finished;
  const card = deck[session.index];
  const next = deck[session.index + 1];
  const canUndo = session.history.length > 0 && !session.undoing;

  const send = (kind: SwipeKind, c: RevisaoCard): PendingReceipt | null => {
    if (kind === "skip") return null; // left swipes never touch the server
    const call: () => Promise<ServerReceipt> =
      kind === "done"
        ? async () => {
            const mark = await markAction({ actionId: c.actionId, targetUserId });
            notifyLevelUps(mark.toasts);
            return { kind: "mark", mark };
          }
        : async () => {
            const itemKey = encodePlanKey({ kind: "action", actionId: c.actionId });
            const { added } = await addToPlan({ itemKey });
            return { kind: "plan", itemKey, added };
          };
    return enqueue(call).catch((err: unknown) => {
      toast.error(userErrorMessage(err));
      return null;
    });
  };

  /**
   * Revert a swipe on the server; resolves whether it was taken back. A mark
   * the server won't undo (approved meanwhile) or a failed call keeps it.
   */
  const revert = (pending: PendingReceipt): Promise<boolean> =>
    enqueue(async () => {
      const r = await pending;
      if (r?.kind === "mark") {
        const { created, completionId, status, eventIds } = r.mark;
        if (created && completionId && status) {
          const { removed } = await undoMarkAction({
            completionId,
            status,
            eventIds,
            targetUserId,
          });
          if (!removed) {
            toast.info(
              escotista
                ? "Essa marcação já mudou — não dá pra desfazer"
                : "Já aprovada pelo escotista — não dá pra desfazer",
            );
            return false;
          }
        }
      } else if (r?.kind === "plan" && r.added) {
        await removeFromPlan({ itemKey: r.itemKey });
      }
      return true;
    }).catch((err: unknown) => {
      toast.error(userErrorMessage(err));
      return false;
    });

  const commit = (kind: SwipeKind) => {
    if (leaving || session.undoing || !card || showSummary) return;
    if (kind === "plan" && !planEnabled) return;
    const receipt = send(kind, card);
    setLeaving(kind);
    window.setTimeout(() => {
      setSession((s) => swipe(s, kind, receipt));
      setLeaving(null);
    }, FLING_MS);
  };

  // The card only comes back once the server confirms the undo.
  const handleUndo = () => {
    if (leaving) return;
    const step = beginUndo(session);
    if (!step.undone) return;
    const settle = (confirmed: boolean) => {
      setSession((s) => settleUndo(s, confirmed));
      if (confirmed) {
        setExited(false);
        }
    };
    setSession(step.session);
    const pending = step.undone.receipt;
    // A left swipe never touched the server: nothing to wait for.
    if (!pending) settle(true);
    else void revert(pending).then(settle);
  };

  const handleRelease = (outcome: DragOutcome) => {
    if (outcome === "undo") handleUndo();
    else commit(outcome);
  };

  // Arrow keys mirror the four buttons. Re-bound every render so the handler
  // sees the current card/session.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showSummary || e.altKey || e.ctrlKey || e.metaKey) return;
      const action: Record<string, () => void> = {
        ArrowRight: () => commit("done"),
        ArrowLeft: () => commit("skip"),
        ArrowUp: () => planEnabled && commit("plan"),
        ArrowDown: handleUndo,
      };
      const run = action[e.key];
      if (!run) return;
      e.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const exitTo = escotista ? "/escotista" : "/";

  if (deck.length === 0) {
    return (
      <Page>
        <div
          data-testid="revisao-empty"
          className="flex flex-1 flex-col items-center justify-center gap-4 text-center"
        >
          <p className="text-4xl" aria-hidden>
            🃏
          </p>
          <h1 className="text-xl font-black uppercase">Tudo em dia!</h1>
          <p className="text-sm font-medium text-muted-foreground">
            {escotista
              ? `${target.name} não tem ações para revisar.`
              : "Todas as ações do seu ramo já foram marcadas."}
          </p>
          <Button asChild className="bg-yellow-400 text-black">
            <Link to={exitTo}>
              {escotista ? "Voltar ao painel" : "Ver minha progressão"}
            </Link>
          </Button>
        </div>
      </Page>
    );
  }

  if (showSummary || !card) {
    return (
      <Page>
        <Summary
          summary={summary}
          target={target}
          canUndo={canUndo}
          exitTo={exitTo}
          onUndo={handleUndo}
          onContinue={() => setExited(false)}
        />
      </Page>
    );
  }

  const progress = (session.index / deck.length) * 100;

  return (
    <Page>
      <div className="flex items-center gap-2.5">
        <Button
          variant="outline"
          size="icon"
          aria-label="Sair da revisão"
          data-testid="revisao-exit"
          onClick={() => setExited(true)}
        >
          <X />
        </Button>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-black uppercase">
            <span>Revisão rápida</span>
            <span data-testid="revisao-counter">
              {session.index + 1} / {deck.length}
            </span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded border-2 border-black bg-white">
            <div
              className="h-full bg-black transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {target && (
        <div>
          <span
            data-testid="revisao-target"
            className="inline-block rounded bg-black px-2 py-0.5 text-xs font-extrabold text-white"
          >
            Marcando por: {target.name}
          </span>
        </div>
      )}

      <div className="relative min-h-[380px] flex-1">
        {next && (
          <SwipeCard key={session.index + 1} card={next} showPlanTag={planEnabled} under />
        )}
        <SwipeCard
          key={session.index}
          card={card}
          showPlanTag={planEnabled}
          planEnabled={planEnabled}
          canUndo={canUndo}
          leaving={leaving}
          onRelease={handleRelease}
        />
      </div>

      <div className="flex items-center justify-center gap-3.5">
        <RoundButton
          testId="revisao-skip"
          label="Não fiz (←)"
          className="text-red-600"
          onClick={() => commit("skip")}
        >
          <X className="size-7" strokeWidth={3} />
        </RoundButton>
        <RoundButton
          testId="revisao-undo"
          label="Desfazer (↓)"
          small
          disabled={!canUndo}
          onClick={handleUndo}
        >
          <Undo2 className="size-5" strokeWidth={3} />
        </RoundButton>
        <RoundButton
          testId="revisao-plan"
          label={planEnabled ? "Pro plano (↑)" : "Plano indisponível para escotistas"}
          small
          className="bg-yellow-100"
          disabled={!planEnabled}
          onClick={() => commit("plan")}
        >
          <Star className="size-5 fill-yellow-400" strokeWidth={2.5} />
        </RoundButton>
        <RoundButton
          testId="revisao-done"
          label="Já fiz (→)"
          className="bg-green-100 text-green-600"
          onClick={() => commit("done")}
        >
          <Check className="size-7" strokeWidth={3} />
        </RoundButton>
      </div>
      <p className="text-center text-xs font-bold text-muted-foreground">
        → já fiz · ← não fiz · {planEnabled && "↑ pro plano · "}↓ desfazer
      </p>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-3 px-4 py-3">
        {children}
      </div>
    </div>
  );
}

function RoundButton({
  testId,
  label,
  small = false,
  className,
  disabled,
  onClick,
  children,
}: {
  testId: string;
  label: string;
  small?: boolean;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid place-items-center rounded-full border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-25 disabled:shadow-none",
        small ? "size-12" : "size-15",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Summary({
  summary,
  target,
  canUndo,
  exitTo,
  onUndo,
  onContinue,
}: {
  summary: ReturnType<typeof summarize>;
  target?: RevisaoTarget;
  canUndo: boolean;
  exitTo: "/" | "/escotista";
  onUndo: () => void;
  onContinue: () => void;
}) {
  return (
    <div data-testid="revisao-summary" className="flex flex-1 flex-col gap-3 py-2">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
        Revisão rápida{target ? ` · ${target.name}` : ""}
      </p>
      <h1 className="text-2xl font-black uppercase">
        {summary.finished ? "Tudo revisado!" : "Pausado"}
      </h1>
      <Stat testId="revisao-summary-done" value={summary.done} color="text-green-600">
        {target
          ? "ações marcadas (já aprovadas)"
          : "ações enviadas para aprovação do escotista"}
      </Stat>
      {!target && (
        <Stat testId="revisao-summary-plan" value={summary.plan} color="text-yellow-700">
          adicionadas ao plano
        </Stat>
      )}
      <Stat testId="revisao-summary-skip" value={summary.skip} color="text-red-600">
        ainda não feitas
      </Stat>
      {(!target || summary.unseen > 0) && (
        <Stat testId="revisao-summary-unseen" value={summary.unseen}>
          não vistas — aparecem na próxima revisão
        </Stat>
      )}
      {canUndo && (
        <Button variant="outline" size="lg" onClick={onUndo} data-testid="revisao-summary-undo">
          <Undo2 /> Desfazer última
        </Button>
      )}
      <Button asChild size="lg" className="bg-yellow-400 text-black">
        <Link to={exitTo} data-testid="revisao-summary-exit">
          {target ? "Voltar ao painel" : "Ver minha progressão"}
        </Link>
      </Button>
      {summary.unseen > 0 && (
        <Button variant="outline" size="lg" onClick={onContinue} data-testid="revisao-summary-continue">
          Continuar revisão
        </Button>
      )}
    </div>
  );
}

function Stat({
  testId,
  value,
  color,
  children,
}: {
  testId: string;
  value: number;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      className="flex items-center gap-3 rounded-md border-2 border-black bg-white px-4 py-3 font-extrabold shadow-[4px_4px_0px_0px_#000]"
    >
      <span className={cn("min-w-10 text-3xl font-black", color)}>{value}</span>
      <span>{children}</span>
    </div>
  );
}
