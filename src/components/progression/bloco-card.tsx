import { Link } from "@tanstack/react-router";
import type { Bloco } from "@/data/types";
import { eixoColor } from "@/data/eixo-colors";
import { ListRow } from "@/components/ui/list-row";
import { ProgressRing } from "@/components/ui/progress-ring";
import { blocoStatusLine, type BlocoSummary } from "@/lib/bloco-summary";
import type { Id } from "../../../convex/_generated/dataModel";

type BlocoRowProps = {
  bloco: Bloco;
  summary: BlocoSummary;
  /** Impersonation (#53): the bloco screen opens for this scout. */
  escoteiroId?: Id<"users">;
  /** Prefix the status line with the eixo name ("Continue de onde parou"). */
  eixoName?: string;
  testId?: string;
};

/**
 * One bloco in an eixo list (Design A frame 1): 32px ProgressRing in the eixo
 * colour (full = check, aguardando = amber clock), 15/800 name, 12px status
 * line, chevron. Tapping pushes the bloco screen (/bloco/$blocoId).
 */
export function BlocoRow({ bloco, summary, escoteiroId, eixoName, testId }: BlocoRowProps) {
  const status = blocoStatusLine(summary);
  return (
    <ListRow
      leading={
        <ProgressRing
          pct={summary.approvedPct}
          color={eixoColor(bloco.eixoId)}
          state={summary.state}
        />
      }
      title={bloco.name}
      subtitle={eixoName ? `${eixoName} · ${status.text}` : status.text}
      subtitleTone={status.tone}
      chevron
      testId={testId ?? `bloco-row-${bloco.id}`}
      data={{ state: summary.state }}
      link={
        <Link
          to="/bloco/$blocoId"
          params={{ blocoId: bloco.id }}
          search={escoteiroId ? { escoteiroId } : {}}
        />
      }
    />
  );
}
