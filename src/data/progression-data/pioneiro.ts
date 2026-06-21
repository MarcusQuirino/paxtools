import type { Eixo, Action } from "../types";

function fixed(blocoId: string, index: number, text: string): Action {
  return { id: `pioneiro:${blocoId}:fixed:${index}`, text, type: "fixed" };
}

function variable(blocoId: string, index: number, text: string): Action {
  return { id: `pioneiro:${blocoId}:variable:${index}`, text, type: "variable" };
}

export const EIXOS_PIONEIRO: Eixo[] = [
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
          "Buscar constantemente novos conhecimentos e habilidades, analisando informações com senso crítico e aplicando-as de forma responsável. Explorar suas opções vocacionais para escolher um caminho profissional que lhe proporcione realização e dignidade.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("aprendizagem-continua", 0, "Conquistar, no Ramo Pioneiro, uma especialidade sobre um tema de seu interesse e que seja um conhecimento novo."),
        ],
        variableActions: [
          variable("aprendizagem-continua", 0, "Assumir um papel ativo em atividades voluntárias ou estágios em instituições que estejam alinhadas com seus valores, interesses e objetivos pessoais, visando amplicar a experiência prática, fortalecer o compromisso social e desenvolver habilidades que contribuam para sua formação cidadã e profissional."),
          variable("aprendizagem-continua", 1, "Participar de programas voltados a jovens em início de carreira, que oferecem capacitação estruturada e oportunidades de crescimento dentro de uma organização."),
          variable("aprendizagem-continua", 2, "Fazer cursos técnicos, de idiomas ou certificações reconhecidas no mercado, ampliando as qualificações profissionais."),
          variable("aprendizagem-continua", 3, "Engajar-se em projetos acadêmicos, contribuindo tanto para o desenvolvimento científico quanto para a experiência prática."),
          variable("aprendizagem-continua", 4, "Envolver-se em iniciativas empreendedoras ou incubadoras universitárias, experimentando o ambiente de inovação e gestão de projetos."),
          variable("aprendizagem-continua", 5, "Frequentar eventos, congressos e seminários para criar conexões e ampliar o contato com diferentes áreas de atuação."),
          variable("aprendizagem-continua", 6, "Buscar experiências em outras cidades, estados ou países, conciliando aprendizado cultural, acadêmico e profissional."),
        ],
        variableRequired: 7,
        alternativeCompletions: [
          { type: "especialidade", items: ["Educação", "Idiomas"] },
          { type: "insignia", items: ["Insígnia do Aprender"] },
        ],
      },
      {
        id: "autonomia-lideranca",
        name: "Autonomia e Liderança",
        objective:
          "Assumir o compromisso de conquistar sua independência financeira de forma ética, valorizando seu próprio trabalho e o dos outros. Participar ativamente de projetos individuais e coletivos, tomar decisões com consciência e responsabilidade, avaliando os impactos de suas escolhas.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("autonomia-lideranca", 0, "Planejar e realizar uma viagem para um município próximo, de forma individual ou em equipe, desenvolvendo um roteiro detalhado que inclua o destino, distância, meios de transporte, custos estimados, hospedagem (se necessário), pontos de interesse, aspectos culturais e históricos da região, além do contato com um Grupo Escoteiro local, se houver. Durante a viagem, registrar as experiências e aprendizados adquiridos para compartilhar com a comunidade escoteira."),
        ],
        variableActions: [
          variable("autonomia-lideranca", 0, "Participar de um evento externo como representante da Unidade Escoteira Local ou do Escotismo."),
          variable("autonomia-lideranca", 1, "Organizar uma oficina sobre finanças pessoais para o clã, UEL ou a comunidade."),
          variable("autonomia-lideranca", 2, "Criar pequenos projetos de geração de renda, como startups sociais ou negócios criativos."),
          variable("autonomia-lideranca", 3, "Elaborar uma atividade de reflexão sobre consequências de decisões no âmbito profissional ou financeiro."),
          variable("autonomia-lideranca", 4, "Apoiar jovens mais novos, compartilhando aprendizados acadêmicos, profissionais e de vida."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Empreendedorismo e Negócios", "Finanças e Economia", "Liderança e Gestão", "Viagens"] },
        ],
      },
      {
        id: "criatividade-inovacao",
        name: "Criatividade e Inovação",
        objective:
          "Utilizar a criatividade para se adaptar a diferentes situações do dia a dia, explorando novas soluções para desafios e inovando ao enfrentar mudanças.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("criatividade-inovacao", 0, "Planejar e executar atividades ao ar livre, prevendo possíveis imprevistos e adaptando criativamente as soluções quando necessário."),
        ],
        variableActions: [
          variable("criatividade-inovacao", 0, "Identificar um problema ou necessidade na comunidade local e implementar uma solução criativa, inovadora e prática. A iniciativa pode envolver ações culturais, ambientais, tecnológicas ou sociais, mas deve ter como principal foco o uso da criatividade para propor algo novo, diferente, fora do comum. Possíveis áreas de atuação: arte urbana e comunitária; tecnologia criativa; oficinas criativas; espaço de expressão comunitária."),
          variable("criatividade-inovacao", 1, "Realizar ou participar de uma campanha para garantir a primeira participação de um jovem em uma atividade escoteira regional, nacional ou internacional."),
          variable("criatividade-inovacao", 2, "Participar de atvidades que ensinem metodologias criativas para resolver problemas, estimulando colaboração e inovação."),
          variable("criatividade-inovacao", 3, "Organizar uma maratona de ideias em que grupos de jovens criem soluções inovadoras para desafios reais da comunidade (como alimentação, transporte, inclusão digital ou meio ambiente)."),
          variable("criatividade-inovacao", 4, "Estimular o desenvolvimento de produtos ou serviços com impacto social positivo."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Comunicações"] },
          { type: "insignia", items: ["Inovadores de Impacto"] },
        ],
      },
      {
        id: "inteligencia-emocional",
        name: "Inteligência Emocional",
        objective:
          "Fortalecer a resiliência, refletindo sobre seus pontos fortes e áreas de melhoria, sabendo lidar com suas emoções e construindo relações saudáveis. Incentivar a busca pela realização dos próprios sonhos, por meio do estabelecimento e da execução de planos com equilíbrio, propósito e respeito consigo mesmo e com os outros.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("inteligencia-emocional", 0, "Estabelecer metas pessoais de curto e médio prazo e avaliá-las regularmente em seu Projeto de Vida, ajustando estratégias quando necessário."),
        ],
        variableActions: [
          variable("inteligencia-emocional", 0, "Organizar uma atividade para o clã, grupo ou a comunidade sobre um dos seguintes temas: autoconhecimento; relações humanas; ética e moral; estresse e ansiedade; técnicas de resolução de conflitos (escuta ativa, comunicação não violenta, negociação, empatia, feedback)."),
          variable("inteligencia-emocional", 1, "Exercitar práticas integrativas que combinam respiração consciente, percepção do corpo e das emoções, pequenas meditações guiadas, momentos de escuta ativa em duplas e exercícios simples como caminhada silenciosa ou alongamentos."),
        ],
        variableRequired: 2,
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
          "Agir com responsabilidade ambiental, adotando a prática do consumo consciente e desenvolvendo iniciativas que contribuam para a construção de um futuro sustentável.",
        eixoId: "meio-ambiente",
        fixedActions: [
          fixed("consumo-responsavel", 0, "Assumir o compromisso de consumo consciente, praticando durante as atividades cotidianas e nas atividades do clã escolhas sustentáveis que priorizem o essencial e minimizem resíduos. Em conjunto com o clã, avaliar benefícios pessoais, coletivos e ambientais."),
        ],
        variableActions: [
          variable("consumo-responsavel", 0, "Engajar-se em organizações ou projetos que promovam o consumo consciente e práticas sustentáveis."),
          variable("consumo-responsavel", 1, "Propor uma ação para reduzir o impacto ambiental em um dos espaços que frequenta, focando em consumo consciente de água e energia e em melhor gerenciamento de resíduos."),
          variable("consumo-responsavel", 2, "Comprometer-se, durante 30 dias, a só comprar o que seja realmente essencial (como comida, medicamentos e transporte), avaliando ao final do período os benefícios pessoais e para o meio ambiente."),
          variable("consumo-responsavel", 3, "Conhecer organizações que promovam a reciclagem, economia circular ou hortas urbanas, entendendo na prática como o consumo consciente é aplicado."),
          variable("consumo-responsavel", 4, "Organizar um evento comunitário para troca de roupas, livros, eletrônicos e outros objetos, reduzindo o consumo e incentivando a economia colaborativa."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Agricultura Sustentável"] },
          { type: "insignia", items: ["Reduzir, Reciclar, Reutilizar"] },
        ],
      },
      {
        id: "mudancas-climaticas",
        name: "Mudanças Climáticas",
        objective:
          "Compreender os impactos e as causas das mudanças climáticas, buscando soluções para minimizá-las. Liderar ações que promovam a conscientização e a adoção de práticas sustentáveis.",
        eixoId: "meio-ambiente",
        fixedActions: [],
        variableActions: [
          variable("mudancas-climaticas", 0, "Organizar, individual ou coletivamente, um projeto que promova práticas sustentáveis, com o objetivo de aumentar a conscientização sobre o assunto, tais como: horta orgânica comunitária, viveiro de mudas, cisterna para água de chuva, aquecedor solar com garrafas PET, separação de resíduos, uso responsável de água e energia, uso de sacolas retornáveis nas compras, plantio de árvores, entre outras."),
          variable("mudancas-climaticas", 1, "Participar de cursos, workshops, conferências, eventos sobre sustentabilidade e mudanças climáticas."),
          variable("mudancas-climaticas", 2, "Identificar áreas da cidade ou comunidade mais afetadas por fenômenos climáticos e propor soluções de prevenção ou mitigação."),
          variable("mudancas-climaticas", 3, "Assistir um documentário, filme ou curta-metragem sobre Mudanças Climáticas e promover debates no seu clã, grupo escoteiro ou comunidade."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Sustentabilidade"] },
          { type: "insignia", items: ["Escoteiros pela Energia Solar"] },
        ],
      },
      {
        id: "preservacao-biodiversidade",
        name: "Preservação da Biodiversidade",
        objective:
          "Atuar na preservação da biodiversidade, entendendo as causas e os impactos das ações humanas na sua perda. Implementar estratégias para proteger a vida no planeta.",
        eixoId: "meio-ambiente",
        fixedActions: [],
        variableActions: [
          variable("preservacao-biodiversidade", 0, "Planejar e executar atividades educativas para crianças ou adolescentes sobre a preservação da biodiversidade."),
          variable("preservacao-biodiversidade", 1, "Conhecer órgãos e ONGs de proteção ambiental e engajar-se em ações promovidas por eles."),
          variable("preservacao-biodiversidade", 2, "Atuar como voluntário em uma área de proteção ambiental."),
          variable("preservacao-biodiversidade", 3, "Participar de projetos que coletam dados ambientais, monitoram biodiversidade, qualidade da água ou poluição."),
          variable("preservacao-biodiversidade", 4, "Oferecer habilidades profissionais (marketing, design, finanças, direito) para apoiar projetos ambientais."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Natureza e Ciências Ambientais", "Educação Ambiental"] },
          { type: "insignia", items: ["Campeões da Natureza"] },
        ],
      },
      {
        id: "vida-ao-ar-livre",
        name: "Vida ao Ar Livre",
        objective:
          "Usufruir do contato com a natureza e das atividades ao ar livre, adotando práticas conscientes que minimizem seu impacto ao meio ambiente e contribuam para a preservação do equilíbrio ecológico.",
        eixoId: "meio-ambiente",
        fixedActions: [
          fixed("vida-ao-ar-livre", 0, "Planejar e executar uma das seguintes opções: acampamento, atividade aventureira, expedição, travessia. A atividade deve considerar os seguintes aspectos: segurança e análise de riscos, intenso contato com a natureza, campismo de baixo impacto, duração mínima de quatro dias."),
        ],
        variableActions: [
          variable("vida-ao-ar-livre", 0, "Colaborar no planejamento e execução de atividades ao ar livre de outras Seções, incentivando o contato com a natureza."),
        ],
        variableRequired: 1,
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
        objective: "Atuar",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("comunidade", 0, "Participar, sozinho ou em equipe, de pelo menos 15 horas de serviço comunitário com outras instituições."),
          fixed("comunidade", 1, "Capacitar-se em curso promovido por entidades de referência (como a Defesa Civil, Cruz Vermelha, Corpo de Bombeiros...), preparando-se para atuar em crises humanitárias."),
        ],
        variableActions: [
          variable("comunidade", 0, "Conhecer o trabalho da Defesa Civil local e identificar estratégias de atuação individual ou em equipe, quando necessário."),
          variable("comunidade", 1, "Organizar e realizar um projeto de desenvolvimento comunitário."),
          variable("comunidade", 2, "Apresentar o Escotismo para um público não escoteiro."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "especialidade", items: ["Desenvolvimento Comunitário", "Ações Humanitárias", "Inclusão e Acessibilidade"] },
          { type: "insignia", items: ["Escoteiros do Mundo", "Mensageiros da Paz", "Diálogos pela Paz"] },
        ],
      },
      {
        id: "democracia",
        name: "Democracia",
        objective:
          "Participar ativamente de processos democráticos, colaborando na tomada de decisões coletivas e contribuindo para que todos tenham voz, espaço para se expressar e igualdade de oportunidades para participar plenamente.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("democracia", 0, "Conhecer a Carta Pioneira e participar ativamente da vida democrática do clã."),
        ],
        variableActions: [
          variable("democracia", 0, "Participar de Fóruns Regionais e Nacionais de Jovens, Conferências da Juventude e outros espaços de debate sobre o papel da juventude."),
          variable("democracia", 1, "Atuar como mesário, presidente de seção ou outro serviço voluntário nas eleições."),
          variable("democracia", 2, "Participar de uma Assembleia Reional ou Nacional Escoteira, preferencialmente como delegado de sua UEL ou Região."),
          variable("democracia", 3, "Organizar e realizar um Fórum de Grupo Escoteiro ou Fórum de Jovens do Ramo Pioneiro."),
          variable("democracia", 4, "Participar de conselhos municipas de juventude ou semelhantes."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Políticas Públicas", "Equidade"] },
        ],
      },
      {
        id: "heranca-cultural",
        name: "Herança Cultural",
        objective:
          "Valorizar e compartilhar a herança cultura de sua comunidade e do seu país. Reconhecer e respeitar os saberes e tradições dos povos originários, promovendo sua importância na sociedade atual.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [],
        variableActions: [
          variable("heranca-cultural", 0, "Organizar uma atividade sobre herança cultura em uma cidade, centro ou bairro histórico, desenvolvendo uma ação sobre diversidade cultural, preservação de tradições ou o impacto da globalização na cultura."),
          variable("heranca-cultural", 1, "Colaborar com coletivos, associações ou projetos que atuem pela preservação de línguas, danças, festas populares ou saberes tradicionais."),
        ],
        variableRequired: 2,
        alternativeCompletions: [
          { type: "especialidade", items: ["Cultura e Arte"] },
        ],
      },
      {
        id: "promocao-da-paz",
        name: "Promoção da Paz",
        objective:
          "Promover ações inclusivas, respeitando as diferenças e incentivando o diálogo empático entre as pessoas, independentemente de crença, etnia ou cultura, de modo a construir um ambiente de compreensão e respeito mútuo.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("promocao-da-paz", 0, "Realizar um serviço voluntário de pelo menos trinta horas, contribuindo para resolver um problema relacionado à atual agenda global de desenvolvimento."),
        ],
        variableActions: [
          variable("promocao-da-paz", 0, "Organizar e coordenar uma vigília sobre respeito às diferenças e superação de preconceitos, proporcionando um espaço de união e diálogo, de inclusão e de reconhecimento da diversidade como uma força que enriquece a humanidade."),
          variable("promocao-da-paz", 1, "Organizar uma iniciativa - oficina, diálogo guiado, atividade colaborativa - para trabalhar o desenvolvimento de habilidades em comunicação não violenta, mediação e resolução pacífica de conflitos."),
        ],
        variableRequired: 2,
        alternativeCompletions: [
          { type: "especialidade", items: ["Direitos Humanos"] },
          { type: "insignia", items: ["Insígnia da Lusofonia", "Insígnia do Cone Sul"] },
        ],
      },
      {
        id: "valores",
        name: "Valores",
        objective:
          "Alinhar suas ações aos seus valores pessoais e aos princípios do Movimento Escoteiro, vivenciando a Promessa e a Lei Escoteira de forma autêntica, incorporando-os em cada escolha do dia a dia, sendo um exemplo de compromisso com a construção de um mundo melhor.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("valores", 0, "Avaliar sua vivência sobre a Promessa e a Lei Escoteira e realizar a Investidura Pioneira."),
        ],
        variableActions: [
          variable("valores", 0, "Elaborar um projeto ou ação inspirada em um artigo da Lei Escoteira, avaliando em equipe como seu desenvolvimento refletiu os valores do Movimento."),
          variable("valores", 1, "Participar de estudos de caso que apresentem dilemas éticos do cotidiano e propor soluções coerentes com a Promessa e a Lei Escoteira."),
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
          "Responsabilizar-se pelo cuidado com seu corpo, reconhecendo suas capacidades, enfrentando desafios e respeitando seus limites. Expressar sua sexualidade com autorrespeito e respeito ao próximo, valorizando a diversidade e a individualidade.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("cuidado-com-o-corpo", 0, "Participar de uma capacitação de primeiros socorros, aplicando os aprendizados em simulações práticas."),
          fixed("cuidado-com-o-corpo", 1, "Participar de uma capacitação em respostas a desastres, aplicando os aprendizados em simulações práticas."),
        ],
        variableActions: [
          variable("cuidado-com-o-corpo", 0, "Convidar profissional da saúde para organizar e participar de um curso de primeiros socorros no Grupo Escoteiro ou na comunidade."),
          variable("cuidado-com-o-corpo", 1, "Realizar atividades físicas desafiadoras (trilhas, escaladas, corridas), avaliando capacidades, superações e limites individuais."),
          variable("cuidado-com-o-corpo", 2, "Participar de oficinas ou rodas de conversa sobre saúde física, sexualidade e diversidade, conduzidas por profissionais ou especialistas convidados."),
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
          "Buscar compreender e vivenciar sua espiritualidade, encontrando sentido para sua vida por meio de suas crenças e valores. Procurar agir com coerência, incorporando seus valores de forma contínua nas escolhas do cotidiano e na sua atuação na comunidade.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("espiritualidade", 0, "Integrar ao Projeto de Vida compromissos espirituais e éticos, avaliando periodicamente sua coerência com atitudes cotidianas."),
        ],
        variableActions: [
          variable("espiritualidade", 0, "Liderar ações que promovam o diálogo inter-religioso e a valorização das diferentes expressões de fé na comunidade, incentivando o respeito, a empatia e a convivência pacífica."),
          variable("espiritualidade", 1, "Promover ou colaborar em ações de serviço em espaços religiosos diversos."),
        ],
        variableRequired: 2,
        alternativeCompletions: [
          { type: "insignia", items: ["Diálogo Inter-religioso"] },
        ],
      },
      {
        id: "habitos-saudaveis",
        name: "Hábitos Saudáveis",
        objective:
          "Cuidar do próprio bem-estar, adotando uma rotina de autocuidado que inclua a prática regular de atividades físicas, uma alimentação equilibrada e a manutenção da higiene pessoal e do ambiente ao seu redor.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("habitos-saudaveis", 0, "Implementar, em sua comunidade, iniciativas que abordem um dos seguintes temas: alimentação saudável; atividades físicas; higiene."),
        ],
        variableActions: [
          variable("habitos-saudaveis", 0, "Organizar oficina culinária saudável, explorando receitas equilibradas e sustentáveis para aplicar em acampamentos ou no dia a dia."),
          variable("habitos-saudaveis", 1, "Desenvolver uma campanha de conscientização sobre higiene pessoal e coletiva."),
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
          "Manter hábitos que promovam o equilíbrio da saúde mental, adotando estratégias que favoreçam o bem-estar próprio e coletivo, contribuindo para a construção de ambientes mais saudáveis, empáticos e acolhedores.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("saude-mental", 0, "Participar de capacitação em primeiros socorros em saúde mental, praticando técnicas de escuta qualificada, apoio inicial e encaminhamento responsável em situações de crise."),
        ],
        variableActions: [
          variable("saude-mental", 0, "Participar de capacitação em primeiros socorros em saúde mental, praticando técnicas de escuta qualificada, apoio inicial e encaminhamento responsável em situações de crise."),
          variable("saude-mental", 1, "Organizar atividade para outras seções, clã ou a comunidade sobre a importância da gestão do tempo, incluindo os impactos negativos do uso excessivo de tecnologias e redes sociais, além de destacar práticas de bem-estar que favorecem o equilíbrio emocional e a saúde mental, como meditação, exercícios físicos, momentos de lazer offline e conexões interpessoais saudáveis."),
        ],
        variableRequired: 2,
        alternativeCompletions: [
          { type: "especialidade", items: ["Saúde Mental e Bem-estar Emocional", "Hobbies e Lazer"] },
        ],
      },
      {
        id: "vinculos-saudaveis",
        name: "Vínculos Saudáveis",
        objective:
          "Construir vínculos saudáveis e relações interpessoais baseadas na empatia, no respeito e no crescimento mútuo, promovendo um ambiente positivo e acolhedor para todos.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("vinculos-saudaveis", 0, "Participar de monentos regulares de celebração e confraternização no clã (Fogos de Conselho, encontros culturais, atividades de partilha), fortalecendo os vínculos afetivos."),
          fixed("vinculos-saudaveis", 1, "Praticar escuta ativa e feedback construtivo nas atividades do clã, fortalecendo a cooperação e o respeito mútuo."),
        ],
        variableActions: [
          variable("vinculos-saudaveis", 0, "Conhecer o Estatuto da Juventude, especialmente quanto ao Direito à Saúde, e organizar visita solidária a uma instituição que atue nessa área. Durante a visita, desenvolver ações que contribuam para o bem-estar dos atenditos, gerando impacto social positivo."),
        ],
        variableRequired: 1,
        alternativeCompletions: [
          { type: "especialidade", items: ["Saúde Sexual e Reprodutiva"] },
        ],
      },
    ],
  },
];
