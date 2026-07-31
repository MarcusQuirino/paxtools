/**
 * PROTOTYPE ONLY — throwaway. Floating variant switcher for `?variant=` routes.
 * Delete together with the prototype route it serves.
 */
import { useEffect } from "react";

type Props = {
  variants: { key: string; name: string }[];
  current: string;
  onChange: (key: string) => void;
};

export function PrototypeSwitcher({ variants, current, onChange }: Props) {
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        onChange(variants[(index - 1 + variants.length) % variants.length]!.key);
      } else if (e.key === "ArrowRight") {
        onChange(variants[(index + 1) % variants.length]!.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, variants, onChange]);

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full border-2 border-black bg-yellow-300 px-2 py-1.5 shadow-[4px_4px_0px_0px_#000]">
      <button
        type="button"
        aria-label="Variante anterior"
        onClick={() =>
          onChange(variants[(index - 1 + variants.length) % variants.length]!.key)
        }
        className="size-8 rounded-full border-2 border-black bg-white font-black leading-none"
      >
        ←
      </button>
      <span className="px-3 text-xs font-black uppercase tracking-wide whitespace-nowrap">
        {variants[index]!.key} — {variants[index]!.name}
      </span>
      <button
        type="button"
        aria-label="Próxima variante"
        onClick={() => onChange(variants[(index + 1) % variants.length]!.key)}
        className="size-8 rounded-full border-2 border-black bg-white font-black leading-none"
      >
        →
      </button>
    </div>
  );
}
