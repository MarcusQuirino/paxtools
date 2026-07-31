import { Badge } from "paxtools";
import { Check, Clock } from "lucide-react";

export const Variantes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Badge>Completo</Badge>
    <Badge variant="secondary">3/6</Badge>
    <Badge variant="outline">1ª Etapa</Badge>
    <Badge variant="destructive">Pendente</Badge>
    <Badge variant="ghost">Rascunho</Badge>
  </div>
);

/** How the progression view labels a bloco's approval state. */
export const EstadoDaAcao = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Badge>
      <Check />
      Aprovado
    </Badge>
    <Badge variant="secondary">
      <Clock />
      Aguardando escotista
    </Badge>
  </div>
);

export const ContagemDeBlocos = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Badge variant="secondary">0/18</Badge>
    <Badge variant="secondary">9/18</Badge>
    <Badge>18/18</Badge>
  </div>
);
