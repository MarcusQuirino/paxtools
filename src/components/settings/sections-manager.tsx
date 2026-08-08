import { useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Trash2, Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MAX_SECTION_NAME_LENGTH } from "../../../convex/lib/sections";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { RAMOS, RAMO_LABELS, RAMO_UNIT_PREFIX, type Ramo } from "@/lib/ramos";

type Section = { _id: Id<"sections">; name: string; ramo: Ramo };

const selectClasses =
  "h-9 rounded-md border-2 border-black bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1";

/** Ramo order first, then the order they were created in. */
function sortSections(sections: Section[]): Section[] {
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
    <section className="rounded-md border-2 border-black bg-card p-4 space-y-4 shadow-[3px_3px_0px_0px_#065f46]">
      <h2 className="text-sm font-black uppercase flex items-center gap-2">
        <Users className="size-4" />
        Seções
      </h2>

      {sections.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma seção ainda. Crie a alcateia, a tropa ou o clã do seu grupo.
        </p>
      ) : (
        <ul className="space-y-2">
          {sortSections(sections).map((section) => (
            <SectionRow key={section._id} section={section} />
          ))}
        </ul>
      )}

      <div className="space-y-2 border-t pt-3">
        <label htmlFor="new-section-name" className="text-xs font-medium">
          Nova seção
        </label>
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
            className={`${selectClasses} flex-1`}
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
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || adding}
            size="sm"
          >
            <Plus className="size-4 mr-1" />
            {adding ? "..." : "Adicionar"}
          </Button>
        </div>
        {addError && <p className="text-xs text-destructive">{addError}</p>}
      </div>
    </section>
  );
}

function SectionRow({ section }: { section: Section }) {
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

  return (
    <li className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-20 shrink-0 text-xs text-muted-foreground">
          {RAMO_LABELS[section.ramo]}
        </span>
        <Input
          aria-label={`Nome da seção ${section.name}`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          maxLength={MAX_SECTION_NAME_LENGTH}
        />
        {dirty && (
          <Button size="sm" onClick={handleRename} disabled={renaming}>
            {renaming ? "..." : "Salvar"}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={() => setConfirmRemove(true)}
          disabled={removing}
          title={`Remover ${section.name}`}
          aria-label={`Remover ${section.name}`}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
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
