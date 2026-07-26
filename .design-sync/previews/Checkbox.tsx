import { Checkbox, Label } from "paxtools";

export const Estados = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <Checkbox id="c1" defaultChecked />
      <Label htmlFor="c1">Ação aprovada pelo escotista</Label>
    </div>
    <div className="flex items-center gap-3">
      <Checkbox id="c2" />
      <Label htmlFor="c2">Ação ainda não realizada</Label>
    </div>
    <div className="flex items-center gap-3">
      <Checkbox id="c3" disabled defaultChecked />
      <Label htmlFor="c3">Aprovada e bloqueada para edição</Label>
    </div>
    <div className="flex items-center gap-3">
      <Checkbox id="c4" disabled />
      <Label htmlFor="c4">Indisponível nesta etapa</Label>
    </div>
  </div>
);

/** Especialidades list — one checkbox per alternative completion. */
export const ListaDeEspecialidades = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <Checkbox id="e1" defaultChecked />
      <Label htmlFor="e1">Campismo</Label>
    </div>
    <div className="flex items-center gap-3">
      <Checkbox id="e2" />
      <Label htmlFor="e2">Liderança</Label>
    </div>
    <div className="flex items-center gap-3">
      <Checkbox id="e3" />
      <Label htmlFor="e3">Pioneirias</Label>
    </div>
  </div>
);
