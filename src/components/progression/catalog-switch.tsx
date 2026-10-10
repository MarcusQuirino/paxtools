/** Which catalog the Especialidades tab shows. */
export type CatalogTab = "especialidades" | "insignias";

/**
 * The "Especialidades | Insígnias" switch at the top of the Especialidades
 * tab (escoteiro and escotista). Insígnias de interesse especial live next to
 * especialidades because blocos offer both as the same "ou" alternative.
 */
export function CatalogSwitch({
  value,
  onChange,
}: {
  value: CatalogTab;
  onChange: (tab: CatalogTab) => void;
}) {
  const tabs: [CatalogTab, string][] = [
    ["especialidades", "Especialidades"],
    ["insignias", "Insígnias"],
  ];
  return (
    <div
      role="tablist"
      aria-label="Especialidades ou insígnias"
      className="mb-3 flex gap-1 rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC] p-1"
    >
      {tabs.map(([tab, label]) => {
        const on = tab === value;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab)}
            className={`min-h-11 flex-1 rounded-md border-2 px-2 text-[13px] font-extrabold ${
              on
                ? "border-[#141414] bg-white shadow-[2px_2px_0_#141414]"
                : "border-transparent text-[#4A4A44]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
