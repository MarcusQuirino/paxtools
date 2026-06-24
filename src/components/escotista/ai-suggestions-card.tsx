import { useState } from "react";
import { useAction } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Ramo } from "@/data/progression-data";

/**
 * "Sugestões da IA (beta)" — on-demand helper. The generate/regenerate button
 * fires the node action (which writes a cache row); the rendered content comes
 * from the reactive cached query, so a successful run updates the UI on its own.
 */
export function AiSuggestionsCard({ ramo }: { ramo?: Ramo }) {
  const suggest = useAction(api.ai.suggestActivities);
  const [loading, setLoading] = useState(false);
  const { data: cached } = useQuery(
    convexQuery(api.aiHelpers.getCachedSuggestion, { ramo }),
  );

  async function onGenerate() {
    setLoading(true);
    try {
      await suggest({ ramo });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao gerar sugestões";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const hasResult = !!cached;

  return (
    <section
      className="rounded-md border-2 border-black bg-card p-4 shadow-[2px_2px_0px_0px_#000] space-y-3"
      data-testid="stats-ai-suggestions"
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-base font-black uppercase text-foreground">
          <Sparkles className="size-4" />
          Sugestões da IA
          <span className="rounded border border-black px-1 text-[10px] font-bold uppercase">
            beta
          </span>
        </h2>
        <Button
          type="button"
          size="sm"
          onClick={() => void onGenerate()}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : hasResult ? (
            <RefreshCw className="size-4" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {loading ? "Gerando…" : hasResult ? "Gerar de novo" : "Gerar sugestões"}
        </Button>
      </header>

      {!hasResult && !loading && (
        <p className="text-sm text-muted-foreground">
          Gere ideias de jogos e dinâmicas a partir da cobertura deste ramo.
        </p>
      )}

      {hasResult && (
        <div className="space-y-3">
          <p className="text-sm text-foreground">{cached.overview}</p>
          <ul className="space-y-2">
            {cached.perEixoIdeas.map((e) => (
              <li
                key={e.eixoId}
                className="rounded-md border-2 border-black bg-muted p-2"
              >
                <p className="text-xs font-black uppercase text-muted-foreground">
                  {e.eixoName}
                </p>
                <p className="text-sm text-foreground">{e.idea}</p>
                {e.groundedOn.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Baseado em: {e.groundedOn.join("; ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Gerado em{" "}
            {new Date(cached.generatedAt).toLocaleString("pt-BR")}
          </p>
        </div>
      )}
    </section>
  );
}
