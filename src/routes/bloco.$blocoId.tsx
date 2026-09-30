import { useEffect, useMemo, type ReactNode } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useProgression } from "@/hooks/use-progression";
import { usePlan } from "@/hooks/use-plan";
import { eixoColor } from "@/data/eixo-colors";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { BackButton, PageHeader } from "@/components/layout/page-header";
import { EscoteiroShell } from "@/components/progression/escoteiro-shell";
import { ActionChecklist } from "@/components/progression/action-checklist";
import { SpecialtySection } from "@/components/progression/specialty-section";
import { firstName } from "@/components/especialidades/pieces";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-ring";
import { Card, Note } from "@/components/ui/section";
import { StatusPill } from "@/components/ui/status-pill";
import { notifyLevelUps } from "@/lib/level-up-toast";
import { findBloco, LAST_BLOCO_KEY, summarizeBloco } from "@/lib/bloco-summary";

type BlocoSearch = {
  /** Escotista impersonation (#53): the scout whose bloco is shown. */
  escoteiroId?: string;
};

/**
 * Bloco screen (Design A frame 2) — pushed from a bloco row on Progressão (or
 * the escotista's view of a scout). Deep-linkable: /bloco/<blocoId>.
 */
export const Route = createFileRoute("/bloco/$blocoId")({
  validateSearch: (search: Record<string, unknown>): BlocoSearch => ({
    escoteiroId:
      typeof search.escoteiroId === "string" && search.escoteiroId ? search.escoteiroId : undefined,
  }),
  loaderDeps: ({ search: { escoteiroId } }) => ({ escoteiroId }),
  loader: async ({ context, deps }) => {
    if (deps.escoteiroId) {
      await context.queryClient.ensureQueryData(
        convexQuery(api.progression.getCompletionsForUser, {
          targetUserId: deps.escoteiroId as Id<"users">,
        }),
      );
      return;
    }
    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.progression.getMyCompletions, {})),
      context.queryClient.ensureQueryData(convexQuery(api.plan.getMyPlan, {})),
    ]);
  },
  component: BlocoPage,
});

function BlocoPage() {
  const { escoteiroId: raw } = Route.useSearch();
  const escoteiroId = raw as Id<"users"> | undefined;
  const { ready } = useAuthGate(escoteiroId ? "escotista" : "escoteiro");
  if (!ready) return <AppShellSkeleton rows={3} />;
  return escoteiroId ? <ScoutBloco escoteiroId={escoteiroId} /> : <OwnBloco />;
}

function useBack(escoteiroId?: Id<"users">) {
  const router = useRouter();
  const navigate = useNavigate();
  return () => {
    if (router.history.canGoBack()) router.history.back();
    else if (escoteiroId)
      void navigate({ to: "/escotista/escoteiro/$escoteiroId", params: { escoteiroId } });
    else void navigate({ to: "/" });
  };
}

/** The escoteiro's own bloco: tab chrome, plan stars, remembered for "Continue". */
function OwnBloco() {
  const { blocoId } = Route.useParams();
  const back = useBack();
  const { plannedKeys, togglePlanned } = usePlan();

  useEffect(() => {
    try {
      window.localStorage.setItem(LAST_BLOCO_KEY, blocoId);
    } catch {
      // Storage unavailable — "Continue" falls back to the heuristic.
    }
  }, [blocoId]);

  return (
    <BlocoScreen
      blocoId={blocoId}
      frame={(header, body) => (
        <EscoteiroShell title="Progressão" header={header}>
          {body}
        </EscoteiroShell>
      )}
      back={<BackButton onClick={back} />}
      plannedKeys={plannedKeys}
      onTogglePlanned={(itemKey) => togglePlanned({ itemKey })}
    />
  );
}

/** Escotista viewing a scout's bloco: no tab bar, auto-approved toggles. */
function ScoutBloco({ escoteiroId }: { escoteiroId: Id<"users"> }) {
  const { blocoId } = Route.useParams();
  const back = useBack(escoteiroId);
  const { data: members } = useQuery(convexQuery(api.groups.getGroupMembers, {}));
  const scout = members?.find((m) => m._id === escoteiroId);
  return (
    <BlocoScreen
      blocoId={blocoId}
      targetUserId={escoteiroId}
      crumbPrefix={scout ? firstName(scout.name, "Escoteiro") : undefined}
      frame={(header, body) => (
        <AppShell header={header}>
          <Note className="mt-0 mb-3">
            Visualizando como escotista — o que você marcar é aprovado automaticamente.
          </Note>
          {body}
        </AppShell>
      )}
      back={<BackButton onClick={back} />}
    />
  );
}

function BlocoScreen({
  blocoId,
  targetUserId,
  crumbPrefix,
  frame,
  back,
  plannedKeys,
  onTogglePlanned,
}: {
  blocoId: string;
  targetUserId?: Id<"users">;
  crumbPrefix?: string;
  frame: (header: ReactNode, body: ReactNode) => ReactNode;
  back: ReactNode;
  plannedKeys?: Set<string>;
  onTogglePlanned?: (itemKey: string) => void;
}) {
  const {
    eixos,
    approvedActionIds,
    pendingActionIds,
    actionStatusMap,
    customActions,
    earnedSpecialtyBlocoIds,
    earnedSpecialtyIds,
  } = useProgression(targetUserId);
  const isOwn = !targetUserId;

  const found = useMemo(() => findBloco(eixos, blocoId), [eixos, blocoId]);
  const summary = useMemo(
    () =>
      found
        ? summarizeBloco(found.bloco, {
            approvedActionIds,
            pendingActionIds,
            customActions,
            earnedSpecialtyBlocoIds,
          })
        : null,
    [found, approvedActionIds, pendingActionIds, customActions, earnedSpecialtyBlocoIds],
  );

  // Marking as the escoteiro sends it for approval; say so. Level-up toasts
  // fire when an approval (escotista toggle) completes an etapa.
  const sentForApproval = (wasChecked: boolean) => (result: unknown) => {
    notifyLevelUps(result);
    if (isOwn && !wasChecked) toast("Enviado para aprovação");
  };

  const toggleActionFn = useConvexMutation(api.progression.toggleAction);
  const { mutate: toggleAction } = useMutation({ mutationFn: toggleActionFn });
  const addCustomFn = useConvexMutation(api.progression.addCustomAction);
  const { mutate: addCustom } = useMutation({ mutationFn: addCustomFn });
  const toggleCustomFn = useConvexMutation(api.progression.toggleCustomAction);
  const { mutate: toggleCustom } = useMutation({ mutationFn: toggleCustomFn });
  const deleteCustomFn = useConvexMutation(api.progression.deleteCustomAction);
  const { mutate: deleteCustom } = useMutation({ mutationFn: deleteCustomFn });

  if (!found || !summary) {
    return frame(
      <PageHeader back={back} eyebrow="Progressão" title="Bloco não encontrado" />,
      <EmptyState>Este bloco não existe no ramo {isOwn ? "atual" : "deste escoteiro"}.</EmptyState>,
    );
  }

  const { eixo, bloco } = found;
  const color = eixoColor(eixo.id);
  const header = (
    <PageHeader
      back={back}
      eyebrow={crumbPrefix ? `${crumbPrefix} · ${eixo.name}` : eixo.name}
      crumbColor={color}
      title={bloco.name}
      testId="bloco-header"
    />
  );

  const body = (
    <div className="space-y-4">
      <Card accent={color} testId="bloco-head">
        <p className="text-[15px] leading-[1.45] text-[#4A4A44]">{bloco.objective}</p>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="text-[14px] font-extrabold">
            <b className="text-[18px] font-black">{summary.approvedDone}</b> de {summary.total}{" "}
            {summary.total === 1 ? "ação" : "ações"}
          </p>
          {summary.state === "full" ? (
            <StatusPill state="approved">{summary.viaSpecialty ? "Via especialidade" : "Completo"}</StatusPill>
          ) : summary.pendingDone > 0 ? (
            <span className="text-[12px] font-extrabold text-[#6B4A00]">
              {summary.pendingDone} aguardando aprovação
            </span>
          ) : null}
        </div>
        <ProgressBar
          className="mt-1.5"
          approvedPct={summary.approvedPct}
          pendingPct={summary.pendingPct}
          color={color}
        />
      </Card>

      <ActionChecklist
        bloco={bloco}
        progress={summary.progress}
        approvedActionIds={approvedActionIds}
        pendingActionIds={pendingActionIds}
        actionStatusMap={actionStatusMap}
        customActions={customActions}
        viaSpecialty={summary.viaSpecialty}
        onToggleAction={(actionId) =>
          toggleAction(
            { actionId, targetUserId },
            {
              onSuccess: sentForApproval(
                approvedActionIds.has(actionId) || pendingActionIds.has(actionId),
              ),
            },
          )
        }
        onAddCustom={(id, text) => addCustom({ blocoId: id, text, targetUserId })}
        onToggleCustom={(id) =>
          toggleCustom(
            { customActionId: id, targetUserId },
            {
              onSuccess: sentForApproval(
                !!customActions.find((c) => c._id === id)?.completed,
              ),
            },
          )
        }
        onDeleteCustom={(id) => deleteCustom({ customActionId: id, targetUserId })}
        plannedKeys={plannedKeys}
        onTogglePlanned={onTogglePlanned}
        lockApproved={isOwn}
      />

      <SpecialtySection
        blocoId={bloco.id}
        alternatives={bloco.alternativeCompletions}
        earnedSpecialtyIds={earnedSpecialtyIds}
        plannedKeys={plannedKeys}
        onTogglePlanned={onTogglePlanned}
        escoteiroId={targetUserId}
      />
    </div>
  );

  return frame(header, body);
}
