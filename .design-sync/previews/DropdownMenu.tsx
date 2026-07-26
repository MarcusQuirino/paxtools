import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  Button,
} from "paxtools";
import { LogOut, Settings, User, Trash2 } from "lucide-react";

/** Rendered `open` so the menu surface itself is on the card. */
export const MenuDoUsuario = () => (
  <DropdownMenu open>
    <DropdownMenuTrigger asChild>
      <Button variant="outline">Ana Beatriz</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <User />
        Perfil
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Settings />
        Configurações
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">
        <LogOut />
        Sair
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const AcoesDoBloco = () => (
  <DropdownMenu open>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm">
        Ações
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuLabel>Filtrar tropa</DropdownMenuLabel>
      <DropdownMenuCheckboxItem checked>
        Somente pendentes
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem>Incluir aprovados</DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">
        <Trash2 />
        Remover ação
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
