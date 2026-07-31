import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Button,
  Badge,
} from "paxtools";
import { ChevronDown } from "lucide-react";

export const Aberto = () => (
  <Collapsible defaultOpen className="max-w-md">
    <CollapsibleTrigger asChild>
      <Button variant="outline" className="w-full justify-between">
        Ações variáveis
        <ChevronDown />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-2 flex flex-col gap-2">
      <p className="text-sm">
        Enviar e receber mensagens simples em Alfabeto Fonético ou Semáfora.
      </p>
      <p className="text-sm">
        Visitar com a sua patrulha um quartel de bombeiros ou uma delegacia.
      </p>
      <p className="text-sm">
        Convidar um especialista da comunidade para dialogar com a tropa.
      </p>
    </CollapsibleContent>
  </Collapsible>
);

export const Fechado = () => (
  <Collapsible className="max-w-md">
    <CollapsibleTrigger asChild>
      <Button variant="outline" className="w-full justify-between">
        <span className="flex items-center gap-2">
          Especialidades
          <Badge variant="secondary">2</Badge>
        </span>
        <ChevronDown />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-2">
      <p className="text-sm">Campismo, Liderança</p>
    </CollapsibleContent>
  </Collapsible>
);
