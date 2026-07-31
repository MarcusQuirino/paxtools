/**
 * Shared preview fixtures — realistic paxtools domain data.
 *
 * Content is taken from the real Ramo Escoteiro progression catalog
 * (src/data/progression-data/escoteiro.ts) and the real IRR rules
 * (src/data/progression-rules.ts) so preview cards show what an escoteiro
 * actually sees, not lorem ipsum. Not an entry point: buildPreviews only
 * compiles `<ComponentName>.tsx`, so this file is bundled into the previews
 * that import it and never becomes a card of its own.
 */
import type {
  Bloco,
  Eixo,
  CustomAction,
  CompletionStatus,
} from "@/data/types";

// Eixo 1 palette from the real catalog.
export const COLOR = "#E91E63";
export const COLOR_LIGHT = "#FCE4EC";

const B = "aprendizagem-continua";

export const bloco: Bloco = {
  id: B,
  name: "Aprendizagem Contínua e Desenvolvimento Vocacional",
  objective:
    "Explorar assuntos que você acha interessante, procurar informações confiáveis para experimentar novas ideias e recursos, colocando o que aprendeu em prática nas atividades e nos projetos de serviço.",
  eixoId: "habilidades-para-a-vida",
  fixedActions: [
    {
      id: `escoteiro:${B}:fixed:0`,
      text: "Conquistar, no Ramo Escoteiro, uma especialidade sobre um tema de seu interesse e que seja um conhecimento novo.",
      type: "fixed",
    },
    {
      id: `escoteiro:${B}:fixed:1`,
      text: "Em conjunto com a sua patrulha, realizar um Percurso de Gilwell de pelo menos 3km.",
      type: "fixed",
    },
  ],
  variableActions: [
    {
      id: `escoteiro:${B}:variable:0`,
      text: "Enviar e receber mensagens simples em Alfabeto Fonético, Código Internacional de Sinais, Semáfora, Heliografia, Cifra de César ou Criptografia.",
      type: "variable",
    },
    {
      id: `escoteiro:${B}:variable:1`,
      text: "Visitar com a sua patrulha: hospital, quartel de bombeiros, delegacia, empresas, comércios locais ou outros para conhecer diferentes profissões.",
      type: "variable",
    },
    {
      id: `escoteiro:${B}:variable:2`,
      text: "Conhecer o funcionamento de serviços de internet, rádio e TV, e usar esses conhecimentos para resolver problemas técnicos.",
      type: "variable",
    },
    {
      id: `escoteiro:${B}:variable:3`,
      text: "Convidar um especialista da comunidade para dialogar com a tropa e esclarecer dúvidas sobre determinado tema ou profissão.",
      type: "variable",
    },
  ],
  variableRequired: 4,
  alternativeCompletions: [{ type: "insignia", items: ["Insígnia do Aprender"] }],
};

/** A second bloco whose variable half can be satisfied by an especialidade. */
export const blocoComEspecialidade: Bloco = {
  id: "autonomia-lideranca",
  name: "Autonomia e Liderança",
  objective:
    "Viver diferentes funções na patrulha, sabendo quando ajudar e quando é sua vez de liderar. Planejar, colocar em prática e depois avaliar as tarefas com o grupo.",
  eixoId: "habilidades-para-a-vida",
  fixedActions: [
    {
      id: "escoteiro:autonomia-lideranca:fixed:0",
      text: "Montar corretamente uma mochila para um acampamento, mantendo o equipamento pessoal em bom estado.",
      type: "fixed",
    },
  ],
  variableActions: [
    {
      id: "escoteiro:autonomia-lideranca:variable:0",
      text: "Contribuir para o planejamento e a organização de uma excursão de patrulha.",
      type: "variable",
    },
    {
      id: "escoteiro:autonomia-lideranca:variable:1",
      text: "Pesquisar e realizar as compras dos alimentos para um acampamento, apresentando uma prestação de contas.",
      type: "variable",
    },
  ],
  variableRequired: 2,
  alternativeCompletions: [
    { type: "especialidade", items: ["Campismo", "Liderança"] },
  ],
};

export const eixo: Eixo = {
  id: "habilidades-para-a-vida",
  name: "Habilidades para a Vida",
  color: COLOR,
  colorLight: COLOR_LIGHT,
  blocos: [bloco, blocoComEspecialidade],
};

export const eixoServico: Eixo = {
  id: "servico-a-comunidade",
  name: "Serviço à Comunidade",
  color: "#2E7D32",
  colorLight: "#E8F5E9",
  blocos: [
    {
      ...bloco,
      id: "cidadania",
      name: "Cidadania e Participação",
      eixoId: "servico-a-comunidade",
    },
  ],
};

export const customActions: CustomAction[] = [
  {
    _id: "ca_1" as never,
    blocoId: B,
    text: "Montar uma oficina de nós para os lobinhos da alcateia.",
    completed: true,
    status: "approved" as CompletionStatus,
  },
  {
    _id: "ca_2" as never,
    blocoId: B,
    text: "Registrar o percurso da patrulha num diário de bordo ilustrado.",
    completed: false,
  },
];

/** Approved / pending id sets that leave the bloco visibly mid-progress. */
export const approvedActionIds = new Set([
  `escoteiro:${B}:fixed:0`,
  `escoteiro:${B}:variable:0`,
]);
export const pendingActionIds = new Set([`escoteiro:${B}:variable:1`]);
export const actionStatusMap = new Map<string, CompletionStatus>([
  [`escoteiro:${B}:fixed:0`, "approved"],
  [`escoteiro:${B}:variable:0`, "approved"],
  [`escoteiro:${B}:variable:1`, "pending"],
]);

export const completedSpecialties = [
  {
    blocoId: "autonomia-lideranca",
    specialtyName: "Campismo",
    status: "approved" as CompletionStatus,
  },
];

/** The real escoteiro IRR ("Lis de Ouro") shape. */
export const irr = {
  name: "Lis de Ouro",
  color: "#F9A825",
  colorLight: "#FFF8E1",
  blockThreshold: 18,
  items: [
    { id: "irr_blocos", text: "Concluir os 18 blocos da progressão.", auto: true },
    { id: "irr_especialidades", text: "Conquistar 6 especialidades, sendo ao menos uma de cada área.", auto: false },
    { id: "irr_servico", text: "Participar de um projeto de serviço à comunidade.", auto: false },
    { id: "irr_acampamentos", text: "Participar de pelo menos 10 acampamentos no Ramo Escoteiro.", auto: false },
    { id: "irr_avaliacao", text: "Realizar a avaliação final com o escotista responsável.", auto: false },
  ],
};

export const etapas = [
  { id: "primeira", name: "1ª Etapa", blocksRequired: 0, blocksToNext: 6 },
  { id: "segunda", name: "2ª Etapa", blocksRequired: 6, blocksToNext: 12 },
  { id: "terceira", name: "3ª Etapa", blocksRequired: 12, blocksToNext: 18 },
];

/** No-op handlers — preview cards are static renders. */
export const noop = () => {};
