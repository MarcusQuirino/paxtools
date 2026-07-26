import { Button } from "paxtools";
import { Plus, Trash2, Star } from "lucide-react";

export const Variantes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>Salvar progresso</Button>
    <Button variant="secondary">Ver detalhes</Button>
    <Button variant="outline">Cancelar</Button>
    <Button variant="destructive">Remover ação</Button>
    <Button variant="ghost">Voltar</Button>
    <Button variant="link">Saiba mais</Button>
  </div>
);

export const Tamanhos = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="sm">Pequeno</Button>
    <Button size="default">Padrão</Button>
    <Button size="lg">Grande</Button>
  </div>
);

export const ComIcone = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>
      <Plus />
      Adicionar ação
    </Button>
    <Button variant="destructive">
      <Trash2 />
      Excluir
    </Button>
    <Button variant="outline" size="icon" aria-label="Favoritar">
      <Star />
    </Button>
  </div>
);

export const Desabilitado = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button disabled>Salvar progresso</Button>
    <Button variant="outline" disabled>
      Cancelar
    </Button>
  </div>
);
