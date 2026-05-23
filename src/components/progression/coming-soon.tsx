import { Construction } from "lucide-react";
import { RAMO_LABELS, type Ramo } from "@/lib/ramos";

export function ComingSoon({ ramo }: { ramo: Ramo | null | undefined }) {
  const ramoLabel = ramo ? RAMO_LABELS[ramo] : "do seu ramo";
  return (
    <div className="rounded-md border-2 border-black bg-card p-8 text-center space-y-3 shadow-[4px_4px_0px_0px_#000]">
      <div className="mx-auto rounded-md bg-amber-100 border-2 border-black p-3 w-fit">
        <Construction className="size-7 text-amber-700" aria-hidden />
      </div>
      <h2 className="text-lg font-black uppercase">Em breve</h2>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        A progressão pessoal {ramo ? `do ramo ${ramoLabel}` : ramoLabel} ainda
        não está disponível no Paxtools. Por enquanto, só o ramo Escoteiro está
        cadastrado.
      </p>
    </div>
  );
}
