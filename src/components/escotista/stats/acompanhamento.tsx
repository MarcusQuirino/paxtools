import { Link } from "@tanstack/react-router";
import { ListBox, Note, Section } from "@/components/ui/section";
import { ListRow } from "@/components/ui/list-row";
import { PersonAvatar } from "@/components/ui/person-avatar";

type ScoutRow = {
  _id: string;
  name: string | null;
  stageId: string;
  stageName: string;
  completedBlockCount: number;
  joinedAt: number;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Fewest blocos first (server order) — each row opens the escoteiro. */
export function Acompanhamento({ scouts }: { scouts: ScoutRow[] }) {
  const now = Date.now();
  return (
    <Section label="Acompanhamento" meta={scouts.length}>
      <Note className="mb-2 mt-0">Para apoiar quem precisa — não é um ranking.</Note>
      <ListBox testId="stats-acompanhamento">
        {scouts.map((s) => {
          const isNew = now - s.joinedAt < THIRTY_DAYS_MS;
          return (
            <ListRow
              key={s._id}
              leading={<PersonAvatar id={s._id} name={s.name} size={36} />}
              title={s.name ?? "Sem nome"}
              subtitle={`${s.stageName} · ${s.completedBlockCount} ${s.completedBlockCount === 1 ? "bloco" : "blocos"}${isNew ? " · novo membro" : ""}`}
              chevron
              link={
                <Link
                  to="/escotista/escoteiro/$escoteiroId"
                  params={{ escoteiroId: s._id }}
                />
              }
            />
          );
        })}
      </ListBox>
    </Section>
  );
}
