import { SpecialtySection } from "paxtools";
import { blocoComEspecialidade, earnedSpecialtyIds } from "./_fixtures";

const alternatives = blocoComEspecialidade.alternativeCompletions;

/** Each especialidade links out to its detail page ("ver →"). */
export const Especialidades = () => (
  <div className="max-w-2xl">
    <SpecialtySection
      blocoId={blocoComEspecialidade.id}
      alternatives={alternatives}
    />
  </div>
);

/**
 * An earned especialidade (#44): the box is checked and read-only — since #47
 * marking happens on /especialidades, never from the bloco.
 */
export const ComEspecialidadeConcluida = () => (
  <div className="max-w-2xl">
    <SpecialtySection
      blocoId={blocoComEspecialidade.id}
      alternatives={alternatives}
      earnedSpecialtyIds={earnedSpecialtyIds}
    />
  </div>
);

/** Insígnias render alongside especialidades — listed, never boxed (#47). */
export const Insignia = () => (
  <div className="max-w-2xl">
    <SpecialtySection
      blocoId="aprendizagem-continua"
      alternatives={[{ type: "insignia", items: ["Insígnia do Aprender"] }]}
    />
  </div>
);
