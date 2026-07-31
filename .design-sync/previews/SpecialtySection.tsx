import { SpecialtySection } from "paxtools";
import { blocoComEspecialidade, completedSpecialties, noop } from "./_fixtures";

const alternatives = blocoComEspecialidade.alternativeCompletions;

/** Each especialidade links out to its detail page ("ver →"). */
export const Especialidades = () => (
  <div className="max-w-2xl">
    <SpecialtySection
      blocoId={blocoComEspecialidade.id}
      alternatives={alternatives}
      completedSpecialties={[]}
      onToggle={noop}
    />
  </div>
);

export const ComEspecialidadeConcluida = () => (
  <div className="max-w-2xl">
    <SpecialtySection
      blocoId={blocoComEspecialidade.id}
      alternatives={alternatives}
      completedSpecialties={completedSpecialties}
      onToggle={noop}
    />
  </div>
);

// `earnedSpecialtyIds` (earned via approved items, #44) is deliberately not a
// story: it marks the same box as `completedSpecialties`, so its static render
// is identical to ComEspecialidadeConcluida. The difference is that the box is
// read-only — behaviour a screenshot cannot show.

/** Insígnia alternatives render alongside especialidades. */
export const Insignia = () => (
  <div className="max-w-2xl">
    <SpecialtySection
      blocoId="aprendizagem-continua"
      alternatives={[{ type: "insignia", items: ["Insígnia do Aprender"] }]}
      completedSpecialties={[]}
      onToggle={noop}
    />
  </div>
);
