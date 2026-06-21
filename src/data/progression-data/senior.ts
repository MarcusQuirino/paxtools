import type { Eixo, Action } from "../types";

function fixed(blocoId: string, index: number, text: string): Action {
  return { id: `senior:${blocoId}:fixed:${index}`, text, type: "fixed" };
}

function variable(blocoId: string, index: number, text: string): Action {
  return { id: `senior:${blocoId}:variable:${index}`, text, type: "variable" };
}

export const EIXOS_SENIOR: Eixo[] = [
  // ═══════════════════════════════════════════════════════
  // EIXO 1: HABILIDADES PARA A VIDA
  // ═══════════════════════════════════════════════════════
  {
    id: "habilidades-para-a-vida",
    name: "Habilidades para a Vida",
    color: "#E91E63",
    colorLight: "#FCE4EC",
    blocos: [
      {
        id: "aprendizagem-continua",
        name: "Aprendizagem Contínua e Desenvolvimento Vocacional",
        objective:
          "Conhecer diferentes temas, planejar estratégias para aprender de maneira eficaz e utilizar novos conceitos e recursos para melhorar seus resultados. Aprofundar seus conhecimentos em áreas de interesse, descobrindo e explorando sua vocação.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("aprendizagem-continua", 0, "Conquistar, no Ramo Sênior, uma especialidade sobre um tema de seu interesse e que seja um conhecimento novo."),
        ],
        variableActions: [
          variable("aprendizagem-continua", 0, "Explorar diferentes áreas profissionais participando de uma Feira de Profissões ou entrevistando profissionais da área de interesse, investigando os caminhos percorridos, os desafios enfrentados e as motivações que os levaram à escolha da carreira."),
          variable("aprendizagem-continua", 1, "Engajar-se em atividades voluntárias ou estágios em instituições que despertem interesse, permitindo a vivência prática, o desenvolvimento de habilidades e a compreensão do ambiente profissional e comunitário."),
          variable("aprendizagem-continua", 2, "Participar de palestras, workshops ou vivências voltadas à orientação vocacional, planejamento de carreira e desenvolvimento pessoal, explorando ferramentas que ajudem na identificação de talentos, interesses e estratégias para o futuro profissional."),
          variable("aprendizagem-continua", 3, "Organizar uma atividade para a patrulha ou tropa voltada para escolha vocacional."),
          variable("aprendizagem-continua", 4, "Organizar, para sua patrulha ou tropa, uma oficina, curso ou palestra sobre um tema de seu interesse."),
          variable("aprendizagem-continua", 5, "Participar de feiras, mostras ou eventos escolares/científicos, fora do Movimento Escoteiro, apresentando trabalhos ou projetos desenvolvidos."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "especialidade", items: ["Gastronomia", "Tecnologia", "Educação", "Idiomas", "Ciências Humanas"] },
          { type: "insignia", items: ["Insígnia do Aprender"] },
        ],
      },
      {
        id: "autonomia-lideranca",
        name: "Autonomia e Liderança",
        objective:
          "Assumir responsabilidades dentro de sua patrulha ou equipe de interesse, trabalhando junto aos colegas para alcançar objetivos. Organizar e administrar recursos para seus projetos, definir um orçamento e executar ações para cumpri-lo. Planejar, realizar e avaliar atividades individuais e coletivas, tomando decisões com consciência e responsabilidade.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("autonomia-lideranca", 0, "Conhecer o material individual e de patrulha necessário para diferentes tipos de excursões (acampamento, acantonamento, volante, fixo) e saber organizá-lo na mochila."),
        ],
        variableActions: [
          variable("autonomia-lideranca", 0, "Participar ativamente do planejamento, da execução e da avaliação de atividades de patrulha, tropa ou equipe de interesse, sendo bem avaliado pelos companheiros e escotistas."),
          variable("autonomia-lideranca", 1, "Desenvolver o planejamento orçamentário de uma atividade de patrulha, equipe de interesse ou tropa."),
          variable("autonomia-lideranca", 2, "Utilizar transporte coletivo urbano para uma atividade externa de patrulha."),
          variable("autonomia-lideranca", 3, "Implementar uma estratégia, incluindo a parte financeira, para alcançar uma meta pessoal, compartilhando sua experiência com sua patrulha."),
          variable("autonomia-lideranca", 4, "Planejar e executar um projeto de captação de recursos para participação em uma atividade escoteira ou realização de um projeto pessoal."),
          variable("autonomia-lideranca", 5, "Assumir e desempenhar diferentes encargos na patrulha, sendo bem avaliado pela sua patrulha."),
          variable("autonomia-lideranca", 6, "Planejar e conduzir um grande jogo para a tropa, com apoio da patrulha ou equipe de interesse."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Empreendedorismo e Negócios", "Finanças e Economia", "Liderança e Gestão", "Viagens"] },
        ],
      },
      {
        id: "criatividade-inovacao",
        name: "Criatividade e Inovação",
        objective:
          "Expressar suas ideias, talentos e criatividade por meio da arte, da escrita, da música ou de outras formas de criação. Buscar inovar em seus projetos e iniciativas, explorando novas possibilidades além daquilo que já está acostumado a fazer.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("criatividade-inovacao", 0, "Durante um acampamento, planejar e executar pioneirias inovadoras de médio ou grande porte."),
        ],
        variableActions: [
          variable("criatividade-inovacao", 0, "Organizar e conduzir um Fogo de Conselho ou show de talentos para a tropa, UEL ou comunidade."),
          variable("criatividade-inovacao", 1, "Organizar uma noite cultural para sua patrulha ou tropa."),
          variable("criatividade-inovacao", 2, "Produzir um curta metragem ou vídeo criativo sobre Escotismo."),
          variable("criatividade-inovacao", 3, "Planejar e realizar mostra sobre um tema de seu interesse, produzindo e curando registros (fotos, vídeos, áudios, textos e objetos) para apresentação à tropa ou comunidade."),
          variable("criatividade-inovacao", 4, "Participar de concursos culturais, literários ou artísticos locais, representando a tropa."),
          variable("criatividade-inovacao", 5, "Construir uma versão simplificada de 1 (um) \"horizonte artificial\" funcional, que permita visualizar a inclinação do instrumento em 2 (dois) eixos (arfagem e rolagem)."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "especialidade", items: ["Comunicações"] },
          { type: "insignia", items: ["Inovadores de Impacto"] },
        ],
      },
      {
        id: "inteligencia-emocional",
        name: "Inteligência Emocional",
        objective:
          "Reconhecer e lidar com seus sentimentos, respeitando suas próprias emoções, expressando-se de forma equilibrada e assertiva.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("inteligencia-emocional", 0, "Durante as atividades, reconhecer situações que comprometam a integridade física ou emocional, sabendo como agir e a quem recorrer, mantendo-se calmo e em segurança."),
          fixed("inteligencia-emocional", 1, "Praticar feedback construtivo durante as atividades, expressando opiniões de forma assertiva e respeitosa."),
        ],
        variableActions: [
          variable("inteligencia-emocional", 0, "Identificar as mudanças de emoção repentinas, equilibrando as decisões e reações, buscando agir de maneira respeitosa."),
          variable("inteligencia-emocional", 1, "Envolver-se em atividades aventureiras com segurança, conhecendo seus limites e enfrentando seus medos."),
          variable("inteligencia-emocional", 2, "Identificar as situações que causam estresse ou desconforto e as formas e ferramentas de solucioná-las, respeitando seus limites."),
          variable("inteligencia-emocional", 3, "Negociar responsabilidades familiares e pessoais de forma respeitosa e madura."),
          variable("inteligencia-emocional", 4, "Conduzir dinâmicas de confiança e cooperação que envolvam lidar com frustrações e celebrar conquistas coletivas."),
        ],
        variableRequired: 4,
        alternativeCompletions: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // EIXO 2: MEIO AMBIENTE
  // ═══════════════════════════════════════════════════════
  {
    id: "meio-ambiente",
    name: "Meio Ambiente",
    color: "#4CAF50",
    colorLight: "#E8F5E9",
    blocos: [
      {
        id: "consumo-responsavel",
        name: "Consumo Responsável",
        objective:
          "Compreender como o consumo responsável influencie o futuro do planeta e adotar hábitos que ajudam a garantir recursos para as próximas gerações.",
        eixoId: "meio-ambiente",
        fixedActions: [],
        variableActions: [
          variable("consumo-responsavel", 0, "Liderar a separação de resíduos recicláveis e orgânicos em uma festa da UEL, comunidade ou eventos regionais e nacionais."),
          variable("consumo-responsavel", 1, "Visitar uma estação de tratamento de esgoto, aterro sanitário ou cooperativa de reciclagem e discutir as questões ambientais e de consumo."),
          variable("consumo-responsavel", 2, "Desenvolver um projeto individual ou coletivo sobre o descarte correto de materiais eletrônicos na UEL, comunidade ou escola."),
          variable("consumo-responsavel", 3, "Organizar pelo menos uma oficina, debate ou workshop para a seção sobre um dos seguintes temas: cruelty-free (produtos livres de exploração animal); vegetarianismo e veganismo; upcycling (reaproveitamento de itens descartados); obsolescência programada e perceptiva; microplástico."),
          variable("consumo-responsavel", 4, "Em um acampamento, executar uma receita com cascas, talos ou sobras."),
          variable("consumo-responsavel", 5, "Organizar um brechó beneficente ou feira de trocas em sua UEL ou comunidade."),
          variable("consumo-responsavel", 6, "Participar de visita a cooperativa de reciclagem ou projeto comunitário ligado à economia circular."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Agricultura Sustentável"] },
          { type: "insignia", items: ["Reduzir, Reciclar, Reutilizar"] },
        ],
      },
      {
        id: "mudancas-climaticas",
        name: "Mudanças Climáticas",
        objective:
          "Propor e organizar atividades e projetos para reduzir os impactos ambientais e combater as mudanças climáticas. Incentivar práticas sustentáveis no dia a dia e mobilizar outros para agira pelo meio ambiente.",
        eixoId: "meio-ambiente",
        fixedActions: [],
        variableActions: [
          variable("mudancas-climaticas", 0, "Utilizar ferramentas de acompanhamento meteorológico para o planejamento de atividades ao ar livre."),
          variable("mudancas-climaticas", 1, "Desenvolver iniciativas ou projetos sobre mudanças climáticas e soluções sustentáveis."),
          variable("mudancas-climaticas", 2, "Organizar, com sua patrulha, uma atividade ecológica em área urbana, identificando problemas ambientais da localidade e apontando suas causas e possíveis soluções."),
          variable("mudancas-climaticas", 3, "Participar de clubes ou projetos voltados para sustentabilidade e mudanças climáticas."),
          variable("mudancas-climaticas", 4, "Utilizar e promover o uso do transporte coletivo, bicicleta ou caminhada em uma atividade escoteira e utilizar um meio de transporte alternativo de fonte de energia renovável."),
          variable("mudancas-climaticas", 5, "Planejar e executar, em patrulha ou equipe de interesse, um projeto comunitário de reaproveitamento de recursos naturais ou de uso de energias renováveis."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Sustentabilidade"] },
          { type: "insignia", items: ["Escoteiros pela Energia Solar"] },
        ],
      },
      {
        id: "preservacao-biodiversidade",
        name: "Prevenção da Biodiversidade",
        objective:
          "Identificar os impactos das ações humanas na biodiversidade e atuar para proteger os ecossistemas, promovendo a preservação da fauna e flora.",
        eixoId: "meio-ambiente",
        fixedActions: [
          fixed("preservacao-biodiversidade", 0, "Participar de uma atividade em uma Área de Proteção Ambiental, reconhecendo fauna, flora e bioma local, identificando riscos e propondo soluções para preservação."),
        ],
        variableActions: [
          variable("preservacao-biodiversidade", 0, "Participar de eventos sobre preservação da biodiversidade organizados por ONGs, escolas ou parques naturais."),
          variable("preservacao-biodiversidade", 1, "Colaborar em um projeto ou ação promovido por alguma ONG ambiental."),
          variable("preservacao-biodiversidade", 2, "Coletar e registrar dados sobre espécies locais, qualidade da água ou vegetação."),
          variable("preservacao-biodiversidade", 3, "Organizar um projeto individual ou coletivo sobre um dos seguintes temas: abrigos de animais silvestres, enriquecimento ambiental, reintegração de animais ou outra iniciativa de preservação da fauna."),
          variable("preservacao-biodiversidade", 4, "Organizar o plantio de árvores nativas em parceria com órgãos ambientais ou ONGs."),
          variable("preservacao-biodiversidade", 5, "Conduzir uma campanha de conscientização sobre preservação da fauna e flora em praças, escolas ou redes sociais da comunidade."),
          variable("preservacao-biodiversidade", 6, "Promover palestras ou oficinas abertas à comunidade sobre redução de impactos ambientais e proteção da biodiversidade."),
        ],
        variableRequired: 2,
        alternativeCompletions: [
          { type: "especialidade", items: ["Natureza e Ciências Naturais", "Educação Ambiental"] },
          { type: "insignia", items: ["Campeões da Natureza"] },
        ],
      },
      {
        id: "vida-ao-ar-livre",
        name: "Vida ao Ar Livre",
        objective:
          "Aproveitar ao máximo as atividades ao ar livre e sua conexão com a natureza, sempre cuidando do ambiente e reduzindo seu impacto sobre ele.",
        eixoId: "meio-ambiente",
        fixedActions: [
          fixed("vida-ao-ar-livre", 0, "Montar o campo de patrulha com pioneirias como mesa, canto do lenhador e pórtico, utilizando amarras adequadas."),
          fixed("vida-ao-ar-livre", 1, "Aplicar os seguintes nós: direito, correr, lais de guia, volta do fiel, nó em oito, balso pelo seio, catau, volta do salteador e boca de lobo durante um acampamento de tropa ou patrulha, conhecendo suas funcionalidades."),
          fixed("vida-ao-ar-livre", 2, "Escolher corretamente o local para montagem da barraca, incluindo técnicas de montagem, desmontagem e acondicionamento durante um acampamento de tropa ou patrulha."),
          fixed("vida-ao-ar-livre", 3, "Manusear corretamente ferramentas de corte e sapa, zelando pela segurança e realizando reparos, durante um acampamento de tropa ou patrulha."),
          fixed("vida-ao-ar-livre", 4, "Preparar e executar pelo menos três tipos de fogueiras, utilizando-as para preparar uma refeição mateira e zelando pela segurança, em um acampamento de tropa ou patrulha."),
          fixed("vida-ao-ar-livre", 5, "Planejar e realizar ao menos uma excursão de patrulha em um ambiente natural."),
          fixed("vida-ao-ar-livre", 6, "Planejar e realizar ao menos um acampamento de patrulha com técnicas de campismo de baixo impacto."),
          fixed("vida-ao-ar-livre", 7, "Em atividade ao ar livre, orientar-se utilizando carta topográfica ou náutica e bússola, e utilizar métodos naturais e tecnológicos de orientação."),
        ],
        variableActions: [
          variable("vida-ao-ar-livre", 0, "Participar de um acampamento volante."),
          variable("vida-ao-ar-livre", 1, "Selecionar corretamente os materiais de campo para um acampamento de patrulha."),
          variable("vida-ao-ar-livre", 2, "Em conjunto com a sua patrulha, planejar e construir pelo menos uma das seguintes pioneirias: barraca suspensa, torre de observação ou ponte."),
          variable("vida-ao-ar-livre", 3, "Demonstrar conhecimento sobre processos de ancoragem e estiramento de cabos."),
          variable("vida-ao-ar-livre", 4, "Utilizar diferentes formas de acondicionamento de alimentos e técnicas de purificação de água em um acampamento."),
          variable("vida-ao-ar-livre", 5, "Durante um acampamento de patrulha ou tropa, pernoitar em um abrigo natural."),
          variable("vida-ao-ar-livre", 6, "Durante uma atividade aventureira, pernoitar uma noite em bivaque, abrigo natural ou ao relento."),
          variable("vida-ao-ar-livre", 7, "Participar de atividades como rafting, canoagem, rapel, espeleologia, escalada, trekking ou mountain bike."),
          variable("vida-ao-ar-livre", 8, "Participar de atividades aquáticas de exploração de corpos d'água naturais, respeitando os padrões de segurança."),
          variable("vida-ao-ar-livre", 9, "Participar de um acampamento organizado pela patrulha ou tropa de média (3 a 5 dias) ou longa (6 a 10 dias) duração."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Esportes de Aventura", "Ecoturismo", "Habilidades Escoteiras"] },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // EIXO 3: PAZ E DESENVOLVIMENTO
  // ═══════════════════════════════════════════════════════
  {
    id: "paz-e-desenvolvimento",
    name: "Paz e Desenvolvimento",
    color: "#1A237E",
    colorLight: "#E8EAF6",
    blocos: [
      {
        id: "comunidade",
        name: "Comunidade",
        objective:
          "Planejar e coordenar projetos que geram impacto positivo na comunidade, dialogando com outras instituições, e promover ações concretas para o bem comum.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("comunidade", 0, "Participar, sozinha, em patrulha ou equipe, de pelo menos 10 horas de ação comunitária com outras insitituições locais."),
          fixed("comunidade", 1, "Capacitar-se em curso promovido por entidades de referência (defesa civil, cruz vermelha, corpo de bombeiros, etc.) e estar preparado para atuar em crises humanitárias."),
        ],
        variableActions: [
          variable("comunidade", 0, "Identificar os riscos de desastres naturais na comunidade, conhecer protocolos de segurança e atuar de acordo com eles."),
          variable("comunidade", 1, "Planejar uma atividade comunitária, como limpeza de praça, visita a uma instituição sem fins lucrativos ou revitalização de uma creche infantil ou lar de repouso de idosos, ou similar."),
          variable("comunidade", 2, "Criar uma biblioteca comunitária móvel com livros doados."),
          variable("comunidade", 3, "Organizar uma campaha de arrecadação (alimentos, roupas, livros) envolvendo diferentes setores da comunidade."),
          variable("comunidade", 4, "Representar a tropa em fóruns, conselhos ou encontros comunitários, contribuindo com ideias e propostas."),
          variable("comunidade", 5, "Promover ações de educação ambiental, saúde ou cidadania em parceria com outras instituições."),
        ],
        variableRequired: 2,
        alternativeCompletions: [
          { type: "especialidade", items: ["Desenvolvimento Comunitário", "Ações Humanitárias", "Inclusão e Acessibilidade"] },
          { type: "insignia", items: ["Insígnia do Desafio Comunitário", "Mensageiros da Paz", "Diálogos pela Paz", "Escoteiros do Mundo"] },
        ],
      },
      {
        id: "democracia",
        name: "Democracia",
        objective:
          "Participar ativamente da democracia, engajando-se em debates, contribuindo na tomada de decisões e ajudando a construir soluções coletivas para desafios sociais.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("democracia", 0, "Participar ativamente das decisões do Conselho de Patrulha, contribuindo com ideias, votando e assumindo responsabilidades, respeitando os resultados."),
          fixed("democracia", 1, "Participar ativamente das decisões da Assembleia de Tropa, contribuindo com ideias, votando e assumindo responsabilidades, respeitando os resultados."),
          fixed("democracia", 2, "Participar da eleição do monitor da patrulha e das decisões dos encargos respeitando os resultados."),
        ],
        variableActions: [
          variable("democracia", 0, "Participar de Audiência Pública e consultas populares de temas de seu interesse promovidas pelo poder legislativo."),
          variable("democracia", 1, "Emitir o título de eleitor, compreendendo a importância dos processos democráticos do país e, em ano eleitoral, pesquisar sobre os candidatos e suas propostas."),
          variable("democracia", 2, "Planejar e executar uma campanha para educar outros jovens sobre temas como voto consciente e direitos do cidadão."),
          variable("democracia", 3, "Participar de ao menos uma Assembleia do Grupo Escoteiro."),
          variable("democracia", 4, "Participar ativamente de um Fórum de Grupo Escoteiro."),
          variable("democracia", 5, "Participar de grêmio estudantil ou conferências de juventude."),
          variable("democracia", 6, "Participar de pelo menos uma atividade da seção, como debates, estudos de caso ou \"júri simulado\", de forma respeitosa e contributiva."),
          variable("democracia", 7, "Participar de dinâmicas de mediação de conflitos, praticando a escuta ativa e construção de consensos."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Equidade", "Políticas Públicas"] },
        ],
      },
      {
        id: "heranca-cultural",
        name: "Herança Cultural",
        objective:
          "Compartilhar a herança cultura de sua comunidade e do seu país, organizando atividades e projetos que valorizam a história, os costumes e os saberes ancestrais dos povos originários brasileiros.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("heranca-cultural", 0, "Conduzir a cerimônia de abertura de uma atividade de patrulha ou tropa."),
        ],
        variableActions: [
          variable("heranca-cultural", 0, "Organizar com sua patrulha uma expedição que promova o contato com culturas como: povos originários; comunidades quilombolas; comunidades ribeirinhas ou caiçaras; abordando língua, costumes, festividades e tradições, e debater formas de valorizar e preservar essas culturas."),
          variable("heranca-cultural", 1, "Organizar a recepção de membros do Movimento Escoteiro de outras localidades e apresentá-los aos principais pontos históricos e turísticos de seu município."),
          variable("heranca-cultural", 2, "Fazer tour em sua cidade, explorando pontos históricos e culturais como: centro cultura; biblioteca pública; mercado municipal; feiras típicas; museus; marcos históricos, entre outros."),
          variable("heranca-cultural", 3, "Identificar os núcleos culturais de sua região e participar de atividades com eles (ex.: centro de tradições gaúchas, núcleos israelitas, associações de colônias imigrantes)."),
          variable("heranca-cultural", 4, "Apresentar uma forma de expressão artística da cultura popular brasileira em um Fogo de Conselho."),
          variable("heranca-cultural", 5, "Promover um festival com música, poesia, dança e literatura típicas de uma região para seu grupo escoteiro ou comunidade."),
          variable("heranca-cultural", 6, "Produzir, com sua patrulha, uma peça para uso cotidiano, utilizando técnicas de artesanato brasileiro."),
          variable("heranca-cultural", 7, "Apresentar a cultura da sua cidade em um evento regional, nacional ou internacional, como feira das cidades ou noite folclórica."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Cultura e Arte"] },
        ],
      },
      {
        id: "promocao-da-paz",
        name: "Promoção da Paz",
        objective:
          "Desenvolver projetos que promovem a paz, o respeito à diversidade, o diálogo entre diferentes culturas e crenças, reconhecendo e valorizando a pluralidade da humanidade.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("promocao-da-paz", 0, "Participar de uma ação colaborativa sobre diferentes temas que envolvem a cultura de paz, tais como: direitos humanos; dialogo inter-religioso; refugiados e imigrantes; diversidades; inclusão."),
        ],
        variableActions: [
          variable("promocao-da-paz", 0, "Organizar uma mesa redonda para outros jovens da comunidade sobre temas como: idolatria; torcidas organizadas; tribos urbanas; intolerância religiosa; xenofobia."),
          variable("promocao-da-paz", 1, "Participar de atividades que promovam a paz e compreensão entre as pessoas."),
          variable("promocao-da-paz", 2, "Participar com a patrulha ou equipe de interesse de uma atividade inter-religiosa, conhecendo diferentes tradições de fé, dialogando sobre valores comuns e refletindo sobre respeito e diversidade espiritual."),
          variable("promocao-da-paz", 3, "Participar de uma simulação das Nações Unidas em que os participantes representam diferentes países e debatem questões globais sobre direitos humanos, como a igualdade de gênero, a crise dos refugiados e a proteção ambiental."),
          variable("promocao-da-paz", 4, "Organizar e realizar uma atividade com outra unidade escoteira e refletir o significado da fraternidade mundial escoteira."),
          variable("promocao-da-paz", 5, "Organizar um \"Jantar Internacional\" com sua patrulha ou equipe de interesse, apresentando culinária, trajes, músicas e informações sobre o Escotismo de diferentes países."),
          variable("promocao-da-paz", 6, "Participar com a patrulha, tropa ou equipe de interesse de um dia de atividades e jogos e/ou uma atividade de solidariedade com um grupo de jovens na comunidade em uma igreja, mesquita, sinagoga, templo, etc."),
          variable("promocao-da-paz", 7, "Desenvolver um momento inter-religioso na sua seção, grupo escoteiro ou comunidade."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Direitos Humanos", "Diversidades"] },
          { type: "insignia", items: ["Insígnia da Lusofonia", "Insígnia do Cone Sul"] },
        ],
      },
      {
        id: "valores",
        name: "Valores",
        objective:
          "Alinhar suas atitudes aos seus valores pessoais e aos princípios do Movimento Escoteiro, vivendo a Promessa e a Lei Escoteira de forma consciente e coerente.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("valores", 0, "Avaliar com seus pares a vivência da Promessa e da Lei Escoteira e realizar o Compromisso Sênior."),
        ],
        variableActions: [
          variable("valores", 0, "Participar da avaliação da sua Progressão Pessoal e dos companheiros de patrulha."),
          variable("valores", 1, "Explicar o significado da Lei e da Promessa Escoteiras aos novos membros da patrulha."),
          variable("valores", 2, "Auxiliar um companheiro de patrulha a realizar seu Compromisso Sênior."),
          variable("valores", 3, "Participar de um debate de casos reais de notícias ou situações sociais, analisando-os à luz dos valores escoteiros."),
        ],
        variableRequired: 2,
        alternativeCompletions: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // EIXO 4: SAÚDE E BEM-ESTAR
  // ═══════════════════════════════════════════════════════
  {
    id: "saude-e-bem-estar",
    name: "Saúde e Bem-estar",
    color: "#E57373",
    colorLight: "#FFEBEE",
    blocos: [
      {
        id: "cuidado-com-o-corpo",
        name: "Cuidado com o Corpo",
        objective:
          "Reconhecer e valorizar suas habilidades físicas, se desafiar a superar limitações e cuidar da própria saúde com respeito ao seu corpo. Valorizar e respeitar a diversidade humana.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("cuidado-com-o-corpo", 0, "Capacitar-se para atuar nas situações de primeiros socorros indicadas abaixo: atendimento a pequenos cortes, contusões e escoriações; avaliação dos limites de pressão arterial, pulso e temperatura corporal; cuidados em caso de queimaduras, insolação, hipotermia e desidratação; atendimento a picadas de animais peçonhentos; reconhecimento e manejo de hemorragias externas e internas; imobilização de fraturas, entorses, controle cervical e traumatismo craniano; atendimento a crises convulsivas, estados de choque e casos de intoxicação ou envenenamento; reconhecimento de sinais de infarto ou AVC e acionamento imediato do resgate; atendimento a engasgos e a choque elétrico; aplicação de técnicas de reanimação cardiopulmonar (RCP); execução correta de bandagens, tipóias e técnicas de transporte de feridos; uso adequado do kit de primeiros socorros em atividades ao ar livre; acionamento correto dos serviços de emergência (SAMU, bombeiros e polícia)."),
          fixed("cuidado-com-o-corpo", 1, "Nas atividades da patrulha ou tropa, identificar condutas que possam colocar em risco a saúde física e mental, compartilhando medidas com os companheiros para mitigar esses riscos."),
        ],
        variableActions: [
          variable("cuidado-com-o-corpo", 0, "Experimentar atividades físicas ou modalidades esportivas diversas (coletivas, individuais, adaptadas) e refletir sobre a experiência."),
          variable("cuidado-com-o-corpo", 1, "Pesquisar sobre saúde física e mental na juventude e apresentar propostas para a tropa melhorar seus hábitos."),
          variable("cuidado-com-o-corpo", 2, "Conduzir oficinas ou jogos inclusivos que valorizem a diversidade de habilidades físicas do grupo."),
          variable("cuidado-com-o-corpo", 3, "Participar de um workshop, palestra ou atividade que trate de um dos seguintes temas: perigos do uso de anabolizantes; perigos do uso de drogas, álcool, tabaco, cigarros eletrônicos, etc.; distúrbios alimentares."),
          variable("cuidado-com-o-corpo", 4, "Organizar o material de primeiros socorros da patrulha para diferentes atividades;"),
          variable("cuidado-com-o-corpo", 5, "Participar de workshop ou outra atividade relacionada à prevenção das Infecções Sexualmente Transmissíveis (IST)."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "especialidade", items: ["Saúde"] },
        ],
      },
      {
        id: "espiritualidade",
        name: "Espiritualidade",
        objective:
          "Refletir sobre o sentido da vida, encontrando inspiração na natureza, na solidariedade e na diversidade espiritual da sua comunidade. Buscar viver de acordo com seus valores, alinhando suas crenças às suas ações diárias.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [],
        variableActions: [
          variable("espiritualidade", 0, "Conduzir momentos de silêncio, oração ou meditação em atividades da tropa, valorizando a diversidade espiritual."),
          variable("espiritualidade", 1, "Participar de projetos e atividades que permitam conhecer, atuar e dialogar com jovens de diferentes opções de fé e crenças."),
          variable("espiritualidade", 2, "Colaborar em celebrações religiosas ou outras expressões de fé e espiritualidade de sua comunidade."),
          variable("espiritualidade", 3, "Organizar um momento de reflexão e conexão com um ambiente natural em que se possa apreciar a beleza do mundo e cultivar um relacionamento harmonioso com ele. Exemplos: banho de floresta, dia da gratidão, música, artes manuais ou um culto de alguma religião, entre outras."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "insignia", items: ["Diálogo Inter-religioso"] },
        ],
      },
      {
        id: "habitos-saudaveis",
        name: "Hábitos Saudáveis",
        objective:
          "Cuidar do próprio bem-estar adotando hábitos saudáveis, praticando atividades físicas, mantendo uma alimentação equilibrada e garantindo a higiene pessoal e a organização do ambiente onde vive.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("habitos-saudaveis", 0, "Planejar um cardápio de acampamento para a patrulha ou equipe de interesse, priorizando alimentação sustentável, com mínimo uso de produtos industrializados e redução de resíduos, e avaliar após a atividade se os objetivos foram atingidos."),
          fixed("habitos-saudaveis", 1, "Praticar atividades físicas regularmente."),
        ],
        variableActions: [
          variable("habitos-saudaveis", 0, "Manter o canto da patrulha limpo e organizado, colaborando também com a limpeza da sede."),
          variable("habitos-saudaveis", 1, "Planejar e realizar um almoço ou jantar equilibrado e saudável para a patrulha, elaborando o cardápio, organizando a lista de compras, preparando os alimentos e fazendo avaliação posterior."),
          variable("habitos-saudaveis", 2, "Praticar atividades como meditação, yoga ou técnicas de relaxamento na natureza."),
          variable("habitos-saudaveis", 3, "Elaborar um plano pessoal de hábitos saudáveis e avaliar seu cumprimento ao longo do ciclo."),
          variable("habitos-saudaveis", 4, "Demonstrar manter a rotnia de cuidado com seu ambiente doméstico, com autonomia e cooperação nas responsabilidades da casa."),
        ],
        variableRequired: 2,
        alternativeCompletions: [
          { type: "especialidade", items: ["Esportes", "Educação Alimentar e Nutricional"] },
        ],
      },
      {
        id: "saude-mental",
        name: "Saúde Mental",
        objective:
          "Cultivar hábitos que promovem a saúde mental, aprender a lidar com desafios e aplicar práticas que favorecem um ambiente positivo e acolhedor para si e para aqueles ao seu redor.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("saude-mental", 0, "Buscar informações e conhecimentos sobre os Espaços Seguros no Movimento Escoteiro e promover seus conceitos em todas as atividades."),
          fixed("saude-mental", 1, "Reconhecer sinais de estresse, ansiedade ou tristeza em colegas e praticar técnicas básicas de primeiros socorros em saúde mental, como escuta ativa, apoio inicial e encaminhamento para ajuda adequada."),
        ],
        variableActions: [
          variable("saude-mental", 0, "Realizar, com sua patrulha ou equipe de interesse, uma campanha relacionada à temática de saúde mental, como Setembro Amarelo ou Janeiro Branco."),
          variable("saude-mental", 1, "Desenvolver hábitos e atividades para aliviar a tensão do dia a dia, proporcionando momentos de bem estar e equilíbrio."),
          variable("saude-mental", 2, "Convidar profissionais da área de saúde e saúde mental para falar sobre o assunto na tropa."),
          variable("saude-mental", 3, "Organizar sua rotina de atividades mensais, considerando a importância do equilíbrio entre as atividades do mundo digital e real e incluindo uma atividade de bem-estar offline."),
          variable("saude-mental", 4, "Utilizar de técnicas ou espaços para autoexpressão e contato com suas emoções e pensamentos, como: a prática de mindfulness (foco no presente), meditação guiada, terapia, teatro ou dança de expressão corporal."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "especialidade", items: ["Saúde Mental e Bem-estar Emocional", "Hobbies e Lazer"] },
        ],
      },
      {
        id: "vinculos-saudaveis",
        name: "Vínculos Saudáveis",
        objective:
          "Construir relações saudáveis e empáticas, criando laços baseados no respeito, na compreensão mútua e no bem-estar coletivo.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("vinculos-saudaveis", 0, "Identificar e discutir com sua patrulha ou equipe de interesse as manifestações de bullying e cyberbullying ao seu redor, elaborando e implementando estratégias para prevenir e combater essas situações."),
        ],
        variableActions: [
          variable("vinculos-saudaveis", 0, "Promover um encontro social que reúna jovens de diferentes realidades e contextos, criando um ambiente de convivência, troca de experiências e respeito à diversidade."),
          variable("vinculos-saudaveis", 1, "Realizar uma roda de conversa para debater temas como confiança, respeito e equilíbrio nas relações, incentivando a reflexão sobre atitudes que contribuem para vínculos saudáveis."),
          variable("vinculos-saudaveis", 2, "Engajar-se em uma equipe de interesse para planejar e executar projetos ou conquistar especialidades, fortalecendo a colaboração, o compromisso e a construção de vínculos positivos no grupo."),
          variable("vinculos-saudaveis", 3, "Promover reuniões regulares na patrulha que incluam espaços de escuta e apoio, incentivando a empatia, o compartilhamento de desafios e a busca conjunta por soluções."),
          variable("vinculos-saudaveis", 4, "Assumir responsabilidades no ambiente familiar, contribuindo de forma constante com tarefas do dia a dia e romovendo diálogo respeitoso sobre decisões coletivas."),
          variable("vinculos-saudaveis", 5, "Convidar um colega da mesma faixa etária para participar de um Fogo de Conselho, integrado a sua patrulha e com o devido \"Registro de Visitante\"."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "especialidade", items: ["Saúde Sexual e Reprodutiva"] },
        ],
      },
    ],
  },
];
