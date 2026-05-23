import { Link, useLocation } from "@tanstack/react-router";
import { LayoutList, Sparkles } from "lucide-react";

export function PlanNav() {
  const { pathname } = useLocation();
  const onPlan = pathname.startsWith("/plan");

  const baseClass =
    "flex-1 flex items-center justify-center gap-1.5 h-9 text-sm font-black uppercase tracking-wide rounded-sm transition-colors";
  const active = "bg-card text-foreground border-2 border-black shadow-[2px_2px_0_0_#000]";
  const inactive = "text-muted-foreground hover:text-foreground hover:bg-muted";

  return (
    <nav className="flex gap-1 p-1 bg-muted border-2 border-black rounded-sm">
      <Link
        to="/"
        className={`${baseClass} ${onPlan ? inactive : active}`}
      >
        <LayoutList className="size-4" />
        Tudo
      </Link>
      <Link
        to="/plan"
        className={`${baseClass} ${onPlan ? active : inactive}`}
      >
        <Sparkles className="size-4" />
        Meu Plano
      </Link>
    </nav>
  );
}
