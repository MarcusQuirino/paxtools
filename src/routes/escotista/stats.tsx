import { useState } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { CoverageBars } from "@/components/escotista/stats/coverage-bars";
import { StageDistribution } from "@/components/escotista/stats/stage-distribution";
import { MostDone } from "@/components/escotista/stats/most-done";
import { GapList } from "@/components/escotista/stats/gap-list";
import { Acompanhamento } from "@/components/escotista/stats/acompanhamento";
import { AiSuggestionsCard } from "@/components/escotista/ai-suggestions-card";
import { Section, SectionHeading } from "@/components/ui/section";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { EixoFilterChips, FilterChip, FilterChips } from "@/components/ui/filter-chips";

import { RAMO_LABELS, RAMOS, type Ramo } from "@/lib/ramos";

export const Route = createFileRoute("/escotista/stats")({
  component: StatsPage,
});

function StatsPage() {
  const { ready } = useAuthGate("escotista");
  const { data: viewer } = useSuspenseQuery(convexQuery(api.users.viewer, {}));

  const myRamos = (viewer?.escotistaRamos ?? []) as Ramo[];
  const isAdmin = viewer?.isAdmin === true;
  const selectableRamos = isAdmin ? RAMOS : myRamos;
  const [ramo, setRamo] = useState<Ramo | undefined>(selectableRamos[0]);

  if (!ready) {
    return (
      <div className="h-24 animate-pulse rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC]" />
    );
  }

  if (selectableRamos.length === 0) {
    return <EmptyState>Você ainda não acompanha nenhum ramo.</EmptyState>;
  }

  const current = ramo ?? selectableRamos[0]!;
  return (
    <div data-testid="stats-page">
      {selectableRamos.length > 1 ? (
        <div data-testid="stats-ramo-switcher">
          <SegmentedControl
            ariaLabel="Ramo"
            size="sm"
            value={current}
            onChange={setRamo}
            options={selectableRamos.map((r) => ({ value: r, label: RAMO_LABELS[r] }))}
          />
        </div>
      ) : (
        <SectionHeading className="mt-0" label={RAMO_LABELS[current]} meta="seu ramo" />
      )}
      <StatsBody key={current} ramo={current} />
    </div>
  );
}

function StatsBody({ ramo }: { ramo: Ramo }) {
  const { data: coverage } = useSuspenseQuery(
    convexQuery(api.stats.getRamoCoverage, { ramo }),
  );
  const { data: scouts } = useSuspenseQuery(
    convexQuery(api.stats.getRamoScouts, { ramo }),
  );
  const [eixoFilter, setEixoFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "fixed" | "variable">("all");

  if (coverage.scoutCount === 0) {
    return (
      <EmptyState className="mt-4" testId="stats-empty">
        Nenhum {RAMO_LABELS[ramo].toLowerCase()} neste ramo ainda.
      </EmptyState>
    );
  }

  return (
    <div className="mt-5" data-testid="stats-sections">
      <CoverageBars eixos={coverage.eixos} />
      <StageDistribution
        ramo={ramo}
        distribution={coverage.stageDistribution}
        scoutCount={coverage.scoutCount}
      />
      <MostDone activities={coverage.mostDone} scoutCount={coverage.scoutCount} />
      <Section label="Lacunas" meta="o que falta à tropa">
        <div className="mb-3 space-y-2" data-testid="stats-filters">
          <EixoFilterChips
            allLabel="Todas as áreas"
            value={eixoFilter === "all" ? null : eixoFilter}
            onChange={(id) => setEixoFilter(id ?? "all")}
          />
          <FilterChips ariaLabel="Filtrar por tipo">
            {(
              [
                ["all", "Fixas e variáveis"],
                ["fixed", "Fixas"],
                ["variable", "Variáveis"],
              ] as const
            ).map(([value, label]) => (
              <FilterChip
                key={value}
                on={typeFilter === value}
                onClick={() => setTypeFilter(value)}
                testId={`chip-tipo-${value}`}
              >
                {label}
              </FilterChip>
            ))}
          </FilterChips>
        </div>
        <GapList
          topGapsFixed={coverage.topGapsFixed}
          neglectedVariable={coverage.neglectedVariable}
          scoutCount={coverage.scoutCount}
          eixoFilter={eixoFilter}
          typeFilter={typeFilter}
        />
      </Section>
      <Acompanhamento scouts={scouts} />
      <AiSuggestionsCard ramo={ramo} />
    </div>
  );
}
