import { useState } from "react";
import { useAction } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Sparkles, RefreshCw } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { HardButton } from "@/components/ui/hard-button";
import { Card, ListBox, Note, SectionHeading } from "@/components/ui/section";
import { ListRow } from "@/components/ui/list-row";
import { Pill } from "@/components/ui/status-pill";
import { eixoColor } from "@/data/eixo-colors";
import type { Ramo } from "@/data/progression-data";

/**
 * "Sugestões da IA (beta)" — on-demand helper. The generate/regenerate button
 * fires the node action (which writes a cache row); the rendered content comes
 * from the reactive cached query, so a successful run updates the UI on its own.
 * Renders nothing while the `ai_suggestions` feature flag is off; the backend
 * enforces the same flag, so this is presentation, not the security boundary.
 */
export function AiSuggestionsCard({ ramo }: { ramo?: Ramo }) {
  const suggest = useAction(api.ai.suggestActivities);
  const [loading, setLoading] = useState(false);
  const { data: flagEnabled } = useQuery(
    convexQuery(api.featureFlags.isEnabled, { key: "ai_suggestions" }),
  );
  const { data: cached } = useQuery({
    ...convexQuery(api.aiHelpers.getCachedSuggestion, { ramo }),
    enabled: flagEnabled === true,
  });

  async function onGenerate() {
    setLoading(true);
    try {
      await suggest({ ramo });
    } catch (err) {
      const msg =
        err instanceof ConvexError && typeof err.data === "string"
          ? err.data
          : err instanceof Error
            ? err.message
            : "Falha ao gerar sugestões";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (flagEnabled !== true) return null;

  const hasResult = !!cached;

  return (
    <section data-testid="stats-ai-suggestions">
      <SectionHeading
        label={
          <span className="inline-flex items-center gap-2">
            Sugestões da IA
            <Pill tone="paper">beta</Pill>
          </span>
        }
      />
      <Card className="space-y-3">
        {!hasResult && !loading && (
          <p className="text-[15px] text-[#4A4A44]">
            Gere ideias de jogos e dinâmicas a partir da cobertura deste ramo.
          </p>
        )}
        {hasResult && <p className="text-[15px] leading-snug">{cached.overview}</p>}
        <HardButton
          tone="paper"
          size="md"
          full
          onClick={() => void onGenerate()}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="animate-spin" aria-hidden />
          ) : hasResult ? (
            <RefreshCw aria-hidden />
          ) : (
            <Sparkles aria-hidden />
          )}
          {loading ? "Gerando…" : hasResult ? "Gerar de novo" : "Gerar sugestões"}
        </HardButton>
      </Card>

      {hasResult && (
        <>
          <ListBox className="mt-3">
            {cached.perEixoIdeas.map((e) => (
              <ListRow
                key={e.eixoId}
                bar={eixoColor(e.eixoId)}
                title={<span className="font-semibold">{e.idea}</span>}
                subtitle={e.eixoName}
                extra={
                  e.groundedOn.length > 0 ? (
                    <span className="mt-1 block text-[12px] text-[#4A4A44]">
                      Baseado em: {e.groundedOn.join("; ")}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </ListBox>
          <Note>
            Gerado em {new Date(cached.generatedAt).toLocaleString("pt-BR")}
          </Note>
        </>
      )}
    </section>
  );
}
