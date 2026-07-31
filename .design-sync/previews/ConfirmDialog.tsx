import { ConfirmDialog } from "paxtools";
import { noop } from "./_fixtures";

export const Padrao = () => (
  <ConfirmDialog
    open
    onOpenChange={noop}
    title="Enviar para aprovação?"
    description="As 4 ações marcadas serão enviadas ao escotista responsável e ficarão bloqueadas até a avaliação."
    confirmLabel="Enviar"
    onConfirm={noop}
  />
);

/** `destructive` swaps the confirm button to the destructive variant. */
export const Destrutivo = () => (
  <ConfirmDialog
    open
    onOpenChange={noop}
    title="Remover ação personalizada?"
    description="A ação “Montar uma oficina de nós para os lobinhos da alcateia” será excluída definitivamente."
    confirmLabel="Remover"
    destructive
    onConfirm={noop}
  />
);

/** `busy` disables both buttons while the mutation is in flight. */
export const Processando = () => (
  <ConfirmDialog
    open
    onOpenChange={noop}
    title="Aprovar progressão?"
    description="Você está aprovando 6 ações de Ana Beatriz Camargo."
    confirmLabel="Aprovar"
    busy
    onConfirm={noop}
  />
);
