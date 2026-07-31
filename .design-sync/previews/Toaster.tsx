import { Toaster, toast } from "paxtools";
import * as React from "react";

/**
 * <Toaster/> renders nothing until something calls `toast()`, so each story
 * mounts the host and fires one toast on mount. `toast` ships from
 * window.PaxTools so it is the SAME sonner instance the bundled Toaster
 * listens to — importing "sonner" separately would create a second instance
 * and nothing would appear.
 */
function WithToast({ fire }: { fire: () => void }) {
  React.useEffect(() => {
    fire();
  }, [fire]);
  return (
    <div className="min-h-40">
      <Toaster />
    </div>
  );
}

export const Sucesso = () => (
  <WithToast
    fire={React.useCallback(
      () => toast.success("Progressão enviada para aprovação"),
      [],
    )}
  />
);

export const Erro = () => (
  <WithToast
    fire={React.useCallback(
      () => toast.error("Não foi possível salvar a ação. Tente novamente."),
      [],
    )}
  />
);

export const ComDescricao = () => (
  <WithToast
    fire={React.useCallback(
      () =>
        toast("Ação aprovada", {
          description: "Ana Beatriz concluiu “Aprendizagem Contínua”.",
        }),
      [],
    )}
  />
);
