import { useMemo, useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { AuthButton } from "@/components/auth/auth-button";
import { PlanNav } from "@/components/progression/plan-nav";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Award, Trophy, BookOpen } from "lucide-react";
import {
  YOUNGER_SPECIALTIES_BY_EIXO,
  type YoungSpecialty,
} from "@/data/specialty-data/younger";
import { getSpecialtyLevel } from "@/lib/completion-logic";

export const Route = createFileRoute("/especialidades")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.specialties.getMySpecialtyItems, {}),
    );
  },
  component: EspecialidadesPage,
});

// ---------------------------------------------------------------------------
// Level badge
// ---------------------------------------------------------------------------

function LevelBadge({ level }: { level: 0 | 1 | 2 }) {
  if (level === 2)
    return (
      <Badge className="gap-1 bg-yellow-400 text-yellow-900 border-2 border-yellow-600 font-bold text-xs px-1.5 py-0.5">
        <Trophy className="size-3" />
        Nível 2
      </Badge>
    );
  if (level === 1)
    return (
      <Badge className="gap-1 bg-blue-100 text-blue-800 border-2 border-blue-400 font-bold text-xs px-1.5 py-0.5">
        <Award className="size-3" />
        Nível 1
      </Badge>
    );
  return null;
}

// ---------------------------------------------------------------------------
// Specialty card (collapsible item checklist)
// ---------------------------------------------------------------------------

type ItemRow = Doc<"specialtyItemCompletions">;

function SpecialtyCard({
  specialty,
  items,
  onToggle,
  isToggling,
}: {
  specialty: YoungSpecialty;
  items: ItemRow[];
  onToggle: (specialtyId: string, itemIndex: number) => void;
  isToggling: boolean;
}) {
  const [open, setOpen] = useState(false);

  const itemsByIndex = useMemo(() => {
    const m = new Map<number, ItemRow>();
    for (const item of items) {
      m.set(item.itemIndex, item);
    }
    return m;
  }, [items]);

  const approvedCount = useMemo(
    () => items.filter((i) => i.status === "approved" || !i.status).length,
    [items],
  );
  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items],
  );
  const level = getSpecialtyLevel(approvedCount, specialty.items.length) as 0 | 1 | 2;
  const totalItems = specialty.items.length;
  const progressPct = Math.round((approvedCount / totalItems) * 100);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 p-3 rounded-md border-2 border-black bg-card hover:bg-muted/50 transition-colors text-left shadow-[2px_2px_0px_0px_#000]"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-foreground">
                {specialty.name}
              </span>
              {level > 0 && <LevelBadge level={level} />}
              {pendingCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs border-amber-400 text-amber-700 bg-amber-50"
                >
                  {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted border border-black/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {approvedCount}/{totalItems} item{totalItems > 1 ? "ns" : ""} aprovado{approvedCount !== 1 ? "s" : ""}
            </p>
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-1 border-2 border-black rounded-md bg-card shadow-[2px_2px_0px_0px_#000] divide-y-2 divide-black/10">
          {/* Description */}
          <p className="px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            {specialty.description}
          </p>

          {/* Level threshold note */}
          <div className="px-4 py-2 bg-muted/30 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Nível 1: {totalItems / 2} itens
            </span>
            <span>·</span>
            <span className="font-medium text-foreground">
              Nível 2: {totalItems} itens
            </span>
          </div>

          {/* Items checklist */}
          <div className="divide-y divide-black/10">
            {specialty.items.map((itemText, index) => {
              const row = itemsByIndex.get(index);
              const status = row?.status ?? null;
              const isApproved = status === "approved" || (!status && !!row);
              const isPending = status === "pending";

              return (
                <label
                  key={index}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isApproved
                      ? "bg-green-50/50"
                      : isPending
                        ? "bg-amber-50/50"
                        : "hover:bg-muted/30"
                  } ${isApproved ? "cursor-default" : ""}`}
                >
                  <Checkbox
                    checked={isApproved || isPending}
                    disabled={isApproved || isToggling}
                    className={
                      isApproved
                        ? "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-700 mt-0.5"
                        : isPending
                          ? "data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-600 mt-0.5"
                          : "mt-0.5"
                    }
                    onCheckedChange={() => {
                      if (!isApproved) {
                        onToggle(specialty.id, index);
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm leading-relaxed ${
                        isApproved
                          ? "text-green-800 line-through decoration-green-400"
                          : isPending
                            ? "text-amber-800"
                            : "text-foreground"
                      }`}
                    >
                      <span className="font-bold mr-1">{index + 1}.</span>
                      {itemText}
                    </span>
                    {isPending && (
                      <p className="text-xs text-amber-600 mt-0.5 font-medium">
                        Aguardando aprovação
                      </p>
                    )}
                    {isApproved && (
                      <p className="text-xs text-green-600 mt-0.5 font-medium">
                        Aprovado ✓
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Eixo section (collapsible group of specialties)
// ---------------------------------------------------------------------------

const EIXO_LABELS: Record<string, { name: string; color: string }> = {
  "habilidades-para-a-vida": {
    name: "Habilidades para a Vida",
    color: "#E91E63",
  },
  "meio-ambiente": { name: "Meio Ambiente", color: "#4CAF50" },
  "paz-e-desenvolvimento": { name: "Paz e Desenvolvimento", color: "#2196F3" },
  "saude-e-bem-estar": { name: "Saúde e Bem-estar", color: "#FF9800" },
};

function EixoSection({
  eixoId,
  specialties,
  itemsBySpecialty,
  onToggle,
  isToggling,
}: {
  eixoId: string;
  specialties: YoungSpecialty[];
  itemsBySpecialty: Map<string, ItemRow[]>;
  onToggle: (specialtyId: string, itemIndex: number) => void;
  isToggling: boolean;
}) {
  const [open, setOpen] = useState(false);
  const meta = EIXO_LABELS[eixoId] ?? { name: eixoId, color: "#666" };

  // Count specialties with at least level 1
  const earnedCount = specialties.filter((s) => {
    const items = itemsBySpecialty.get(s.id) ?? [];
    const approved = items.filter(
      (i) => i.status === "approved" || !i.status,
    ).length;
    return getSpecialtyLevel(approved, s.items.length) >= 1;
  }).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 p-3 rounded-md border-2 border-black bg-card hover:bg-muted/30 transition-colors text-left shadow-[3px_3px_0px_0px_#000]"
        >
          <span
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: meta.color }}
          />
          <div className="flex-1">
            <p className="font-bold text-sm text-foreground">{meta.name}</p>
            <p className="text-xs text-muted-foreground">
              {specialties.length} especialidade{specialties.length !== 1 ? "s" : ""}
              {earnedCount > 0 && ` · ${earnedCount} conquistada${earnedCount !== 1 ? "s" : ""}`}
            </p>
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-2 pl-3">
          {specialties.map((s) => (
            <SpecialtyCard
              key={s.id}
              specialty={s}
              items={itemsBySpecialty.get(s.id) ?? []}
              onToggle={onToggle}
              isToggling={isToggling}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function EspecialidadesPage() {
  const { ready, user } = useAuthGate("escoteiro");

  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
          <header className="flex items-center justify-between">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="size-8 animate-pulse rounded-full bg-muted" />
          </header>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-md border-2 border-black bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  const ramo = user?.ramo;

  // Only show younger specialties for lobinho/escoteiro
  if (ramo === "senior" || ramo === "pioneiro") {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-4 pb-20">
          <header className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-black uppercase text-foreground">
              Especialidades
            </h1>
            <AuthButton />
          </header>
          <div className="rounded-md border-2 border-black bg-card p-6 text-center shadow-[3px_3px_0px_0px_#000]">
            <BookOpen className="size-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold">
              Especialidades para Sênior e Pioneiro em breve
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Estamos trabalhando no sistema de projetos (Conhecer / Fazer / Compartilhar).
            </p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return <YoungerEspecialidadesContent />;
}

function YoungerEspecialidadesContent() {
  const { data: myItems } = useSuspenseQuery(
    convexQuery(api.specialties.getMySpecialtyItems, {}),
  );

  const toggleItemFn = useConvexMutation(api.specialties.toggleSpecialtyItem);
  const { mutate: toggleItem, isPending: isToggling } = useMutation({
    mutationFn: toggleItemFn,
  });

  // Build a map: specialtyId → items[]
  const itemsBySpecialty = useMemo(() => {
    const m = new Map<string, Doc<"specialtyItemCompletions">[]>();
    for (const item of myItems) {
      if (item.ramoGroup !== "younger") continue;
      const arr = m.get(item.specialtyId) ?? [];
      arr.push(item);
      m.set(item.specialtyId, arr);
    }
    return m;
  }, [myItems]);

  const handleToggle = (specialtyId: string, itemIndex: number) => {
    toggleItem({ specialtyId, itemIndex });
  };

  const eixoIds = Object.keys(YOUNGER_SPECIALTIES_BY_EIXO);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-black uppercase text-foreground">
            Especialidades
          </h1>
          <AuthButton />
        </header>

        <PlanNav />

        <div className="space-y-2">
          {eixoIds.map((eixoId) => {
            const specialties = YOUNGER_SPECIALTIES_BY_EIXO[eixoId] ?? [];
            return (
              <EixoSection
                key={eixoId}
                eixoId={eixoId}
                specialties={specialties}
                itemsBySpecialty={itemsBySpecialty}
                onToggle={handleToggle}
                isToggling={isToggling}
              />
            );
          })}
        </div>

        <Footer />
      </div>
    </div>
  );
}
