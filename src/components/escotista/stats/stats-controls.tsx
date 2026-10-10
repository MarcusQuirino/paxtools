import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

/**
 * Text clamped to `lines`; tapping it shows the rest (and tapping again
 * clamps it back). Short text is unaffected.
 */
export function ExpandableText({
  children,
  className = "",
  lines = 2,
}: {
  children: React.ReactNode;
  className?: string;
  lines?: 1 | 2;
}) {
  const [open, setOpen] = useState(false);
  const clamp = lines === 1 ? "truncate" : "line-clamp-2";
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      className={`w-full min-w-0 cursor-pointer text-left ${open ? "block" : clamp} ${className}`}
    >
      {children}
    </button>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  testId?: string;
}) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-md border-2 border-black bg-white px-2.5 focus-within:shadow-[2px_2px_0px_0px_#000]">
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        data-testid={testId}
      />
    </label>
  );
}

export type FilterOption<V extends string> = {
  value: V;
  label: string;
  color?: string;
};

/**
 * A filter as a compact pill over a native <select> (the phone's own picker).
 * Shows `label` while on `defaultValue`; filled once narrowed.
 */
export function FilterSelect<V extends string>({
  label,
  value,
  defaultValue,
  options,
  onChange,
  alwaysShowValue = false,
  testId,
}: {
  label: string;
  value: V;
  defaultValue: V;
  options: FilterOption<V>[];
  onChange: (v: V) => void;
  /** Sort pills show their value even on the default. */
  alwaysShowValue?: boolean;
  testId?: string;
}) {
  const current = options.find((o) => o.value === value);
  const narrowed = value !== defaultValue;
  const text = narrowed || alwaysShowValue ? current?.label : label;
  return (
    <label
      className={`relative flex h-8 min-w-0 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-bold transition-colors ${
        narrowed
          ? "border-black bg-black text-white"
          : "border-black/25 bg-white text-foreground hover:border-black"
      }`}
    >
      {current?.color && narrowed && (
        <span
          className="size-2 shrink-0 rounded-full ring-1 ring-white"
          style={{ background: current.color }}
        />
      )}
      <span className="truncate">{text}</span>
      <ChevronDown className="size-3.5 shrink-0 opacity-70" />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as V)}
        className="absolute inset-0 cursor-pointer opacity-0"
        data-testid={testId}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function normalizeSearch(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
