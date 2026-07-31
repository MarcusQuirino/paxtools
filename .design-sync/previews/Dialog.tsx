import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Button,
  Input,
  Label,
} from "paxtools";

/** Rendered `open` so the card shows the dialog itself, not just a trigger. */
export const Aberto = () => (
  <Dialog open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Enviar progressão para aprovação</DialogTitle>
        <DialogDescription>
          As 4 ações marcadas serão enviadas ao escotista responsável. Você não
          poderá editá-las até a avaliação.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button>Enviar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const ComFormulario = () => (
  <Dialog open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova ação personalizada</DialogTitle>
        <DialogDescription>
          Descreva a ação combinada com o seu escotista.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="d1">Descrição</Label>
        <Input id="d1" defaultValue="Montar uma oficina de nós para a alcateia" />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button>Adicionar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
