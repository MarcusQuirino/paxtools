import { Construction } from "lucide-react";
import { RAMO_LABELS, type Ramo } from "@/lib/ramos";

export function ComingSoon({ ramo }: { ramo: Ramo | null | undefined }) {
  const ramoLabel = ramo ? RAMO_LABELS[ramo] : "do seu ramo";
  return (
    <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
      <div className="mx-auto rounded-full bg-amber-100 p-3 w-fit">
        <Construction className="size-7 text-amber-600" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">Em breve</h2>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        A progressão pessoal {ramo ? `do ramo ${ramoLabel}` : ramoLabel} ainda
        não está disponível no Paxtools. Por enquanto, só o ramo Escoteiro está
        cadastrado.
      </p>
    </div>
  );
}
