import { Sheet, SheetContent, SheetClose, Button, Label, Input } from "paxtools";
import { Star, Trash2 } from "lucide-react";

/**
 * A bottom sheet: `SheetContent` is `fixed inset-x-0 bottom-0`, so it anchors to
 * the viewport. Rendered `open` and given a single-story card so the panel is
 * visible instead of escaping the grid cell.
 */
export const Aberto = () => (
  <Sheet open>
    <SheetContent title="Mais opções">
      <h2 className="text-base font-bold">Aprendizagem Contínua</h2>
      <p className="text-sm text-muted-foreground">
        Escolha o que fazer com este bloco da progressão.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <Button variant="outline">
          <Star />
          Adicionar ao meu plano
        </Button>
        <Button variant="destructive">
          <Trash2 />
          Remover ação personalizada
        </Button>
        <SheetClose asChild>
          <Button variant="ghost">Fechar</Button>
        </SheetClose>
      </div>
    </SheetContent>
  </Sheet>
);

export const ComFormulario = () => (
  <Sheet open>
    <SheetContent title="Nova ação">
      <h2 className="text-base font-bold">Ação personalizada</h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="s1">Descrição</Label>
        <Input id="s1" placeholder="Combine a ação com o seu escotista..." />
      </div>
      <Button>Adicionar</Button>
    </SheetContent>
  </Sheet>
);
