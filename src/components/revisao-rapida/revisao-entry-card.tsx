import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  countRevisaoDeck,
  type RevisaoProgression,
} from "@/lib/revisao-deck";

/**
 * Escoteiro home entry to Revisão rápida: a yellow card with how many ações
 * are still unmarked. Renders nothing when there are none.
 */
export function RevisaoEntryCard({
  progression,
}: {
  progression: RevisaoProgression;
}) {
  const count = countRevisaoDeck(progression);
  if (count === 0) return null;
  return (
    <Link
      to="/revisao-rapida"
      data-testid="revisao-rapida-card"
      className="flex items-center gap-3 rounded-md border-2 border-black bg-yellow-400 px-4 py-3 text-black shadow-[4px_4px_0px_0px_#000] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
    >
      <span className="text-3xl" aria-hidden>
        🃏
      </span>
      <span className="flex-1">
        <span className="block font-black uppercase">Revisão rápida</span>
        <span className="block text-sm font-medium">
          {count} {count === 1 ? "ação" : "ações"} para revisar. Já fez alguma?
          Marque arrastando.
        </span>
      </span>
      <ArrowRight className="size-5 shrink-0" strokeWidth={3} />
    </Link>
  );
}
