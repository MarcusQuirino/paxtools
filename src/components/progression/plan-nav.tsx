import { Link, useLocation } from "@tanstack/react-router";
import { LayoutList, Sparkles } from "lucide-react";

export function PlanNav() {
  const { pathname } = useLocation();
  const onPlan = pathname.startsWith("/plan");

  const baseClass =
    "flex-1 flex items-center justify-center gap-1.5 h-9 text-sm font-medium rounded-md transition-colors";
  const active = "bg-card text-foreground shadow-sm";
  const inactive = "text-muted-foreground hover:text-foreground";

  return (
    <nav className="flex gap-1 p-1 bg-muted/60 rounded-lg">
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
