import { ActionItem } from "paxtools";
import { COLOR, noop } from "./_fixtures";

const TEXT =
  "Visitar com a sua patrulha: hospital, quartel de bombeiros, delegacia, empresas ou comércios locais para conhecer diferentes profissões.";

export const Estados = () => (
  <div className="flex flex-col gap-2 max-w-2xl">
    <ActionItem
      id="a1"
      text="Em conjunto com a sua patrulha, realizar um Percurso de Gilwell de pelo menos 3km."
      checked={false}
      onToggle={noop}
      color={COLOR}
    />
    <ActionItem
      id="a2"
      text="Conquistar uma especialidade sobre um tema de seu interesse."
      checked
      status="approved"
      onToggle={noop}
      color={COLOR}
    />
    <ActionItem
      id="a3"
      text={TEXT}
      checked
      status="pending"
      onToggle={noop}
      color={COLOR}
    />
  </div>
);

/** Plan mode adds a star toggle for building the personal plan. */
export const NoPlano = () => (
  <div className="flex flex-col gap-2 max-w-2xl">
    <ActionItem
      id="p1"
      text="Utilizar corretamente um rádio comunicador em atividade da patrulha."
      checked={false}
      onToggle={noop}
      color={COLOR}
      planned
      onTogglePlanned={noop}
    />
    <ActionItem
      id="p2"
      text="Realizar uma pesquisa sobre um tema escolhido e apresentar os resultados para a tropa."
      checked={false}
      onToggle={noop}
      color={COLOR}
      planned={false}
      onTogglePlanned={noop}
    />
  </div>
);

/** Escotista review: approved rows are locked against further edits. */
export const AprovadoBloqueado = () => (
  <div className="flex flex-col gap-2 max-w-2xl">
    <ActionItem
      id="l1"
      text="Conquistar uma especialidade sobre um tema de seu interesse."
      checked
      status="approved"
      onToggle={noop}
      color={COLOR}
      lockApproved
    />
  </div>
);
