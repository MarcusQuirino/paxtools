import { useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MAX_SECTION_NAME_LENGTH } from "../../../convex/lib/sections";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HardButton } from "@/components/ui/hard-button";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { Card, ListBox, Note, Section } from "@/components/ui/section";
import { FieldError, FieldLabel } from "@/components/settings/field";
import { RAMOS, RAMO_LABELS, RAMO_UNIT_PREFIX, type Ramo } from "@/lib/ramos";

type SectionDoc = { _id: Id<"sections">; name: string; ramo: Ramo };

/** Native select styled like `ui/input`: 48px, 2px ink, 16px text. */
const selectClasses =
  "h-12 rounded-[10px] border-2 border-[#141414] bg-white px-3 text-base text-[#141414] outline-none focus-visible:ring-2 focus-visible:ring-[#141414] focus-visible:ring-offset-1";

/** Ramo order first, then the order they were created in. */
function sortSections(sections: SectionDoc[]): SectionDoc[] {
  return [...sections].sort(
    (a, b) => RAMOS.indexOf(a.ramo) - RAMOS.indexOf(b.ramo),
  );
}

/**
 * A grupo's seções: one named local unit per row, each belonging to a ramo.
 * Admin-only; a grupo may run two seções of the same ramo, or none for a ramo.
 */
export function SectionsManager() {
  const { data: sections } = useSuspenseQuery(
    convexQuery(api.groups.listSections, {}),
  );

  const [newName, setNewName] = useState("");
  const [newRamo, setNewRamo] = useState<Ramo>("lobinho");
  const [addError, setAddError] = useState("");

  const addSectionFn = useConvexMutation(api.groups.addSection);
  const { mutate: addSection, isPending: adding } = useMutation({
    mutationFn: addSectionFn,
  });

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    setAddError("");
    addSection(
      { name, ramo: newRamo },
      {
        onSuccess: () => setNewName(""),
        onError: (err) => setAddError(err.message),
      },
    );
  };

  return (
    <Section label="Seções" meta={sections.length || undefined}>
      {sections.length === 0 ? (
        <Note className="mb-3 mt-0">
          Nenhuma seção ainda. Crie a alcateia, a tropa ou o clã do seu grupo.
        </Note>
      ) : (
        <ListBox className="mb-3">
          <ul>
            {sortSections(sections).map((section) => (
              <SectionRow key={section._id} section={section} />
            ))}
          </ul>
        </ListBox>
      )}

      <Card className="space-y-2.5">
        <FieldLabel htmlFor="new-section-name">Nova seção</FieldLabel>
        <Input
          id="new-section-name"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setAddError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={`Ex: ${RAMO_UNIT_PREFIX[newRamo]} Potiguara`}
          maxLength={MAX_SECTION_NAME_LENGTH}
        />
        <div className="flex items-center gap-2">
          <select
            aria-label="Ramo da nova seção"
            className={`${selectClasses} min-w-0 flex-1`}
            value={newRamo}
            onChange={(e) => {
              setNewRamo(e.target.value as Ramo);
              setAddError("");
            }}
          >
            {RAMOS.map((r) => (
              <option key={r} value={r}>
                {RAMO_LABELS[r]}
              </option>
            ))}
          </select>
          <HardButton
            className="min-h-12"
            onClick={handleAdd}
            disabled={!newName.trim() || adding}
          >
            <Plus aria-hidden />
            {adding ? "..." : "Adicionar"}
          </HardButton>
        </div>
        <FieldError>{addError}</FieldError>
      </Card>
    </Section>
  );
}

function SectionRow({ section }: { section: SectionDoc }) {
  const [name, setName] = useState(section.name);
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const renameSectionFn = useConvexMutation(api.groups.renameSection);
  const { mutate: renameSection, isPending: renaming } = useMutation({
    mutationFn: renameSectionFn,
  });

  const removeSectionFn = useConvexMutation(api.groups.removeSection);
  const { mutate: removeSection, isPending: removing } = useMutation({
    mutationFn: removeSectionFn,
  });

  // The reactive query pushes a rename back down, so `section.name` is the
  // source of truth and the row goes clean again once the save lands.
  const dirty = name.trim() !== section.name && name.trim() !== "";

  const handleRename = () => {
    if (!dirty) return;
    setError("");
    renameSection(
      { sectionId: section._id, name: name.trim() },
      { onError: (err) => setError(err.message) },
    );
  };

  // Removing a seção is irreversible, so it is confirmed like the grupo's other
  // destructive admin actions (banir, excluir grupo).
  const handleRemove = () => {
    setError("");
    removeSection(
      { sectionId: section._id },
      {
        onSuccess: () => setConfirmRemove(false),
        onError: (err) => {
          setConfirmRemove(false);
          setError(err.message);
        },
      },
    );
  };

  // The divider lives on the <li> (ListRow is always its li's first child,
  // so its own `first:border-t-0` would drop every divider).
  return (
    <li className="border-t-[1.5px] border-[#D9D5C9] first:border-t-0">
      <ListRow
        leading={
          <span className="w-16 shrink-0 text-[12px] font-extrabold text-[#4A4A44]">
            {RAMO_LABELS[section.ramo]}
          </span>
        }
        title={
          <Input
            aria-label={`Nome da seção ${section.name}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            maxLength={MAX_SECTION_NAME_LENGTH}
            className="font-semibold"
          />
        }
        extra={
          error ? (
            <span role="alert" className="mt-1 block text-[12px] font-bold text-[#C62828]">
              {error}
            </span>
          ) : undefined
        }
        trailing={
          <span className="flex shrink-0 items-center gap-2">
            {dirty && (
              <HardButton size="md" onClick={handleRename} disabled={renaming}>
                {renaming ? "..." : "Salvar"}
              </HardButton>
            )}
            <HardButton
              tone="danger"
              className="w-11 px-0"
              onClick={() => setConfirmRemove(true)}
              disabled={removing}
              title={`Remover ${section.name}`}
              aria-label={`Remover ${section.name}`}
            >
              <Trash2 aria-hidden />
            </HardButton>
          </span>
        }
      />
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remover seção"
        description={`A seção "${section.name}" será removida do grupo. Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        destructive
        busy={removing}
        onConfirm={handleRemove}
      />
    </li>
  );
}
