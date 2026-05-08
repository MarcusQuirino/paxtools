import { useAuthActions } from "@convex-dev/auth/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { LogOut, Settings, Shield, Compass } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "?";
}

export function UserMenu() {
  const { signOut } = useAuthActions();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full size-8">
          <Avatar className="size-8">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback className="text-xs">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage
                src={user.image ?? undefined}
                alt={user.name ?? ""}
              />
              <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium leading-none truncate">
                  {user.name ?? "User"}
                </p>
                {user.role && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium ${
                      user.role === "escotista"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {user.role === "escotista" ? (
                      <Shield className="size-2.5" />
                    ) : (
                      <Compass className="size-2.5" />
                    )}
                    {user.role === "escotista" ? "Escotista" : "Escoteiro"}
                  </span>
                )}
              </div>
              {user.email && (
                <p className="text-xs text-muted-foreground leading-none truncate">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void navigate({ to: "/settings" })}>
          <Settings className="size-4 mr-2" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut className="size-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
