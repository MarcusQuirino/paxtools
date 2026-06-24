import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type ScoutRow = {
  _id: string;
  name: string | null;
  stageId: string;
  stageName: string;
  completedBlockCount: number;
  joinedAt: number;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function Acompanhamento({ scouts }: { scouts: ScoutRow[] }) {
  const now = Date.now();
  return (
    <section
      className="space-y-3 rounded-md border-2 border-black bg-card p-4 shadow-[2px_2px_0px_0px_#000]"
      data-testid="stats-acompanhamento"
    >
      <div>
        <h3 className="text-sm font-black uppercase">Acompanhamento</h3>
        <p className="text-[11px] text-muted-foreground">
          Para apoiar quem precisa — não é um ranking.
        </p>
      </div>
      <ul className="space-y-2">
        {scouts.map((s) => {
          const isNew = now - s.joinedAt < THIRTY_DAYS_MS;
          return (
            <li
              key={s._id}
              className="flex items-center gap-3 rounded-md border-2 border-black bg-muted/40 p-2"
            >
              <Avatar className="size-9 border-2 border-black">
                <AvatarFallback className="text-xs font-bold">
                  {s.name?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{s.name ?? "Sem nome"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {s.stageName} · {s.completedBlockCount} blocos
                  {isNew ? " · novo membro" : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
