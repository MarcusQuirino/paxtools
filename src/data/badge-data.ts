/**
 * Insígnias de interesse especial — "special interest badges" in code.
 *
 * A badge is like an especialidade without levels: the escoteiro must
 * complete ALL of its requirements. Blocos name badges in their
 * `alternativeCompletions` (type "insignia"); an earned badge satisfies that
 * bloco's variable section.
 *
 * `id` is the slug of `name` (toSpecialtySlug) — the bloco catalog names
 * badges by display name and resolves them by that slug. Requirements may
 * differ per ramo; `requirements.all` applies to every ramo without its own
 * list. A badge with no requirements for a ramo is listed but not trackable
 * there.
 *
 * Requirement texts follow escoteiros.org.br (insignias-do-ramo-* pages and
 * the Tribo da Terra / Escoteiros do Mundo / Inovadores de Impacto guides).
 * Not yet catalogued — no UEB requirement list found: "Diálogo
 * Inter-religioso", "Diálogos pela Paz", "Insígnia da Ação Comunitária".
 */
import type { Ramo } from "./progression-data";

export type SpecialInterestBadge = {
  id: string;
  /** Display name, exactly as the bloco catalog spells it. */
  name: string;
  /** English name — WOSM's official one for global badges, else a translation. */
  englishName: string;
  description: string;
  requirements: Partial<Record<Ramo | "all", string[]>>;
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
        "Aprendendo a Aprender: a) Organizar o espaço de estudo adequadamente, observando a sua iluminação, local para acondicionamento dos materiais e ambiente.",
        "Aprendendo a Aprender: b) Ter o seu material escolar devidamente organizado, demonstrado cuidados com os livros, cadernos e demais materiais.",
        "Aprendendo a Aprender: c) Destinar o tempo adequado para seu estudo e tarefas de casa, relatando aos pais, a Akela ou outro Velho Lobo quanto tempo utiliza para essas atividades.",
        "Aprendendo com os outros: a) Participar, como Lobinho, de pelo menos uma edição do Projeto Educação Escoteira com sua Alcateia, ou de outra atividade em conjunto com escolas realizada pela sua Alcateia ou pelo seu Grupo Escoteiro/Seção Autônoma.",
        "Aprendendo com os outros: b) Participar ativamente de pelo menos duas atividades especiais em sua escola (Ex.: Festa Junina, Feira de Ciências, Excursão, etc.) e mostrar fotos ou relatório para a Alcateia.",
        "Atitude para aprender e ensinar: a) Apoiar um colega de classe em alguma tarefa ou ajudá-lo a aprender algum conteúdo que tenha dificuldade.",
        "Atitude para aprender e ensinar: b) Conversar com seus pais , Akela ou outro Velho Lobo sobre sua participação na escola, seu interesse pelos estudos e sobre os pontos que podem ser melhorados para ser um melhor aluno.",
      ],
      escoteiro: [
        "Aprendendo a Aprender: a) Manter seu local e materiais de estudo organizados e possuir uma agenda semanal para estudar, realizar as tarefas escolares e leitura de livros.",
        "Aprendendo a Aprender: b) Elaborar um calendário contendo as atividades escolares, como eventos, provas, atividades extraclasses, etc., bem como os eventos de sua atividade escoteira.",
        "Aprendendo a Aprender: c) Saber fazer anotações e resumos das aulas, apresentando as anotações, destaques de texto ou resumos existentes em seus livros e/ou cadernos escolares. Utilizando suas anotações, explicar ao escotista pelo menos dois conteúdos aprendidos em sala de aula.",
        "Aprendendo com os outros: a) Participar, como escoteiro, de pelo menos uma edição do Projeto Educação Escoteira ou de outra atividade em conjunto com escolas realizada pela sua patrulha, tropa ou grupo escoteiro.",
        "Aprendendo com os outros: b) Preparar um cartaz, folder ou outro material similar sobre um dos seguintes temas: bullying, organização de local de estudo, bons hábitos de estudo ou outro tema relacionado a educação.",
        "Aprendendo com os outros: c) Preparar e aplicar para sua patrulha ou tropa um jogo ou técnica escoteira relacionando-o a uma das matérias estudadas na escola.",
        "Atitude para aprender e ensinar: a) Participar de um grupo de estudo ou trabalho em grupo sobre determinada matéria.",
        "Atitude para aprender e ensinar: b) Realizar uma reflexão pessoal sobre seu ambiente escolar, analisando os pontos positivos e pontos que podem ser melhorados. A reflexão deverá ser compartilhada com pelo menos um de seus professores.",
      ],
      senior: [
        "Aprendendo a Aprender — Realizar pelo menos duas dentre as atividades abaixo: a) Saber o que é um mapa mental, qual sua utilidade e desenvolver um mapa mental sobre um tema ou conteúdo a sua escolha.",
        "Aprendendo a Aprender — Realizar pelo menos duas dentre as atividades abaixo: b) Discutir com o escotista as vantagens e desvantagens de diferentes métodos de pesquisa que são utilizados na escola, tais como biblioteca, internet, jornais, etc.",
        "Aprendendo com os outros — Realizar duas das opções abaixo, sendo obrigatória a primeira: a) Participar, como sênior, de pelo menos uma edição do Projeto Educação Escoteira ou de outra atividade em conjunto com escolas realizada pela sua patrulha, tropa ou grupo escoteiro.",
        "Aprendendo com os outros — Realizar duas das opções abaixo, sendo obrigatória a primeira: b) Participar de um teste vocacional, feira de profissões ou outra experiência similar. A partir dessa experiência conversar com seus pais sobre as profissões que mais lhe despertaram interesse para exercer no futuro.",
        "Aprendendo com os outros — Realizar duas das opções abaixo, sendo obrigatória a primeira: c) Entrevistar dois profissionais com carreiras estabelecidas, cuja profissão seja de seu interesse. Procurar descobrir como eles foram educados, qual a formação necessária para a profissão e como continuam a se formar e se aperfeiçoar na profissão. A entrevista pode ser feita por vídeo e disponibilizada nas redes sociais.",
        "Aprendendo com os outros — Realizar duas das opções abaixo, sendo obrigatória a primeira: d) Realizar, em conjunto com sua patrulha ou grupo de interesse, uma visita a instituição de ensino (faculdade, universidade, educação profissionalizante, etc.) promovendo debate posterior.",
        "Atitude para aprender e ensinar — Realizar as duas atividades abaixo: a) Participar de algum projeto ou atividade extracurricular oferecido pela sua escola. Relatar sua experiência ao escotista.",
        "Atitude para aprender e ensinar — Realizar as duas atividades abaixo: b) Selecionar uma notícia sobre um assunto relevante na atualidade, realizando pesquisa sobre o tema em diferentes fontes e meios de comunicação. Escrever uma crítica sobre o tema, citando as fontes pesquisadas e seu ponto de vista sobre o tema.",
        "Atitude para aprender e ensinar — Realizar as duas atividades abaixo: c) Participar ativamente do Grêmio Estudantil de sua escola.",
      ],
      pioneiro: [
        "Aprendendo a Aprender — Realizar as três atividades abaixo: a) Participar de pelo menos dois cursos ou seminários de sua preferência, cujos temas sejam relevantes para sua vida acadêmica ou carreira profissional. Deverá ser apresentado um resumo de sua participação ao Clã Pioneiro ou algum tipo de produção que descreva sua participação e os assuntos abordados.",
        "Aprendendo a Aprender — Realizar as três atividades abaixo: b) Montar seu currículo profissional, relacionando suas aptidões, iniciativas de formação pessoas e outras experiências relevantes.",
        "Aprendendo a Aprender — Realizar as três atividades abaixo: c) Redigir um trabalho acadêmico, com tema de sua livre escolha, utilizando as normas de Metodologia Científica.",
        "Aprendendo com os outros — Realizar as duas atividades abaixo: a) Participar, como pioneiro, de pelo menos uma edição do Projeto Educação Escoteira, ajudando na organização e aplicação das atividades.",
        "Aprendendo com os outros — Realizar as duas atividades abaixo: b) Organizar e conduzir um debate com os membros de seu Clã Pioneiro, contando com a participação de um profissional da área de educação, sobre os principais desafios da educação em nosso país e como poderia melhorá-la.",
        "Atitude para aprender e ensinar — Realizar todas as atividades abaixo: a) Propor, planejar e executar uma atividade educativa para alunos de uma escola pública, com duração mínima de 3 horas. Os objetivos educativos da atividade devem ser convergente com as necessidades da faixa etária que será beneficiada.",
        "Atitude para aprender e ensinar — Realizar todas as atividades abaixo: b) Realizar uma reflexão e incluir no seu Plano de Desenvolvimento Pessoal (Projeto de Vida) as fases e estratégias para o desenvolvimento acadêmico e/ou profissional.",
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
        "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
        "Tema do projeto: Planeta Limpo: consumo responsável e processo de reduzir, reutilizar e reciclar (3Rs) os resíduos do cotidiano",
        "Combinar com o escotista os objetivos, ações e duração do projeto",
        "Etapa CONHECER: aprender sobre ecossistemas aquáticos e terrestres e como prevenir a poluição, reduzir, reutilizar e reciclar resíduos",
        "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
        "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
        "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
        "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
      ],
      escoteiro: [
        "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
        "Tema do projeto: Planeta Limpo: consumo responsável e processo de reduzir, reutilizar e reciclar (3Rs) os resíduos do cotidiano",
        "Combinar com o escotista os objetivos, ações e duração do projeto",
        "Etapa CONHECER: aprender sobre ecossistemas aquáticos e terrestres e como prevenir a poluição, reduzir, reutilizar e reciclar resíduos",
        "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
        "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
        "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
        "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
      ],
      senior: [
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
        "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
        "Tema do projeto: Energias renováveis: projeto ligado à energia solar ou outras energias renováveis (pode ser a execução e demonstração à Tropa de um experimento)",
        "Combinar com o escotista os objetivos, ações e duração do projeto",
        "Etapa CONHECER: aprender sobre energia solar e outros tipos de energia renovável",
        "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
        "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
        "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
        "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
      ],
      escoteiro: [
        "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
        "Tema do projeto: Energias renováveis: projeto ligado à energia solar ou outras energias renováveis (pode ser a execução e demonstração à Tropa de um experimento)",
        "Combinar com o escotista os objetivos, ações e duração do projeto",
        "Etapa CONHECER: aprender sobre energia solar e outros tipos de energia renovável",
        "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
        "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
        "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
        "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
      ],
      senior: [
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
        "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
        "Tema do projeto: Sustentabilidade (hábitos sustentáveis, consumo responsável) OU Biodiversidade (conscientização e ação sobre o declínio da biodiversidade) - escolher um dos dois",
        "Combinar com o escotista os objetivos, ações e duração do projeto",
        "Etapa CONHECER: aprender sobre o ambiente ao redor e os principais problemas ambientais ligados aos hábitos de vida e à biodiversidade",
        "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
        "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
        "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
        "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
      ],
      escoteiro: [
        "Escolher e realizar um projeto relacionado a um Objetivo de Desenvolvimento Sustentável (ODS); não há duração mínima, pode ser individual, com patrulha/matilha, tropa/Alcateia ou comunidade",
        "Tema do projeto: Sustentabilidade (hábitos sustentáveis, consumo responsável) OU Biodiversidade (conscientização e ação sobre o declínio da biodiversidade) - escolher um dos dois",
        "Combinar com o escotista os objetivos, ações e duração do projeto",
        "Etapa CONHECER: aprender sobre o ambiente ao redor e os principais problemas ambientais ligados aos hábitos de vida e à biodiversidade",
        "Etapa COOPERAR: identificar necessidades e desafios da comunidade local e trabalhar com os companheiros em soluções sustentáveis",
        "Etapa ATUAR: realizar ações práticas para resolver um problema específico ligado ao tema, com patrulha, tropa, comunidade e/ou outros",
        "Avaliação e autoavaliação do projeto com um escotista responsável e os companheiros de projeto",
        "Registrar o projeto na plataforma mundial Escoteiros pelos ODS (feito pelo escotista responsável)",
      ],
      senior: [
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
      pioneiro: [
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
        "Identificar o problema: listar as necessidades da comunidade",
        "Escolher a melhor área de atuação, considerando importância e viabilidade",
        "Desenhar um plano de ação (planejamento, preparação e execução)",
        "Colocar o plano em ação com apoio da comunidade",
        "Avaliar o projeto durante e ao final (o que melhorar, ideias futuras)",
        "Compartilhar o projeto na plataforma https://sdgs.scout.org/ e o relatório pelo Paxtu para conquistar o distintivo",
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
        "Todas as ações do checklist são obrigatórias",
        "Enviar o relatório pelo PAXTU para aprovação oficial da UEB",
        "Publicar o relatório na plataforma Scouts for SDGs",
      ],
      pioneiro: [
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
        "Todas as ações do checklist são obrigatórias",
        "Enviar o relatório pelo PAXTU para aprovação oficial da UEB",
        "Publicar o relatório na plataforma Scouts for SDGs",
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
        "Geografia — Realizar pelo menos duas das opções abaixo: a) Pesquisar os temperos e especiarias típicos dos países lusófonos, também presentes no Brasil.",
        "Geografia — Realizar pelo menos duas das opções abaixo: b) Pesquisar a fauna e flora típicos dos países lusófonos, também presentes no Brasil.",
        "Geografia — Realizar pelo menos duas das opções abaixo: c) Pesquisar utensílios e invenções utilizadas no Brasil, criados em algum país lusófonos.",
        "Geografia — Realizar pelo menos duas das opções abaixo: d) Indicar, no mapa mundi, onde estão localizados os países lusófonos e reconhecer suas respectivas bandeiras.",
        "Cultura — Realizar pelo menos três das opções abaixo: b) Visitar exposições ou feiras culturais referentes a outros países lusófonos.",
        "Cultura — Realizar pelo menos três das opções abaixo: c) Degustar pelo menos uma refeição típica de outro país lusófono, conhecendo sua história e origem.",
        "Cultura — Realizar pelo menos três das opções abaixo: d) Ir a uma peça de teatro cujo roteiro seja de outro país lusófono e não esteja adaptado.",
        "Cultura — Realizar pelo menos três das opções abaixo: e) Assistir um espetáculo (circo, show musical etc) que seja originário de outro país lusófono.",
        "Cultura — Realizar pelo menos três das opções abaixo: f) Conhecer uma lenda ou conto de um outro país lusófono, e contá-la para sua Alcateia.",
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: b) Entrevistar alguém que tenha morado, ou esteja morando, em um país lusófono;",
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: c) Ver um filme nacional ou animação de outro país Lusófono;",
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: d) Enviar e receber uma correspondência, ou e-mail, contendo uma foto de sua Alcateia, para um lobinho de outro país Lusófono",
        "Escotismo — Realizar pelo menos duas das opções abaixo: b) Descobrir quais distintivos o Lobinho poderia conquistar se fosse de outro país lusófono.",
        "Escotismo — Realizar pelo menos duas das opções abaixo: c) Fazer uma lista de termos escoteiros utilizados em outro país lusófono.",
        "Escotismo — Realizar pelo menos duas das opções abaixo: d) Conhecer o símbolo das Associações Escoteiras dos países lusófonos.",
      ],
      escoteiro: [
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: 1) Acompanhar as principais notícias de um site de notícias ou jornal de outro país Lusófono, por pelo menos duas semanas, e apresentar uma coletânea para a sua Seção.",
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: 2) Ler um livro originário de outro país Lusófono e apresentar um resumo para sua Seção.",
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: 3) Entrar em contato com um jovem escoteiro ou escoteira de outro país da CEL (através da escrita) para produzir uma notícia de uma atividade que ele tenha realizado.",
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: 4) Entrar em contato com um jovem escoteiro, ou escoteira, de outro país da CEL, por meio de contato via radioamador, comprovando o contato com apresentação de cartão QSL ou correspondência, formal ou eletrônica, que contenha os dados do contato: data/hora, faixa/frequência e nomes/indicativos das estações envolvidas.",
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: 5) Participar de um Home-Hospitality, recebendo por pelo menos dois dias em sua casa, um escoteiro de outro país lusófono, relatando posteriormente a sua seção sua experiência com relação aos costumes do convidado e as dificuldades/facilidades de comunicação, bem como as características que temos em comum.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: b) Aprender uma canção e ensiná-la à seção (via internet ou pessoalmente);",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: c) Preparar um prato típico da culinária mateira, que seja popular em outro país Lusófono, e que seja desconhecido dos Escoteiros do Brasil.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: d) Participar de um Encontro Lusófono em um Jamboree.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: e) Apresentar para sua Tropa como é o Escotismo em pelo menos 3 países Lusófonos (uniforme, distintivos, idades para ingresso, símbolo da associação, estrutura, etc).",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: f) Participar de um JOTA – Jamboree on the Air, comprovando os contatos realizados com outros escoteiros da CEL, por meio do “cartão QSL da estação” recebido.",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: b) Fazer uma peça de artesanato de outro país lusófono;",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: c) Fazer um jantar completo para a sua patrulha com comidas típicas de outro país lusófono;",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: d) Fazer uma esquete baseada em uma lenda ou conto de um outro país lusófono.",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: e) Fazer um recital de poemas, poesias e declamações de outro país lusófono na seção;",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: f) Promover um sarau com músicas de bandas e artistas de outros países lusófonos que sejam cantadas em português;",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: g) Editar um vídeo com canções ou danças populares de outro país e divulgar para o Grupo Escoteiro.",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: b) Organizar um mural sobre os países lusófonos e divulgar para a seção ou para o Grupo Escoteiro;",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: c) Pesquisar locais em outro país lusófono onde poderiam fazer trilhas, acampamentos, escaladas, travessias, etc e divulgar no site da seção ou do Grupo Escoteiro;",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: d) Pesquisar pontos turísticos em outro país lusófono e apresentar à seção;",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: f) Montar um quadro comparativo contendo as principais diferenças de clima, flora, fauna e relevo de pelo menos 3 países lusófonos.",
      ],
      senior: [
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória à primeira: a) Participar ativamente de um debate (pessoal, via internet ou radioamador) com, pelo menos, mais duas pessoas de outro país lusófono; sobre um tema de abrangência global da atualidade.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória à primeira: b) Criar uma comunidade em alguma rede social, com jovens e adultos de outros países lusófonos e mantê-la atualizada com notícias e informações úteis por pelo menos quatro meses.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória à primeira: c) Criar um “Jornal Mural” na Sede de seu Grupo Escoteiro e mantê-lo atualizado com informações úteis (notícias, dicas, etc.) por pelo menos quatro meses.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória à primeira: d) Criar e divulgar uma Rodada de Radioamadores periódica (semanal ou mensal), em HF ou Echolink, com participação de membros do Movimento Escoteiro de outros países lusófonos por, no mínimo, 8 encontros comprovados por meio de LOGs (registro de comunicados), chancelados pela Equipe Regional ou Nacional de Radioescotismo.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória à primeira: e) Participar de um Home-Hospitality, recebendo por pelo menos quatro dias em sua casa, um escoteiro de outro país Lusófono, apresentando posteriormente para sua seção um relato das atividades desenvolvidas (pontos turísticos visitados), bem como as impressões do convidado em relação ao nosso país.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: b) Participar de um Encontro Lusófono em alguma atividade internacional.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: c) Organizar uma coleção de distintivos, com pelo menos 50 peças, contendo distintivos lusófonos de pelo menos 3 países diferentes do seu.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: d) Entrar em contato com um escoteiro de outro país lusófono, em conjunto com ele programar uma atividade que seja totalmente típica naquele país, com duração mínima de duas horas, e aplicá-la em sua ou em outra seção do grupo escoteiro;",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: b) Participar de um evento cultural em conjunto com outros cidadãos de países lusófonos.",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: c) Organizar um Jantar típico para sua Seção, de um país lusófono, a sua livre escolha. Neste jantar deverá ser servido um cardápio típico (bebida típica, prato principal, acompanhamentos e sobremesa), os participantes deverão estar usando trajes típicos, música típica e deverá ser realizada uma apresentação artística.",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: d) Escrever uma peça com um escoteiro de outro país lusófono e apresentá-la para a seção, considerando cenário e caracterização dos personagens.",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: b) Preparar um roteiro de viagem para outro país lusófono, considerando os pontos turísticos a serem visitados, transporte, orçamento e campanha financeira, segurança e cronograma de ações.",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: c) Visitar outro país lusófono, fazendo uma apresentação posterior a sua seção, mostrando fotos e vídeos dos locais visitados, principais traços culturais, gastronomia, curiosidades, etc.",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: d) Elaborar um projeto de atividade aventureira em outro país lusófono.",
      ],
      pioneiro: [
        "Opção 1: Elaborar e executar um projeto de viagem para outro país lusófono, considerando todos os aspectos operacionais, tais como:",
        "Opção 1: Roteiro;",
        "Opção 1: Transporte;",
        "Opção 1: Documentos e vacinas necessárias;",
        "Opção 1: Pontos a serem visitados;",
        "Opção 1: Segurança;",
        "Opção 1: Locais de hospedagem;",
        "Opção 1: Contato com outros escoteiros;",
        "Opção 1: Entre outros.",
        "Opção 1: Após a viagem, deverá ser apresentado por meio audiovisual todos os detalhes da aventura, indicando os principais aspectos culturais e geográficos do local visitado.",
        "Opção 2: Elaborar e executar um projeto comunitário, que atenda um dos Objetivos do Desenvolvimento Sustentável, em parceria com um pioneiro de outro país lusófono, considerando todos os aspectos operacionais, tais como:",
        "Opção 2: Cumprir todas as fases de um projeto (diagnóstico, planejamento, execução e avaliação). O projeto deve ser executado na sua cidade e também na cidade do pioneiro que reside no país lusófono. Será um projeto desenvolvido em parceria, considerando a realidade de cada país durante a sua aplicação.",
        "Opção 2: O pioneiro(a) terá que ter conhecimento da necessidade da localidade a ser beneficiada no país escolhido, bem com transmitir este conhecimento da sua comunidade ao pioneiro(a) parceiro. Assim, os dois pioneiros(as) envolvidos terão, à distância, conhecimento de realidades diferentes do seu cotidiano.",
        "Opção 2: O projeto deve ser realizado no mesmo período nos dois países;",
        "Opção 2: No final, o pioneiro(a) deverá apresentar ao seu clã o resultado final da execução do projeto nos dois países, com registro de fotos, filmagens, depoimentos e as principais características da aplicação em cada realidade.",
        "Opção 2: Com duração mínima de 3 meses.",
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
        "Geografia — Realizar TODAS as atividades abaixo: a) Indicar, no mapa mundi, onde estão localizados os demais países do Cone Sul, sabendo reconhecer suas bandeiras e explicar o significado das cores de cada uma delas.",
        "Geografia — Realizar TODAS as atividades abaixo: b) Pesquisar a história de algo importante por sua utilidade que tenha sido inventado em um dos países do Cone Sul.",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: a) Degustar pelo menos um prato típico de outro país do Cone Sul, conhecendo sua história e origem.",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: b) Visitar exposições ou feiras culturais referentes a outros países do Cone Sul.",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: c) Conhecer uma lenda ou conto de outro país do Cone Sul e contá-la para Alcateia.",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: d) Conhecer a principal dança típica de pelo menos dois países do Cone Sul.",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: e) Ir a uma peça de teatro cujo roteiro seja de outro país do Cone Sul e não esteja adaptado.",
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: a) Assistir uma animação ou filme nacional de outro país do Cone Sul.",
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: b) Enviar e receber uma correspondência, ou e-mail, contendo uma foto de sua Alcateia, para um lobinho de outro país do Cone Sul.",
        "Linguagem e Comunicação — Realizar pelo menos duas, dentre as opções abaixo: c) Entrevistar alguém que esteja morando, ou tenha morado em algum país do Cone Sul.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: a) Descobrir quais distintivos poderia conquistar se fosse de outro país do Cone Sul.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: b) Ensinar a Alcateia a cantar uma canção escoteira de outro país do Cone Sul.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: c) Conhecer as principais terminologias do Ramo Lobinho (Alcateia, Matilha, acampamento, etc) em castelhano ou em outro idioma falado em países do Cone Sul, como o guarani.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: d) Conhecer os nomes e os símbolos das Associações Escoteiras dos países que integram o Cone Sul.",
      ],
      escoteiro: [
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: a) Apresentar para sua Tropa como é o Escotismo em pelo menos 3 países do Cone Sul (vestuário/uniforme, distintivos, idades para ingresso, símbolo da associação, estrutura, etc).",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: b) Participar de um Jamboree Panamericano ou outra atividade com escoteiros de outros países do Cone Sul.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: c) Participar de um JOTA – Jamboree on the Air, comprovando os contatos realizados com outros escoteiros do Cone Sul, por meio do “cartão QSL da estação” recebido.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: d) Preparar um prato típico da culinária mateira, que seja popular em outro país do Cone Sul, e não usual dos Escoteiros do Brasil.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: e) Aprender uma técnica de campo (pioneiria, amarra, confecção de forno, etc) que seja diferente ou não usual dos Escoteiros do Brasil, e aplica-la em uma atividade.",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: a) Explorar a música e a dança em pelo menos 3 países do Cone Sul, destacando quais os principais ritmos, cantores e instrumentos.",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: b) Fazer uma esquete baseada em uma lenda ou conto de um outro país do Cone Sul.",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: c) Elaborar um jantar completo (prato principal, acompanhamento, bebida e sobremesa) para sua Patrulha.",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: d) Ler um livro originário de outro país do Cone Sul e apresentar um resumo para sua Seção.",
        "Cultura — Realizar pelo menos três, dentre as opções abaixo: e) Participar de uma festa típica relativa à cultura de outro país do Cone Sul.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória a primeira: a) Participar ativamente de um debate (pessoal, via internet ou radioamador) com, pelo menos, mais duas pessoas de outro país do Cone Sul; sobre um tema de abrangência global da atualidade.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória a primeira: b) Criar uma comunidade, ou grupo, em alguma rede social, com jovens e adultos de outros países do Cone Sul e mantê-la atualizada com notícias e informações úteis por pelo menos quatro meses.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória a primeira: c) Criar um “Jornal Mural” na Sede de seu Grupo Escoteiro e mantê-lo atualizado com notícias úteis do Cone Sul por pelo menos quatro meses.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória a primeira: d) Participar de um Home-Hospitality, recebendo por pelo menos quatro dias em sua casa, um escoteiro de outro país do Cone Sul, apresentando posteriormente para sua seção um relato das atividades desenvolvidas (pontos turísticos visitados), bem como as impressões do convidado em relação ao nosso país.",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: a) Organizar um mural sobre os países do Cone Sul e divulgar para a seção ou para o Grupo Escoteiro;",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: b) Pesquisar locais em outro país do Cone Sul, indicando onde poderiam ser realizadas atividades como: trilhas, acampamentos, escaladas, travessias, etc e divulgar no site da seção ou do Grupo Escoteiro;",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: c) Pesquisar os principais pontos turísticos de pelo menos dois países do Cone Sul.",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: d) Montar um quadro comparativo contendo as principais diferenças de clima, flora, fauna e relevo de pelo menos 3 países do Cone Sul.",
      ],
      senior: [
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: a) Participar de um Jamboree Panamericano ou outra atividade com escoteiros de outros países do Cone Sul.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: b) Participar de um JOTA – Jamboree on the Air, comprovando os contatos realizados com outros escoteiros do Cone Sul, por meio do “cartão QSL da estação” recebido.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: c) Organizar uma coleção de distintivos, com pelo menos 30 peças, contendo distintivos de pelo menos 3 países diferentes do seu.",
        "Escotismo — Realizar pelo menos duas, dentre as opções abaixo: d) Entrar em contato com um escoteiro de outro país do Cone Sul (pessoalmente, via internet ou radioamador), programar uma atividade, com duração mínima de 2 horas, que seja totalmente típica naquele país e aplicá-las em sua ou em outra seção do grupo;",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: a) Participar de um evento cultural em conjunto com outros cidadãos de países do Cone Sul.",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: b) Organizar um Jantar típico para sua Seção, de um país do Cone Sul, a sua livre escolha. O jantar poderá ser organizado pela Patrulha ou Equipe de Interesse. Neste jantar deverá ser servido um menú típico (bebida típica, prato principal, acompanhamentos e sobremesa), os participantes deverão estar usando trajes típicos, música típica e deverá ser realizada uma apresentação artística. O jantar poderá ser organizado pela Patrulha ou Equipe de Interesse.",
        "Cultura — Realizar pelo menos duas, dentre as opções abaixo: c) Escrever uma peça com um escoteiro de outro país do Cone Sul e apresenta-la para a seção, considerando cenário e caracterização dos personagens.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória a primeira: a) Participar ativamente de um debate (pessoal, via internet ou radioamador) com, pelo menos, mais duas pessoas de outro país do Cone Sul; sobre um tema de abrangência global da atualidade.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória a primeira: b) Criar uma comunidade, ou grupo, em alguma rede social, com jovens e adultos de outros países do Cone Sul e mantê-la atualizada com notícias e informações úteis por pelo menos quatro meses.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória a primeira: c) Criar um “Jornal Mural” na Sede de seu Grupo Escoteiro e mantê-lo atualizado com notícias úteis do Cone Sul por pelo menos quatro meses.",
        "Linguagem e Comunicação — Realizar pelo menos duas, sendo obrigatória a primeira: d) Participar de um Home-Hospitality, recebendo por pelo menos quatro dias em sua casa, um escoteiro de outro país do Cone Sul, apresentando posteriormente para sua seção um relato das atividades desenvolvidas (pontos turísticos visitados), bem como as impressões do convidado em relação ao nosso país.",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: a) Preparar um roteiro de viagem para outro país do Cone Sul, considerando os pontos turísticos a serem visitados, transporte, orçamento e campanha financeira, segurança e cronograma de ações.",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: b) Visitar um outro país do Cone Sul, fazendo uma apresentação posterior a sua seção, mostrando fotos e vídeos dos locais visitados, principais traços culturais, gastronomia, curiosidades, etc.",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: c) Fazer uma apresentação áudio visual sobre o Mercosul para sua Tropa, explicando os principais objetivos, países que o integram e seu ponto de vista quanto a sua importância.",
        "Geografia — Realizar pelo menos duas, dentre as opções abaixo: d) Elaborar um projeto de atividade aventureira em outro país do Cone Sul.",
      ],
      pioneiro: [
        "Opção 1: Elaborar e executar um projeto de viagem para outro país do Cone Sul, considerando todos os aspectos operacionais, tais como:",
        "Opção 1: Roteiro;",
        "Opção 1: Transporte;",
        "Opção 1: Documentos e vacinas necessárias;",
        "Opção 1: Pontos a serem visitados;",
        "Opção 1: Segurança;",
        "Opção 1: Locais de hospedagem;",
        "Opção 1: Contato com outros escoteiros;",
        "Opção 1: Entre outros.",
        "Opção 1: Após a viagem, deverá ser apresentado por meio audiovisual todos os detalhes da aventura, indicando os principais aspectos culturais e geográficos do local visitado.",
        "Opção 2: Elaborar e executar um projeto comunitário, que atenda um dos Objetivos do Desenvolvimento Sustentável, em parceria com um pioneiro de outro país do Cone Sul, considerando todos os aspectos operacionais, tais como:",
        "Opção 2: Cumprir todas as fases de um projeto (diagnóstico, planejamento, execução e avaliação). O projeto deve ser executado na sua cidade e também na cidade do pioneiro que reside no país lusófono. Será um projeto desenvolvido em parceria, considerando a realidade de cada país durante a sua aplicação.",
        "Opção 2: O pioneiro(a) terá que ter conhecimento da necessidade da localidade a ser beneficiada no país escolhido, bem com transmitir este conhecimento da sua comunidade ao pioneiro(a) parceiro. Assim, os dois pioneiros(as) envolvidos terão, à distância, conhecimento de realidades diferentes do seu cotidiano.",
        "Opção 2: O projeto deve ser realizado no mesmo período nos dois países;",
        "Opção 2: No final, o pioneiro(a) deverá apresentar ao seu clã o resultado final da execução do projeto nos dois países, com registro de fotos, filmagens, depoimentos e as principais características da aplicação em cada realidade. · Com duração mínima de 3 meses.",
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
        "Participar, como Escoteiro, de um Mutirão Nacional Escoteiro de Ação Comunitária ou de outra atividade de ação comunitária realizada pela Patrulha, Tropa ou Grupo Escoteiro",
        "Participar de um PROJETO no Ramo Escoteiro (sozinho, com companheiro(s) ou com a patrulha) que: seja idealizado e concebido pelo próprio jovem, companheiro(s) ou Patrulha; atenda a uma necessidade da comunidade próxima (Tropa, grupo ou bairro); siga as etapas de diagnóstico, organização, execução e avaliação, com acompanhamento de um adulto aprovado pela Chefia de Tropa; dure no mínimo 3 meses; esteja ligado a uma das áreas: Ciência e Tecnologia, Saúde e Meio Ambiente, Cultura e Artes, ou Paz e Compreensão; e tenha relatório final com dados e resultados",
      ],
      senior: [
        "Participar, como Sênior, de um Mutirão Nacional Escoteiro de Ação Comunitária, ou de outra atividade de ação comunitária realizada pela Patrulha, Tropa ou Grupo Escoteiro",
        "Participar de um PROJETO no Ramo Sênior (sozinho, com a Patrulha ou equipe de interesse) que: seja idealizado e concebido pelo próprio jovem, Patrulha ou Equipe de Interesse; atenda a necessidade de uma comunidade diferente daquela em que reside, estuda, trabalha ou está o Grupo Escoteiro; siga as etapas de diagnóstico, organização, execução e avaliação, com acompanhamento de adulto designado pelo Chefe de Tropa; dure no mínimo 4 meses; esteja relacionado a uma das Prioridades do Milênio da ONU; e tenha relatório final com dados e resultados",
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
        "Explorar a sua comunidade: a) Conhecer os principais problemas sociais de sua rua ou bairro e conversar com seus pais ou velhos lobos sobre como você poderia contribuir para resolvê-los.",
        "Explorar a sua comunidade: b) Conhecer instituições de sua comunidade que realizam ações assistenciais a pessoas necessitadas ou orientação para a melhoria da vida das pessoas, procurando saber de que forma sua Alcateia poderia ajudá-las.",
        "Lobinho em Atividade: a) Participar de pelo menos uma edição do Mutirão Nacional Escoteiro de Ação Comunitária com sua Alcateia ou de outra atividade de ação comunitária realizada pela sua Alcateia ou por seu Grupo Escoteiro.",
        "Lobinho em Atividade: b) Perceber os eventuais perigos a que estão expostos os lobinhos em uma excursão ou acampamento/acantonamento e ajudar a aplicar as regras de segurança para evitá-los.",
        "Lobinho em Ação: a) Participar de pelo menos três boas ações coletivas com sua Alcateia, contribuindo com ideias e ações para o planejamento e execução das atividades.",
        "Lobinho em Ação: b) Participar de uma ação comunitária promovida por alguma instituição de sua comunidade: igreja, clube, escola, posto de saúde, polícia, bombeiros, casa comercial, etc. e fazer um relatório sobre essa participação.",
        "Lobinho em Ação: c) Planejar e executar uma boa ação, diferente das realizadas anteriormente, que seja útil em sua Alcateia, casa, escola ou comunidade, com duração mínima de um mês, apresentando posteriormente os resultados para sua Alcateia.",
      ],
    },
  },

];

export const SPECIAL_INTEREST_BADGE_BY_ID = new Map(
  SPECIAL_INTEREST_BADGES.map((b) => [b.id, b]),
);

/** The requirement texts of a badge in `ramo` (escoteiro when unset). */
export function badgeRequirementsFor(
  badgeId: string,
  ramo: Ramo | null | undefined,
): string[] {
  const badge = SPECIAL_INTEREST_BADGE_BY_ID.get(badgeId);
  if (!badge) return [];
  return badge.requirements[ramo ?? "escoteiro"] ?? badge.requirements.all ?? [];
}
