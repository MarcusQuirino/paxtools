/**
 * 48px search field: ink border, search icon, 16px text (no iOS zoom), clear
 * button (44px target) when non-empty. Controlled.
 */
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar",
  ariaLabel,
  autoFocus,
  className,
  testId,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-12 items-center gap-2.5 rounded-[10px] border-2 border-[#141414] bg-white px-3 focus-within:ring-2 focus-within:ring-[#0E6B4E]/40",
        className,
      )}
    >
      <Search className="size-[22px] shrink-0 text-[#8A887F]" strokeWidth={2.5} aria-hidden />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        data-testid={testId}
        className="min-w-0 flex-1 bg-transparent text-base text-[#141414] outline-none placeholder:text-[#8A887F] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="-mr-2 grid size-11 shrink-0 place-items-center rounded-md text-[#4A4A44] hover:bg-black/5"
        >
          <X className="size-5" />
        </button>
      )}
    </label>
  );
}
