import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { RAMO_LABELS, type Ramo } from "@/lib/ramos";

export function ComingSoon({ ramo }: { ramo: Ramo | null | undefined }) {
  const ramoLabel = ramo ? RAMO_LABELS[ramo] : "do seu ramo";
  return (
    <EmptyState icon={<Construction aria-hidden />} title="Em breve">
      A progressão pessoal {ramo ? `do ramo ${ramoLabel}` : ramoLabel} ainda não está disponível no
      Paxtools. Por enquanto, só o ramo Escoteiro está cadastrado.
    </EmptyState>
  );
}
