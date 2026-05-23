import { Link, useLocation } from "@tanstack/react-router";
import { LayoutList, Sparkles } from "lucide-react";

export function PlanNav() {
  const { pathname } = useLocation();
  const onPlan = pathname.startsWith("/plan");

  const baseClass =
    "flex-1 flex items-center justify-center gap-1.5 h-9 text-sm font-bold rounded-md transition-all";
  const active = "bg-primary text-white border-2 border-black shadow-[2px_2px_0px_0px_#000]";
  const inactive = "text-foreground border-2 border-transparent hover:border-black hover:bg-white";

  return (
    <nav className="flex gap-1 p-1 bg-muted rounded-md border-2 border-black">
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
