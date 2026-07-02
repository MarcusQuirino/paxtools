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

type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";
const RAMO_LABELS: Record<Ramo, string> = {
  lobinho: "Lobinho",
  escoteiro: "Escoteiro",
  senior: "Sênior",
  pioneiro: "Pioneiro",
};

export const Route = createFileRoute("/escotista/stats")({
  component: StatsPage,
});

function StatsPage() {
  const { ready } = useAuthGate("escotista");
  const { data: viewer } = useSuspenseQuery(convexQuery(api.users.viewer, {}));

  const myRamos = (viewer?.escotistaRamos ?? []) as Ramo[];
  const isAdmin = viewer?.isAdmin === true;
  const allRamos: Ramo[] = ["lobinho", "escoteiro", "senior", "pioneiro"];
  const selectableRamos = isAdmin ? allRamos : myRamos;
  const [ramo, setRamo] = useState<Ramo | undefined>(selectableRamos[0]);

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-md border-2 border-black bg-muted" />
      </div>
    );
  }

  if (selectableRamos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Você ainda não acompanha nenhum ramo.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="stats-page">
      <RamoSwitcher
        ramos={selectableRamos}
        value={ramo ?? selectableRamos[0]!}
        onChange={setRamo}
        labels={RAMO_LABELS}
      />
      <StatsBody key={ramo ?? selectableRamos[0]!} ramo={ramo ?? selectableRamos[0]!} />
    </div>
  );
}

function RamoSwitcher({
  ramos,
  value,
  onChange,
  labels,
}: {
  ramos: Ramo[];
  value: Ramo;
  onChange: (r: Ramo) => void;
  labels: Record<Ramo, string>;
}) {
  if (ramos.length <= 1) {
    return (
      <h2 className="text-lg font-black uppercase text-foreground">
        {labels[value]}
      </h2>
    );
  }
  return (
    <div
      className="flex flex-wrap gap-1 rounded-md border-2 border-black bg-muted p-1"
      role="tablist"
      aria-label="Ramo"
      data-testid="stats-ramo-switcher"
    >
      {ramos.map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={r === value}
          onClick={() => onChange(r)}
          className={`flex-1 rounded-md px-2 py-1.5 text-sm font-bold transition-all ${
            r === value
              ? "border-2 border-black bg-primary text-white shadow-[2px_2px_0px_0px_#000]"
              : "text-muted-foreground hover:bg-white/50"
          }`}
        >
          {labels[r]}
        </button>
      ))}
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
      <p className="py-8 text-center text-sm text-muted-foreground" data-testid="stats-empty">
        Nenhum escoteiro neste ramo ainda.
      </p>
    );
  }

  const chipClass = (active: boolean) =>
    `rounded-md px-2 py-1.5 text-sm font-bold transition-all ${
      active
        ? "border-2 border-black bg-primary text-white shadow-[2px_2px_0px_0px_#000]"
        : "text-muted-foreground hover:bg-white/50"
    }`;

  return (
    <div className="space-y-6" data-testid="stats-sections">
      <CoverageBars eixos={coverage.eixos} />
      <StageDistribution distribution={coverage.stageDistribution} scoutCount={coverage.scoutCount} />
      <MostDone activities={coverage.mostDone} scoutCount={coverage.scoutCount} />
      <div className="space-y-2" data-testid="stats-filters">
        <div className="flex flex-wrap gap-1 rounded-md border-2 border-black bg-muted p-1">
          <button
            type="button"
            onClick={() => setEixoFilter("all")}
            className={chipClass(eixoFilter === "all")}
          >
            Todas as áreas
          </button>
          {coverage.eixos.map((e) => (
            <button
              key={e.eixoId}
              type="button"
              onClick={() => setEixoFilter(e.eixoId)}
              className={chipClass(eixoFilter === e.eixoId)}
            >
              {e.eixoName}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 rounded-md border-2 border-black bg-muted p-1">
          {(
            [
              ["all", "Todas"],
              ["fixed", "Fixas"],
              ["variable", "Variáveis"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={chipClass(typeFilter === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <GapList
        topGapsFixed={coverage.topGapsFixed}
        neglectedVariable={coverage.neglectedVariable}
        scoutCount={coverage.scoutCount}
        eixoFilter={eixoFilter}
        typeFilter={typeFilter}
      />
      <Acompanhamento scouts={scouts} />
      <AiSuggestionsCard ramo={ramo} />
    </div>
  );
}
