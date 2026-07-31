import { Input, Label, Button } from "paxtools";

export const Campos = () => (
  <div className="flex flex-col gap-4 max-w-sm">
    <div className="flex flex-col gap-2">
      <Label htmlFor="i1">Nome do escoteiro</Label>
      <Input id="i1" defaultValue="Ana Beatriz Camargo" />
    </div>
    <div className="flex flex-col gap-2">
      <Label htmlFor="i2">Nome da tropa</Label>
      <Input id="i2" placeholder="Ex.: Tropa Escoteira Araucária" />
    </div>
    <div className="flex flex-col gap-2">
      <Label htmlFor="i3">E-mail do escotista</Label>
      <Input id="i3" type="email" defaultValue="escotista@grupo123.org.br" />
    </div>
  </div>
);

export const Desabilitado = () => (
  <div className="flex flex-col gap-2 max-w-sm">
    <Label htmlFor="i4">Ramo (definido no cadastro)</Label>
    <Input id="i4" defaultValue="Escoteiro" disabled />
  </div>
);

/** Inline add-action row, as used inside a bloco. */
export const ComBotao = () => (
  <div className="flex items-center gap-2 max-w-md">
    <Input placeholder="Adicionar ação personalizada..." />
    <Button size="sm">Adicionar</Button>
  </div>
);
