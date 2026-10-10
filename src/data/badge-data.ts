/**
 * Insígnias de interesse especial — "special interest badges" in code.
 *
 * A badge is like an especialidade without levels: the escoteiro must
 * satisfy ALL of its requirement groups. Blocos name badges in their
 * `alternativeCompletions` (type "insignia"); an earned badge satisfies that
 * bloco's variable section.
 *
 * `id` is the slug of `name` (toSpecialtySlug) — the bloco catalog names
 * badges by display name and resolves them by that slug. Requirements may
 * differ per ramo and come in groups that may ask for only some of their
 * items ("pelo menos duas", "sendo obrigatória a primeira", "Opção 1 ou 2");
 * `requirements.all` applies to every ramo without its own list. A badge
 * with no requirements for a ramo is listed but not trackable there.
 *
 * Aprender, Cone Sul, Lusofonia, Desafio Comunitário and Boa Ação are
 * verbatim from escoteiros.org.br/insignias-do-ramo-*; the project-style
 * badges (Tribo da Terra, Escoteiros do Mundo, Mensageiros da Paz,
 * Inovadores de Impacto) summarise the steps of their official guides.
 * Not yet catalogued — no UEB requirement list found: "Diálogo
 * Inter-religioso", "Diálogos pela Paz", "Insígnia da Ação Comunitária".
 */
import type { Ramo } from "./progression-data";

/**
 * One section of a badge's requirements, as the official list groups them
 * (e.g. "Cultura — Realizar pelo menos três…"). A group is satisfied when at
 * least `required` of its items are approved, including every `mandatory` one.
 */
export type RequirementGroup = {
  title?: string;
  /** The official rule text, shown to the escoteiro. */
  rule?: string;
  /** How many items must be approved; omitted = all of them. */
  required?: number;
  /** Indexes (within `items`) that are always required. */
  mandatory?: number[];
  items: string[];
};

export type SpecialInterestBadge = {
  id: string;
  /** Display name, exactly as the bloco catalog spells it. */
  name: string;
  /** English name — WOSM's official one for global badges, else a translation. */
  englishName: string;
  description: string;
  requirements: Partial<Record<Ramo | "all", RequirementGroup[]>>;
  /** Where the requirement text comes from. */
  source?: string;
};

export const SPECIAL_INTEREST_BADGES: SpecialInterestBadge[] = [
  {
    id: "insignia-do-aprender",
    name: "Insígnia do Aprender",
    englishName: "Learning Badge",
    description:
      "Fortalece hábitos de estudo e aprendizagem. Atividades em três áreas (Aprendendo a Aprender, Aprendendo com os outros, Atitude para aprender e ensinar), adaptadas por ramo.",
    source: "https://www.escoteiros.org.br/insignias-do-ramo-lobinho/",
    requirements: {
      lobinho: [
        {
          title: "Aprendendo a Aprender",
          items: [
            "Organizar o espaço de estudo adequadamente, observando a sua iluminação, local para acondicionamento dos materiais e ambiente.",
            "Ter o seu material escolar devidamente organizado, demonstrado cuidados com os livros, cadernos e demais materiais.",
            "Destinar o tempo adequado para seu estudo e tarefas de casa, relatando aos pais, a Akela ou outro Velho Lobo quanto tempo utiliza para essas atividades.",
          ],
        },
        {
          title: "Aprendendo com os outros",
          items: [
            "Participar, como Lobinho, de pelo menos uma edição do Projeto Educação Escoteira com sua Alcateia, ou de outra atividade em conjunto com escolas realizada pela sua Alcateia ou pelo seu Grupo Escoteiro/Seção Autônoma.",
            "Participar ativamente de pelo menos duas atividades especiais em sua escola (Ex.: Festa Junina, Feira de Ciências, Excursão, etc.) e mostrar fotos ou relatório para a Alcateia.",
          ],
        },
        {
          title: "Atitude para aprender e ensinar",
          items: [
            "Apoiar um colega de classe em alguma tarefa ou ajudá-lo a aprender algum conteúdo que tenha dificuldade.",
            "Conversar com seus pais , Akela ou outro Velho Lobo sobre sua participação na escola, seu interesse pelos estudos e sobre os pontos que podem ser melhorados para ser um melhor aluno.",
          ],
        },
      ],
      escoteiro: [
        {
          title: "Aprendendo a Aprender",
          items: [
            "Manter seu local e materiais de estudo organizados e possuir uma agenda semanal para estudar, realizar as tarefas escolares e leitura de livros.",
            "Elaborar um calendário contendo as atividades escolares, como eventos, provas, atividades extraclasses, etc., bem como os eventos de sua atividade escoteira.",
            "Saber fazer anotações e resumos das aulas, apresentando as anotações, destaques de texto ou resumos existentes em seus livros e/ou cadernos escolares. Utilizando suas anotações, explicar ao escotista pelo menos dois conteúdos aprendidos em sala de aula.",
          ],
        },
        {
          title: "Aprendendo com os outros",
          items: [
            "Participar, como escoteiro, de pelo menos uma edição do Projeto Educação Escoteira ou de outra atividade em conjunto com escolas realizada pela sua patrulha, tropa ou grupo escoteiro.",
            "Preparar um cartaz, folder ou outro material similar sobre um dos seguintes temas: bullying, organização de local de estudo, bons hábitos de estudo ou outro tema relacionado a educação.",
            "Preparar e aplicar para sua patrulha ou tropa um jogo ou técnica escoteira relacionando-o a uma das matérias estudadas na escola.",
          ],
        },
        {
          title: "Atitude para aprender e ensinar",
          items: [
            "Participar de um grupo de estudo ou trabalho em grupo sobre determinada matéria.",
            "Realizar uma reflexão pessoal sobre seu ambiente escolar, analisando os pontos positivos e pontos que podem ser melhorados. A reflexão deverá ser compartilhada com pelo menos um de seus professores.",
          ],
        },
      ],
      senior: [
        {
          title: "Aprendendo a Aprender",
          rule: "Realizar pelo menos duas dentre as atividades abaixo",
          items: [
            "Saber o que é um mapa mental, qual sua utilidade e desenvolver um mapa mental sobre um tema ou conteúdo a sua escolha.",
            "Discutir com o escotista as vantagens e desvantagens de diferentes métodos de pesquisa que são utilizados na escola, tais como biblioteca, internet, jornais, etc.",
          ],
        },
        {
          title: "Aprendendo com os outros",
          rule: "Realizar duas das opções abaixo, sendo obrigatória a primeira",
          required: 2,
          mandatory: [0],
          items: [
            "Participar, como sênior, de pelo menos uma edição do Projeto Educação Escoteira ou de outra atividade em conjunto com escolas realizada pela sua patrulha, tropa ou grupo escoteiro.",
            "Participar de um teste vocacional, feira de profissões ou outra experiência similar. A partir dessa experiência conversar com seus pais sobre as profissões que mais lhe despertaram interesse para exercer no futuro.",
            "Entrevistar dois profissionais com carreiras estabelecidas, cuja profissão seja de seu interesse. Procurar descobrir como eles foram educados, qual a formação necessária para a profissão e como continuam a se formar e se aperfeiçoar na profissão. A entrevista pode ser feita por vídeo e disponibilizada nas redes sociais.",
            "Realizar, em conjunto com sua patrulha ou grupo de interesse, uma visita a instituição de ensino (faculdade, universidade, educação profissionalizante, etc.) promovendo debate posterior.",
          ],
        },
        {
          title: "Atitude para aprender e ensinar",
          rule: "Realizar as duas atividades abaixo",
          required: 2,
          items: [
            "Participar de algum projeto ou atividade extracurricular oferecido pela sua escola. Relatar sua experiência ao escotista.",
            "Selecionar uma notícia sobre um assunto relevante na atualidade, realizando pesquisa sobre o tema em diferentes fontes e meios de comunicação. Escrever uma crítica sobre o tema, citando as fontes pesquisadas e seu ponto de vista sobre o tema.",
            "Participar ativamente do Grêmio Estudantil de sua escola.",
          ],
        },
      ],
      pioneiro: [
        {
          title: "Aprendendo a Aprender",
          rule: "Realizar as três atividades abaixo",
          items: [
            "Participar de pelo menos dois cursos ou seminários de sua preferência, cujos temas sejam relevantes para sua vida acadêmica ou carreira profissional. Deverá ser apresentado um resumo de sua participação ao Clã Pioneiro ou algum tipo de produção que descreva sua participação e os assuntos abordados.",
            "Montar seu currículo profissional, relacionando suas aptidões, iniciativas de formação pessoas e outras experiências relevantes.",
            "Redigir um trabalho acadêmico, com tema de sua livre escolha, utilizando as normas de Metodologia Científica.",
          ],
        },
        {
          title: "Aprendendo com os outros",
          rule: "Realizar as duas atividades abaixo",
          items: [
            "Participar, como pioneiro, de pelo menos uma edição do Projeto Educação Escoteira, ajudando na organização e aplicação das atividades.",
            "Organizar e conduzir um debate com os membros de seu Clã Pioneiro, contando com a participação de um profissional da área de educação, sobre os principais desafios da educação em nosso país e como poderia melhorá-la.",
          ],
        },
        {
          title: "Atitude para aprender e ensinar",
          rule: "Realizar todas as atividades abaixo",
          items: [
            "Propor, planejar e executar uma atividade educativa para alunos de uma escola pública, com duração mínima de 3 horas. Os objetivos educativos da atividade devem ser convergente com as necessidades da faixa etária que será beneficiada.",
            "Realizar uma reflexão e incluir no seu Plano de Desenvolvimento Pessoal (Projeto de Vida) as fases e estratégias para o desenvolvimento acadêmico e/ou profissional.",
          ],
        },
      ],
    },
  },
  {
    id: "reduzir-reciclar-reutilizar",
    name: "Reduzir, Reciclar, Reutilizar",
    englishName: "Reduce, Reuse, Recycle",
    description:
      "Insígnia da Tribo da Terra, inspirada no Tide Turners Plastic Challenge (PNUMA/OMME). Projeto de consumo responsável e redução, reutilização e reciclagem de resíduos (tema Planeta Limpo).",
    source: "https://www.escoteiros.org.br/wp-content/uploads/2025/11/Guia_tribo_da_terra_ramo_escoteiro.pdf",
    requirements: {
      lobinho: [
        {
          items: [
            "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
            "Tema do projeto: Planeta Limpo: consumo responsável e processo de reduzir, reutilizar e reciclar (3Rs) os resíduos do cotidiano",
            "Combinar com o escotista os objetivos, ações e duração do projeto",
            "Etapa CONHECER: aprender sobre ecossistemas aquáticos e terrestres e como prevenir a poluição, reduzir, reutilizar e reciclar resíduos",
            "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
            "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
            "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
            "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
          ],
        },
      ],
      escoteiro: [
        {
          items: [
            "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
            "Tema do projeto: Planeta Limpo: consumo responsável e processo de reduzir, reutilizar e reciclar (3Rs) os resíduos do cotidiano",
            "Combinar com o escotista os objetivos, ações e duração do projeto",
            "Etapa CONHECER: aprender sobre ecossistemas aquáticos e terrestres e como prevenir a poluição, reduzir, reutilizar e reciclar resíduos",
            "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
            "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
            "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
            "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
          ],
        },
      ],
      senior: [
        {
          items: [
            "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
            "Tema do projeto: Planeta Limpo: consumo responsável e processo de reduzir, reutilizar e reciclar (3Rs) os resíduos do cotidiano",
            "Combinar com o escotista os objetivos, ações e duração do projeto",
            "Etapa CONHECER: aprender sobre ecossistemas aquáticos e terrestres e como prevenir a poluição, reduzir, reutilizar e reciclar resíduos",
            "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
            "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
            "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
            "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
          ],
        },
      ],
    },
  },
  {
    id: "escoteiros-pela-energia-solar",
    name: "Escoteiros pela Energia Solar",
    englishName: "Scouts Go Solar",
    description:
      "Insígnia da Tribo da Terra (Solafrica/OMME). Projeto sobre energia solar e outras energias renováveis, podendo incluir experimento demonstrado à Tropa.",
    source: "https://www.escoteiros.org.br/wp-content/uploads/2025/11/Guia_tribo_da_terra_ramo_escoteiro.pdf",
    requirements: {
      lobinho: [
        {
          items: [
            "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
            "Tema do projeto: Energias renováveis: projeto ligado à energia solar ou outras energias renováveis (pode ser a execução e demonstração à Tropa de um experimento)",
            "Combinar com o escotista os objetivos, ações e duração do projeto",
            "Etapa CONHECER: aprender sobre energia solar e outros tipos de energia renovável",
            "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
            "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
            "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
            "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
          ],
        },
      ],
      escoteiro: [
        {
          items: [
            "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
            "Tema do projeto: Energias renováveis: projeto ligado à energia solar ou outras energias renováveis (pode ser a execução e demonstração à Tropa de um experimento)",
            "Combinar com o escotista os objetivos, ações e duração do projeto",
            "Etapa CONHECER: aprender sobre energia solar e outros tipos de energia renovável",
            "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
            "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
            "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
            "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
          ],
        },
      ],
      senior: [
        {
          items: [
            "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
            "Tema do projeto: Energias renováveis: projeto ligado à energia solar ou outras energias renováveis (pode ser a execução e demonstração à Tropa de um experimento)",
            "Combinar com o escotista os objetivos, ações e duração do projeto",
            "Etapa CONHECER: aprender sobre energia solar e outros tipos de energia renovável",
            "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
            "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
            "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
            "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
          ],
        },
      ],
    },
  },
  {
    id: "campeoes-da-natureza",
    name: "Campeões da Natureza",
    englishName: "Champions for Nature",
    description:
      "Insígnia da Tribo da Terra. Projeto de sustentabilidade ou biodiversidade que leve a comunidade a hábitos sustentáveis e à proteção da natureza.",
    source: "https://www.escoteiros.org.br/wp-content/uploads/2025/11/Guia_tribo_da_terra_ramo_escoteiro.pdf",
    requirements: {
      lobinho: [
        {
          items: [
            "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
            "Tema do projeto: Sustentabilidade (hábitos sustentáveis, consumo responsável) OU Biodiversidade (conscientização e ação sobre o declínio da biodiversidade) - escolher um dos dois",
            "Combinar com o escotista os objetivos, ações e duração do projeto",
            "Etapa CONHECER: aprender sobre o ambiente ao redor e os principais problemas ambientais ligados aos hábitos de vida e à biodiversidade",
            "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
            "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
            "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
            "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
          ],
        },
      ],
      escoteiro: [
        {
          items: [
            "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
            "Tema do projeto: Sustentabilidade (hábitos sustentáveis, consumo responsável) OU Biodiversidade (conscientização e ação sobre o declínio da biodiversidade) - escolher um dos dois",
            "Combinar com o escotista os objetivos, ações e duração do projeto",
            "Etapa CONHECER: aprender sobre o ambiente ao redor e os principais problemas ambientais ligados aos hábitos de vida e à biodiversidade",
            "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
            "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
            "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
            "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
          ],
        },
      ],
      senior: [
        {
          items: [
            "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
            "Tema do projeto: Sustentabilidade (hábitos sustentáveis, consumo responsável) OU Biodiversidade (conscientização e ação sobre o declínio da biodiversidade) - escolher um dos dois",
            "Combinar com o escotista os objetivos, ações e duração do projeto",
            "Etapa CONHECER: aprender sobre o ambiente ao redor e os principais problemas ambientais ligados aos hábitos de vida e à biodiversidade",
            "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
            "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
            "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
            "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
          ],
        },
      ],
    },
  },
  {
    id: "escoteiros-do-mundo",
    name: "Escoteiros do Mundo",
    englishName: "Scouts of the World",
    description:
      "Reconhecimento da OMME para jovens de 15 a 21 anos (escoteiros ou não): projeto de voluntariado sobre desenvolvimento, paz ou meio ambiente, em 6 etapas.",
    source: "https://www.escoteiros.org.br/wp-content/uploads/2022/08/Documento_base_escoteiros_do_mundo.pdf",
    requirements: {
      senior: [
        {
          items: [
            "Ter entre 15 e 20,5 anos ao iniciar; concluir e entregar o projeto antes dos 21",
            "Formar grupo de apoio (o líder + pelo menos 2 jovens de 15-21, escoteiros ou não) e ter um adulto facilitador (mestre pioneiro, escotista ou dirigente)",
            "Escolher a área: Desenvolvimento, Paz ou Meio ambiente (ligada a desafio global, ex. ODS)",
            "DESCOBRIR: identificar um problema da comunidade e começar a planejar o projeto",
            "EXPLORAR: interagir com a comunidade e entender causas e consequências do problema",
            "PLANEJAR: escrever a ideia, justificativa, objetivos e recursos",
            "Cumprir no mínimo 21 horas somadas nas etapas Descobrir, Explorar e Planejar",
            "AGIR: executar o trabalho voluntário com no mínimo 80 horas",
            "AVALIAR: avaliação por etapa e geral (desenvolvimento pessoal, impactos sociais, avaliação do programa), incluindo beneficiários e grupo de apoio",
            "CELEBRAR: celebrar as conquistas com colaboradores e comunidade",
            "Enviar relatório (datas/horários, aprendizados, dificuldades, fotos/vídeos) pelo Paxtu Administrativo para aprovação da Equipe Nacional; compartilhar na plataforma sdgs.scout.org",
          ],
        },
      ],
      pioneiro: [
        {
          items: [
            "Ter entre 15 e 20,5 anos ao iniciar; concluir e entregar o projeto antes dos 21",
            "Formar grupo de apoio (o líder + pelo menos 2 jovens de 15-21, escoteiros ou não) e ter um adulto facilitador (mestre pioneiro, escotista ou dirigente)",
            "Escolher a área: Desenvolvimento, Paz ou Meio ambiente (ligada a desafio global, ex. ODS)",
            "DESCOBRIR: identificar um problema da comunidade e começar a planejar o projeto",
            "EXPLORAR: interagir com a comunidade e entender causas e consequências do problema",
            "PLANEJAR: escrever a ideia, justificativa, objetivos e recursos",
            "Cumprir no mínimo 21 horas somadas nas etapas Descobrir, Explorar e Planejar",
            "AGIR: executar o trabalho voluntário com no mínimo 80 horas",
            "AVALIAR: avaliação por etapa e geral (desenvolvimento pessoal, impactos sociais, avaliação do programa), incluindo beneficiários e grupo de apoio",
            "CELEBRAR: celebrar as conquistas com colaboradores e comunidade",
            "Enviar relatório (datas/horários, aprendizados, dificuldades, fotos/vídeos) pelo Paxtu Administrativo para aprovação da Equipe Nacional; compartilhar na plataforma sdgs.scout.org",
          ],
        },
      ],
    },
  },
  {
    id: "mensageiros-da-paz",
    name: "Mensageiros da Paz",
    englishName: "Messengers of Peace",
    description:
      "Iniciativa da OMME: projetos de impacto positivo na comunidade em prol da paz (pessoal, comunitária, global). Distintivo oferecido aos 4 ramos (POR Regra 175, Res. CAN 11/2025).",
    source: "https://www.escoteiros.org.br/wp-content/uploads/2025/02/Apresentacao-Mensageiros-da-Paz-2025.pdf",
    requirements: {
      all: [
        {
          items: [
            "Identificar o problema: listar as necessidades da comunidade",
            "Escolher a melhor área de atuação, considerando importância e viabilidade",
            "Desenhar um plano de ação (planejamento, preparação e execução)",
            "Colocar o plano em ação com apoio da comunidade",
            "Avaliar o projeto durante e ao final (o que melhorar, ideias futuras)",
            "Compartilhar o projeto na plataforma https://sdgs.scout.org/ e o relatório pelo Paxtu para conquistar o distintivo",
          ],
        },
      ],
    },
  },
  {
    id: "inovadores-de-impacto",
    name: "Inovadores de Impacto",
    englishName: "Impact Innovators",
    description:
      "Insígnia lançada pela UEB e OMME (com Accenture) em set/2025 para Sênior e Pioneiro (15 a 22 anos incompletos): projeto comunitário com metodologia de Design Thinking em 6 etapas.",
    source: "https://www.escoteiros.org.br/wp-content/uploads/2025/09/Guia-da-Insignia-Inovadores-de-Impacto.pdf",
    requirements: {
      senior: [
        {
          items: [
            "Avisar os adultos da seção que quer conquistar a insígnia",
            "Escolher como participar: sozinho ou em equipe de interesse de até 8 jovens",
            "Escolher uma ou mais ODS (1, 8, 9 ou 11) para guiar o projeto",
            "Definir a comunidade/local de impacto",
            "Etapa 1 Exploração: Árvore de Temas, Pesquisa Exploratória, Pesquisa de Mesa; checkpoint Critério Norteador",
            "Etapa 2 Ideação: Geração de Ideias, Amadurecimento de Ideias; checkpoint",
            "Etapa 3 Solução: Definição de uma ideia principal; checkpoint Canvas da Solução",
            "Etapa 4 Planejamento: Organização de Ações e Cronograma, Recursos Necessários, Riscos e Desafios; checkpoint O que já fizemos?",
            "Etapa 5 Execução do projeto",
            "Etapa 6 Reconhecimento: Como foi meu projeto?; checkpoint Relatório do Projeto",
            "Enviar o relatório pelo PAXTU para aprovação oficial da UEB",
            "Publicar o relatório na plataforma Scouts for SDGs",
          ],
        },
      ],
      pioneiro: [
        {
          items: [
            "Avisar os adultos da seção que quer conquistar a insígnia",
            "Escolher como participar: sozinho ou em equipe de interesse de até 8 jovens",
            "Escolher uma ou mais ODS (1, 8, 9 ou 11) para guiar o projeto",
            "Definir a comunidade/local de impacto",
            "Etapa 1 Exploração: Árvore de Temas, Pesquisa Exploratória, Pesquisa de Mesa; checkpoint Critério Norteador",
            "Etapa 2 Ideação: Geração de Ideias, Amadurecimento de Ideias; checkpoint",
            "Etapa 3 Solução: Definição de uma ideia principal; checkpoint Canvas da Solução",
            "Etapa 4 Planejamento: Organização de Ações e Cronograma, Recursos Necessários, Riscos e Desafios; checkpoint O que já fizemos?",
            "Etapa 5 Execução do projeto",
            "Etapa 6 Reconhecimento: Como foi meu projeto?; checkpoint Relatório do Projeto",
            "Enviar o relatório pelo PAXTU para aprovação oficial da UEB",
            "Publicar o relatório na plataforma Scouts for SDGs",
          ],
        },
      ],
    },
  },
  {
    id: "insignia-da-lusofonia",
    name: "Insígnia da Lusofonia",
    englishName: "Lusophony Badge",
    description:
      "Conhecer países lusófonos (CEL): geografia, cultura, linguagem/comunicação e escotismo (Lobinho a Sênior); Pioneiro faz projeto de viagem ou comunitário internacional.",
    source: "https://www.escoteiros.org.br/insignias-do-ramo-lobinho/",
    requirements: {
      lobinho: [
        {
          title: "Geografia",
          rule: "Realizar pelo menos duas das opções abaixo",
          required: 2,
          items: [
            "Pesquisar os temperos e especiarias típicos dos países lusófonos, também presentes no Brasil.",
            "Pesquisar a fauna e flora típicos dos países lusófonos, também presentes no Brasil.",
            "Pesquisar utensílios e invenções utilizadas no Brasil, criados em algum país lusófonos.",
            "Indicar, no mapa mundi, onde estão localizados os países lusófonos e reconhecer suas respectivas bandeiras.",
          ],
        },
        {
          title: "Cultura",
          rule: "Realizar pelo menos três das opções abaixo",
          required: 3,
          items: [
            "Visitar exposições ou feiras culturais referentes a outros países lusófonos.",
            "Degustar pelo menos uma refeição típica de outro país lusófono, conhecendo sua história e origem.",
            "Ir a uma peça de teatro cujo roteiro seja de outro país lusófono e não esteja adaptado.",
            "Assistir um espetáculo (circo, show musical etc) que seja originário de outro país lusófono.",
            "Conhecer uma lenda ou conto de um outro país lusófono, e contá-la para sua Alcateia.",
          ],
        },
        {
          title: "Linguagem e Comunicação",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Entrevistar alguém que tenha morado, ou esteja morando, em um país lusófono;",
            "Ver um filme nacional ou animação de outro país Lusófono;",
            "Enviar e receber uma correspondência, ou e-mail, contendo uma foto de sua Alcateia, para um lobinho de outro país Lusófono",
          ],
        },
        {
          title: "Escotismo",
          rule: "Realizar pelo menos duas das opções abaixo",
          required: 2,
          items: [
            "Descobrir quais distintivos o Lobinho poderia conquistar se fosse de outro país lusófono.",
            "Fazer uma lista de termos escoteiros utilizados em outro país lusófono.",
            "Conhecer o símbolo das Associações Escoteiras dos países lusófonos.",
          ],
        },
      ],
      escoteiro: [
        {
          title: "Linguagem e Comunicação",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Acompanhar as principais notícias de um site de notícias ou jornal de outro país Lusófono, por pelo menos duas semanas, e apresentar uma coletânea para a sua Seção.",
            "Ler um livro originário de outro país Lusófono e apresentar um resumo para sua Seção.",
            "Entrar em contato com um jovem escoteiro ou escoteira de outro país da CEL (através da escrita) para produzir uma notícia de uma atividade que ele tenha realizado.",
            "Entrar em contato com um jovem escoteiro, ou escoteira, de outro país da CEL, por meio de contato via radioamador, comprovando o contato com apresentação de cartão QSL ou correspondência, formal ou eletrônica, que contenha os dados do contato: data/hora, faixa/frequência e nomes/indicativos das estações envolvidas.",
            "Participar de um Home-Hospitality, recebendo por pelo menos dois dias em sua casa, um escoteiro de outro país lusófono, relatando posteriormente a sua seção sua experiência com relação aos costumes do convidado e as dificuldades/facilidades de comunicação, bem como as características que temos em comum.",
          ],
        },
        {
          title: "Escotismo",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Aprender uma canção e ensiná-la à seção (via internet ou pessoalmente);",
            "Preparar um prato típico da culinária mateira, que seja popular em outro país Lusófono, e que seja desconhecido dos Escoteiros do Brasil.",
            "Participar de um Encontro Lusófono em um Jamboree.",
            "Apresentar para sua Tropa como é o Escotismo em pelo menos 3 países Lusófonos (uniforme, distintivos, idades para ingresso, símbolo da associação, estrutura, etc).",
            "Participar de um JOTA – Jamboree on the Air, comprovando os contatos realizados com outros escoteiros da CEL, por meio do “cartão QSL da estação” recebido.",
          ],
        },
        {
          title: "Cultura",
          rule: "Realizar pelo menos três, dentre as opções abaixo",
          required: 3,
          items: [
            "Fazer uma peça de artesanato de outro país lusófono;",
            "Fazer um jantar completo para a sua patrulha com comidas típicas de outro país lusófono;",
            "Fazer uma esquete baseada em uma lenda ou conto de um outro país lusófono.",
            "Fazer um recital de poemas, poesias e declamações de outro país lusófono na seção;",
            "Promover um sarau com músicas de bandas e artistas de outros países lusófonos que sejam cantadas em português;",
            "Editar um vídeo com canções ou danças populares de outro país e divulgar para o Grupo Escoteiro.",
          ],
        },
        {
          title: "Geografia",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Organizar um mural sobre os países lusófonos e divulgar para a seção ou para o Grupo Escoteiro;",
            "Pesquisar locais em outro país lusófono onde poderiam fazer trilhas, acampamentos, escaladas, travessias, etc e divulgar no site da seção ou do Grupo Escoteiro;",
            "Pesquisar pontos turísticos em outro país lusófono e apresentar à seção;",
            "Montar um quadro comparativo contendo as principais diferenças de clima, flora, fauna e relevo de pelo menos 3 países lusófonos.",
          ],
        },
      ],
      senior: [
        {
          title: "Linguagem e Comunicação",
          rule: "Realizar pelo menos duas, sendo obrigatória à primeira",
          required: 2,
          mandatory: [0],
          items: [
            "Participar ativamente de um debate (pessoal, via internet ou radioamador) com, pelo menos, mais duas pessoas de outro país lusófono; sobre um tema de abrangência global da atualidade.",
            "Criar uma comunidade em alguma rede social, com jovens e adultos de outros países lusófonos e mantê-la atualizada com notícias e informações úteis por pelo menos quatro meses.",
            "Criar um “Jornal Mural” na Sede de seu Grupo Escoteiro e mantê-lo atualizado com informações úteis (notícias, dicas, etc.) por pelo menos quatro meses.",
            "Criar e divulgar uma Rodada de Radioamadores periódica (semanal ou mensal), em HF ou Echolink, com participação de membros do Movimento Escoteiro de outros países lusófonos por, no mínimo, 8 encontros comprovados por meio de LOGs (registro de comunicados), chancelados pela Equipe Regional ou Nacional de Radioescotismo.",
            "Participar de um Home-Hospitality, recebendo por pelo menos quatro dias em sua casa, um escoteiro de outro país Lusófono, apresentando posteriormente para sua seção um relato das atividades desenvolvidas (pontos turísticos visitados), bem como as impressões do convidado em relação ao nosso país.",
          ],
        },
        {
          title: "Escotismo",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Participar de um Encontro Lusófono em alguma atividade internacional.",
            "Organizar uma coleção de distintivos, com pelo menos 50 peças, contendo distintivos lusófonos de pelo menos 3 países diferentes do seu.",
            "Entrar em contato com um escoteiro de outro país lusófono, em conjunto com ele programar uma atividade que seja totalmente típica naquele país, com duração mínima de duas horas, e aplicá-la em sua ou em outra seção do grupo escoteiro;",
          ],
        },
        {
          title: "Cultura",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Participar de um evento cultural em conjunto com outros cidadãos de países lusófonos.",
            "Organizar um Jantar típico para sua Seção, de um país lusófono, a sua livre escolha. Neste jantar deverá ser servido um cardápio típico (bebida típica, prato principal, acompanhamentos e sobremesa), os participantes deverão estar usando trajes típicos, música típica e deverá ser realizada uma apresentação artística.",
            "Escrever uma peça com um escoteiro de outro país lusófono e apresentá-la para a seção, considerando cenário e caracterização dos personagens.",
          ],
        },
        {
          title: "Geografia",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Preparar um roteiro de viagem para outro país lusófono, considerando os pontos turísticos a serem visitados, transporte, orçamento e campanha financeira, segurança e cronograma de ações.",
            "Visitar outro país lusófono, fazendo uma apresentação posterior a sua seção, mostrando fotos e vídeos dos locais visitados, principais traços culturais, gastronomia, curiosidades, etc.",
            "Elaborar um projeto de atividade aventureira em outro país lusófono.",
          ],
        },
      ],
      pioneiro: [
        {
          title: "Escolha uma opção",
          rule: "Realizar uma das opções abaixo",
          required: 1,
          items: [
            "Opção 1: Elaborar e executar um projeto de viagem para outro país lusófono, considerando todos os aspectos operacionais, tais como: Roteiro; Transporte; Documentos e vacinas necessárias; Pontos a serem visitados; Segurança; Locais de hospedagem; Contato com outros escoteiros; Entre outros. Após a viagem, deverá ser apresentado por meio audiovisual todos os detalhes da aventura, indicando os principais aspectos culturais e geográficos do local visitado.",
            "Opção 2: Elaborar e executar um projeto comunitário, que atenda um dos Objetivos do Desenvolvimento Sustentável, em parceria com um pioneiro de outro país lusófono, considerando todos os aspectos operacionais, tais como: Cumprir todas as fases de um projeto (diagnóstico, planejamento, execução e avaliação). O projeto deve ser executado na sua cidade e também na cidade do pioneiro que reside no país lusófono. Será um projeto desenvolvido em parceria, considerando a realidade de cada país durante a sua aplicação. O pioneiro(a) terá que ter conhecimento da necessidade da localidade a ser beneficiada no país escolhido, bem com transmitir este conhecimento da sua comunidade ao pioneiro(a) parceiro. Assim, os dois pioneiros(as) envolvidos terão, à distância, conhecimento de realidades diferentes do seu cotidiano. O projeto deve ser realizado no mesmo período nos dois países; No final, o pioneiro(a) deverá apresentar ao seu clã o resultado final da execução do projeto nos dois países, com registro de fotos, filmagens, depoimentos e as principais características da aplicação em cada realidade. Com duração mínima de 3 meses.",
          ],
        },
      ],
    },
  },
  {
    id: "insignia-do-cone-sul",
    name: "Insígnia do Cone Sul",
    englishName: "Southern Cone Badge",
    description:
      "Conhecer países do Cone Sul: geografia, cultura, linguagem/comunicação e escotismo (Lobinho a Sênior); Pioneiro faz projeto de viagem ou comunitário com pioneiro de outro país.",
    source: "https://www.escoteiros.org.br/insignias-do-ramo-lobinho/",
    requirements: {
      lobinho: [
        {
          title: "Geografia",
          rule: "Realizar TODAS as atividades abaixo",
          items: [
            "Indicar, no mapa mundi, onde estão localizados os demais países do Cone Sul, sabendo reconhecer suas bandeiras e explicar o significado das cores de cada uma delas.",
            "Pesquisar a história de algo importante por sua utilidade que tenha sido inventado em um dos países do Cone Sul.",
          ],
        },
        {
          title: "Cultura",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Degustar pelo menos um prato típico de outro país do Cone Sul, conhecendo sua história e origem.",
            "Visitar exposições ou feiras culturais referentes a outros países do Cone Sul.",
            "Conhecer uma lenda ou conto de outro país do Cone Sul e contá-la para Alcateia.",
            "Conhecer a principal dança típica de pelo menos dois países do Cone Sul.",
            "Ir a uma peça de teatro cujo roteiro seja de outro país do Cone Sul e não esteja adaptado.",
          ],
        },
        {
          title: "Linguagem e Comunicação",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Assistir uma animação ou filme nacional de outro país do Cone Sul.",
            "Enviar e receber uma correspondência, ou e-mail, contendo uma foto de sua Alcateia, para um lobinho de outro país do Cone Sul.",
            "Entrevistar alguém que esteja morando, ou tenha morado em algum país do Cone Sul.",
          ],
        },
        {
          title: "Escotismo",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Descobrir quais distintivos poderia conquistar se fosse de outro país do Cone Sul.",
            "Ensinar a Alcateia a cantar uma canção escoteira de outro país do Cone Sul.",
            "Conhecer as principais terminologias do Ramo Lobinho (Alcateia, Matilha, acampamento, etc) em castelhano ou em outro idioma falado em países do Cone Sul, como o guarani.",
            "Conhecer os nomes e os símbolos das Associações Escoteiras dos países que integram o Cone Sul.",
          ],
        },
      ],
      escoteiro: [
        {
          title: "Escotismo",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Apresentar para sua Tropa como é o Escotismo em pelo menos 3 países do Cone Sul (vestuário/uniforme, distintivos, idades para ingresso, símbolo da associação, estrutura, etc).",
            "Participar de um Jamboree Panamericano ou outra atividade com escoteiros de outros países do Cone Sul.",
            "Participar de um JOTA – Jamboree on the Air, comprovando os contatos realizados com outros escoteiros do Cone Sul, por meio do “cartão QSL da estação” recebido.",
            "Preparar um prato típico da culinária mateira, que seja popular em outro país do Cone Sul, e não usual dos Escoteiros do Brasil.",
            "Aprender uma técnica de campo (pioneiria, amarra, confecção de forno, etc) que seja diferente ou não usual dos Escoteiros do Brasil, e aplica-la em uma atividade.",
          ],
        },
        {
          title: "Cultura",
          rule: "Realizar pelo menos três, dentre as opções abaixo",
          required: 3,
          items: [
            "Explorar a música e a dança em pelo menos 3 países do Cone Sul, destacando quais os principais ritmos, cantores e instrumentos.",
            "Fazer uma esquete baseada em uma lenda ou conto de um outro país do Cone Sul.",
            "Elaborar um jantar completo (prato principal, acompanhamento, bebida e sobremesa) para sua Patrulha.",
            "Ler um livro originário de outro país do Cone Sul e apresentar um resumo para sua Seção.",
            "Participar de uma festa típica relativa à cultura de outro país do Cone Sul.",
          ],
        },
        {
          title: "Linguagem e Comunicação",
          rule: "Realizar pelo menos duas, sendo obrigatória a primeira",
          required: 2,
          mandatory: [0],
          items: [
            "Participar ativamente de um debate (pessoal, via internet ou radioamador) com, pelo menos, mais duas pessoas de outro país do Cone Sul; sobre um tema de abrangência global da atualidade.",
            "Criar uma comunidade, ou grupo, em alguma rede social, com jovens e adultos de outros países do Cone Sul e mantê-la atualizada com notícias e informações úteis por pelo menos quatro meses.",
            "Criar um “Jornal Mural” na Sede de seu Grupo Escoteiro e mantê-lo atualizado com notícias úteis do Cone Sul por pelo menos quatro meses.",
            "Participar de um Home-Hospitality, recebendo por pelo menos quatro dias em sua casa, um escoteiro de outro país do Cone Sul, apresentando posteriormente para sua seção um relato das atividades desenvolvidas (pontos turísticos visitados), bem como as impressões do convidado em relação ao nosso país.",
          ],
        },
        {
          title: "Geografia",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Organizar um mural sobre os países do Cone Sul e divulgar para a seção ou para o Grupo Escoteiro;",
            "Pesquisar locais em outro país do Cone Sul, indicando onde poderiam ser realizadas atividades como: trilhas, acampamentos, escaladas, travessias, etc e divulgar no site da seção ou do Grupo Escoteiro;",
            "Pesquisar os principais pontos turísticos de pelo menos dois países do Cone Sul.",
            "Montar um quadro comparativo contendo as principais diferenças de clima, flora, fauna e relevo de pelo menos 3 países do Cone Sul.",
          ],
        },
      ],
      senior: [
        {
          title: "Escotismo",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Participar de um Jamboree Panamericano ou outra atividade com escoteiros de outros países do Cone Sul.",
            "Participar de um JOTA – Jamboree on the Air, comprovando os contatos realizados com outros escoteiros do Cone Sul, por meio do “cartão QSL da estação” recebido.",
            "Organizar uma coleção de distintivos, com pelo menos 30 peças, contendo distintivos de pelo menos 3 países diferentes do seu.",
            "Entrar em contato com um escoteiro de outro país do Cone Sul (pessoalmente, via internet ou radioamador), programar uma atividade, com duração mínima de 2 horas, que seja totalmente típica naquele país e aplicá-las em sua ou em outra seção do grupo;",
          ],
        },
        {
          title: "Cultura",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Participar de um evento cultural em conjunto com outros cidadãos de países do Cone Sul.",
            "Organizar um Jantar típico para sua Seção, de um país do Cone Sul, a sua livre escolha. O jantar poderá ser organizado pela Patrulha ou Equipe de Interesse. Neste jantar deverá ser servido um menú típico (bebida típica, prato principal, acompanhamentos e sobremesa), os participantes deverão estar usando trajes típicos, música típica e deverá ser realizada uma apresentação artística. O jantar poderá ser organizado pela Patrulha ou Equipe de Interesse.",
            "Escrever uma peça com um escoteiro de outro país do Cone Sul e apresenta-la para a seção, considerando cenário e caracterização dos personagens.",
          ],
        },
        {
          title: "Linguagem e Comunicação",
          rule: "Realizar pelo menos duas, sendo obrigatória a primeira",
          required: 2,
          mandatory: [0],
          items: [
            "Participar ativamente de um debate (pessoal, via internet ou radioamador) com, pelo menos, mais duas pessoas de outro país do Cone Sul; sobre um tema de abrangência global da atualidade.",
            "Criar uma comunidade, ou grupo, em alguma rede social, com jovens e adultos de outros países do Cone Sul e mantê-la atualizada com notícias e informações úteis por pelo menos quatro meses.",
            "Criar um “Jornal Mural” na Sede de seu Grupo Escoteiro e mantê-lo atualizado com notícias úteis do Cone Sul por pelo menos quatro meses.",
            "Participar de um Home-Hospitality, recebendo por pelo menos quatro dias em sua casa, um escoteiro de outro país do Cone Sul, apresentando posteriormente para sua seção um relato das atividades desenvolvidas (pontos turísticos visitados), bem como as impressões do convidado em relação ao nosso país.",
          ],
        },
        {
          title: "Geografia",
          rule: "Realizar pelo menos duas, dentre as opções abaixo",
          required: 2,
          items: [
            "Preparar um roteiro de viagem para outro país do Cone Sul, considerando os pontos turísticos a serem visitados, transporte, orçamento e campanha financeira, segurança e cronograma de ações.",
            "Visitar um outro país do Cone Sul, fazendo uma apresentação posterior a sua seção, mostrando fotos e vídeos dos locais visitados, principais traços culturais, gastronomia, curiosidades, etc.",
            "Fazer uma apresentação áudio visual sobre o Mercosul para sua Tropa, explicando os principais objetivos, países que o integram e seu ponto de vista quanto a sua importância.",
            "Elaborar um projeto de atividade aventureira em outro país do Cone Sul.",
          ],
        },
      ],
      pioneiro: [
        {
          title: "Escolha uma opção",
          rule: "Realizar uma das opções abaixo",
          required: 1,
          items: [
            "Opção 1: Elaborar e executar um projeto de viagem para outro país do Cone Sul, considerando todos os aspectos operacionais, tais como: Roteiro; Transporte; Documentos e vacinas necessárias; Pontos a serem visitados; Segurança; Locais de hospedagem; Contato com outros escoteiros; Entre outros. Após a viagem, deverá ser apresentado por meio audiovisual todos os detalhes da aventura, indicando os principais aspectos culturais e geográficos do local visitado.",
            "Opção 2: Elaborar e executar um projeto comunitário, que atenda um dos Objetivos do Desenvolvimento Sustentável, em parceria com um pioneiro de outro país do Cone Sul, considerando todos os aspectos operacionais, tais como: Cumprir todas as fases de um projeto (diagnóstico, planejamento, execução e avaliação). O projeto deve ser executado na sua cidade e também na cidade do pioneiro que reside no país lusófono. Será um projeto desenvolvido em parceria, considerando a realidade de cada país durante a sua aplicação. O pioneiro(a) terá que ter conhecimento da necessidade da localidade a ser beneficiada no país escolhido, bem com transmitir este conhecimento da sua comunidade ao pioneiro(a) parceiro. Assim, os dois pioneiros(as) envolvidos terão, à distância, conhecimento de realidades diferentes do seu cotidiano. O projeto deve ser realizado no mesmo período nos dois países; No final, o pioneiro(a) deverá apresentar ao seu clã o resultado final da execução do projeto nos dois países, com registro de fotos, filmagens, depoimentos e as principais características da aplicação em cada realidade. · Com duração mínima de 3 meses.",
          ],
        },
      ],
    },
  },
  {
    id: "insignia-do-desafio-comunitario",
    name: "Insígnia do Desafio Comunitário",
    englishName: "Community Challenge Badge",
    description:
      "Participar de ação comunitária e de um projeto próprio (3 meses no Escoteiro, 4 meses no Sênior) com diagnóstico, execução e relatório. Não há versão Lobinho nem Pioneiro no site.",
    source: "https://www.escoteiros.org.br/insignias-do-ramo-escoteiro/",
    requirements: {
      escoteiro: [
        {
          items: [
            "Participar, como Escoteiro, de um Mutirão Nacional Escoteiro de Ação Comunitária ou de outra atividade de ação comunitária realizada pela sua Patrulha, Tropa ou pelo seu Grupo Escoteiro.",
            "Participar de um PROJETO, no Ramo Escoteiro, que pode ser realizado sozinho, com outro companheiro ou companheiros de patrulha, ou com sua patrulha, nas seguintes condições: Que seja idealizado e concebido pelo próprio jovem, companheiro(s) ou Patrulha; Cujo conteúdo seja resultado de uma necessidade apresentada por sua comunidade próxima (ex: Tropa, grupo ou bairro.); Que seja desenvolvido seguindo todas as etapas de diagnóstico, organização, execução e avaliação; com acompanhamento de um adulto aprovado pela Chefia de Tropa; Cuja execução ocupe um período mínimo de 3 meses de duração; Cujo conteúdo esteja relacionado a uma das áreas seguintes: Ciência e Tecnologia, Saúde e Meio Ambiente, Cultura e Artes, e Paz e Compreensão; e Que seja apresentado relatório final com todos os dados e resultados do projeto.",
          ],
        },
      ],
      senior: [
        {
          items: [
            "Participar, como Sênior, de um Mutirão Nacional Escoteiro de Ação Comunitária, ou de outra atividade de ação comunitária realizada pela sua Patrulha, Tropa ou pelo seu Grupo Escoteiro.",
            "Participar de um PROJETO, no Ramo Sênior, que pode ser realizado sozinho, com sua Patrulha ou equipe de interesse, nas seguintes condições: Que seja idealizado e concebido pelo próprio jovem, Patrulha ou Equipe de Interesse..Cujo conteúdo seja resultado de uma necessidade apresentada por uma comunidade diferente daquela em que reside, estuda, trabalha ou está localizado seu Grupo Escoteiro. Que seja desenvolvido seguindo todas as etapas de diagnóstico, organização, execução e avaliação; com acompanhamento de um adulto designado pelo Chefe de Tropa; Cuja execução ocupe um período mínimo de 4 meses de duração; Cujo conteúdo esteja relacionado a uma das Prioridades do Milênio definidas pela Organização das Nações Unidas; e Que seja apresentado relatório final com todos os dados e resultados do projeto.",
          ],
        },
      ],
    },
  },
  {
    id: "insignia-da-boa-acao",
    name: "Insígnia da Boa Ação",
    englishName: "Good Deed Badge",
    description:
      "Ramo Lobinho: conhecer a comunidade, participar de ação comunitária e de boas ações coletivas, e planejar uma boa ação própria. Não existe versão para outros ramos no site.",
    source: "https://www.escoteiros.org.br/insignias-do-ramo-lobinho/",
    requirements: {
      lobinho: [
        {
          title: "Explorar a sua comunidade",
          items: [
            "Conhecer os principais problemas sociais de sua rua ou bairro e conversar com seus pais ou velhos lobos sobre como você poderia contribuir para resolvê-los.",
            "Conhecer instituições de sua comunidade que realizam ações assistenciais a pessoas necessitadas ou orientação para a melhoria da vida das pessoas, procurando saber de que forma sua Alcateia poderia ajudá-las.",
          ],
        },
        {
          title: "Lobinho em Atividade",
          items: [
            "Participar de pelo menos uma edição do Mutirão Nacional Escoteiro de Ação Comunitária com sua Alcateia ou de outra atividade de ação comunitária realizada pela sua Alcateia ou por seu Grupo Escoteiro.",
            "Perceber os eventuais perigos a que estão expostos os lobinhos em uma excursão ou acampamento/acantonamento e ajudar a aplicar as regras de segurança para evitá-los.",
          ],
        },
        {
          title: "Lobinho em Ação",
          items: [
            "Participar de pelo menos três boas ações coletivas com sua Alcateia, contribuindo com ideias e ações para o planejamento e execução das atividades.",
            "Participar de uma ação comunitária promovida por alguma instituição de sua comunidade: igreja, clube, escola, posto de saúde, polícia, bombeiros, casa comercial, etc. e fazer um relatório sobre essa participação.",
            "Planejar e executar uma boa ação, diferente das realizadas anteriormente, que seja útil em sua Alcateia, casa, escola ou comunidade, com duração mínima de um mês, apresentando posteriormente os resultados para sua Alcateia.",
          ],
        },
      ],
    },
  },

];

export const SPECIAL_INTEREST_BADGE_BY_ID = new Map(
  SPECIAL_INTEREST_BADGES.map((b) => [b.id, b]),
);

/** The requirement groups of a badge in `ramo` (escoteiro when unset). */
export function badgeGroupsFor(
  badgeId: string,
  ramo: Ramo | null | undefined,
): RequirementGroup[] {
  const badge = SPECIAL_INTEREST_BADGE_BY_ID.get(badgeId);
  if (!badge) return [];
  return badge.requirements[ramo ?? "escoteiro"] ?? badge.requirements.all ?? [];
}

/**
 * Every requirement text of a badge in `ramo`, flattened in group order. A
 * stored `requirementIndex` is a position in this list.
 */
export function badgeRequirementsFor(
  badgeId: string,
  ramo: Ramo | null | undefined,
): string[] {
  return badgeGroupsFor(badgeId, ramo).flatMap((g) => g.items);
}
