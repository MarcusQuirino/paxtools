import { Label, Input, Checkbox } from "paxtools";

export const ComCampo = () => (
  <div className="flex flex-col gap-2 max-w-sm">
    <Label htmlFor="l1">Nome da patrulha</Label>
    <Input id="l1" defaultValue="Patrulha Falcão" />
  </div>
);

export const ComCheckbox = () => (
  <div className="flex items-center gap-3">
    <Checkbox id="l2" defaultChecked />
    <Label htmlFor="l2">Concluí esta ação da progressão</Label>
  </div>
);

/** Labels inherit muted styling when their control is disabled. */
export const Desabilitado = () => (
  <div className="flex items-center gap-3">
    <Checkbox id="l3" disabled />
    <Label htmlFor="l3">Disponível apenas na 2ª Etapa</Label>
  </div>
);
