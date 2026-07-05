/**
 * Older-group (sênior + pioneiro) specialty catalog.
 * Parsed from the official Brazilian scout guide.
 * Source: Guia de Especialidades e Insígnias - Ramos Sênior e Pioneiro (2025 edition).
 *
 * Each especialidade is a three-step project: conhecer -> fazer -> compartilhar.
 * The step suggestion lists are guidance shown alongside each report text area.
 */

/** The three sequential project steps, in order. */
export const PROJECT_STEPS = ["conhecer", "fazer", "compartilhar"] as const;
export type ProjectStep = (typeof PROJECT_STEPS)[number];

/** Human-readable label for each project step. */
export const PROJECT_STEP_LABELS: Record<ProjectStep, string> = {
  conhecer: "Conhecer",
  fazer: "Fazer",
  compartilhar: "Compartilhar",
};

export interface OlderSpecialty {
  /** Slug - used as specialtyId in specialtyProjectReports */
  id: string;
  name: string;
  eixoId: string;
  description: string;
  /** Suggested activities for the Conhecer step */
  conhecerSuggestions: string[];
  /** Suggested activities for the Fazer step */
  fazerSuggestions: string[];
  /** Suggested activities for the Compartilhar step */
  compartilharSuggestions: string[];
}

export const OLDER_SPECIALTIES: OlderSpecialty[] = [
  {
    "id": "comunicacoes",
    "name": "Comunicações",
    "eixoId": "habilidades-para-a-vida",
    "description": "Nesta especialidade, você vai explorar diferentes formas de expressão, tais como a verbal, visual, digital e artística, e compreender como a comunicação influencia relações, mobiliza pessoas, combate a desinformação e transforma realidades. É uma oportunidade de experimentar diferentes linguagens e fortalecer sua voz no mundo.",
    "conhecerSuggestions": [
      "Participar de oficinas, cursos, mentorias ou formações relacionadas à comunicação, oratória, mídias digitais ou outras.",
      "Pesquisar e sintetizar técnicas, métodos e ferramentas utilizadas em processos comunicacionais na área escolhida.",
      "Analisar campanhas, peças publicitárias, discursos, reportagens, filmes ou conteúdos digitais, identificando estratégias de comunicação e impactos sociais.",
      "Entrevistar profissionais da área (jornalistas, comunicadores, designers, artistas, criadores, radialistas, roteiristas).",
      "Elaborar uma reflexão crítica sobre seu próprio estilo de comunicação, pontos fortes e aspectos a desenvolver, tanto presencial quanto digital.",
      "Validar aprendizagens anteriores por meio de experiências como: rádio escolar, blog, jornal estudantil, criação de vídeos, podcasts ou outros."
    ],
    "fazerSuggestions": [
      "Conduzir uma apresentação pública, roda de conversa, debate, painel temático ou mediação de diálogo.",
      "Criar e publicar um podcast, vídeo, jornal, blog, zine, boletim, canal ou série de conteúdos sobre um tema de interesse.",
      "Desenvolver uma campanha de combate à desinformação, com materiais de divulgação e ações educativas.",
      "Criar uma exposição visual (fotografia, ilustração, design, audiovisual, entre outros), montando uma mostra ou intervenção artística.",
      "Organizar um evento ou espaço de expressão (slam, mostra de artes, sarau, festival digital, roda de mídia).",
      "Planejar e implementar uma estratégia de comunicação para a UEL, escola, projeto comunitário ou outra instituição."
    ],
    "compartilharSuggestions": [
      "Apresentar seu projeto para a seção, escola, universidade ou comunidade, explicando o processo e os resultados.",
      "Produzir e divulgar conteúdos em diferentes formatos (vídeo, texto, áudio, artes visuais) para públicos diversos.",
      "Conduzir uma oficina, vivência ou bate-papo sobre expressão, oratória, comunicação digital ou leitura crítica de mídia.",
      "Apoiar outros jovens a desenvolverem suas próprias iniciativas comunicacionais, oferecendo orientação técnica ou artística.",
      "Registrar e compartilhar sua experiência em redes sociais, blogs, plataformas escoteiras ou espaços de comunicação comunitária."
    ]
  },
  {
    "id": "educacao",
    "name": "Educação",
    "eixoId": "habilidades-para-a-vida",
    "description": "Esta especialidade convida você a compreender a educação como uma força capaz de transformar realidades. Ao explorá-la, você vai descobrir diferentes maneiras de aprender e ensinar, analisar como o conhecimento circula na vida cotidiana e reconhecer seu papel como educador entre amigos, grupos, escolas, universidade, e comunidades. É uma oportunidade de desenvolver práticas educativas relevantes e conscientes.",
    "conhecerSuggestions": [
      "Participar de oficinas, cursos, seminários ou fóruns sobre educação e metodologias inovadoras ou participativas.",
      "Observar educadores em diferentes contextos (escola, universidade, projetos sociais, escotismo), analisando suas práticas, linguagem, interação e impacto.",
      "Pesquisar sobre fundamentos de educação libertadora, popular, inclusiva, crítica ou inovadora, elaborando um breve registro reflexivo.",
      "Entrevistar professores, pedagogos, educadores populares, mediadores culturais, instrutores técnicos ou escotistas experientes.",
      "Analisar o próprio processo de aprendizagem, identificando estratégias, ritmos, motivações e desafios pessoais.",
      "Validar experiências anteriores, como facilitação de oficinas, monitoria, liderança juvenil, apoio a estudos ou condução de atividades em grupo."
    ],
    "fazerSuggestions": [
      "Conduzir uma oficina, minicurso, vivência, debate, roda de conversa ou atividade prática para jovens, escola, comunidade ou UEL.",
      "Criar um recurso educativo (jogo, carta de atividades, vídeo, podcast, guia visual, material impresso/digital, sequência didática).",
      "Planejar e implementar um projeto de tutoria ou rede de troca de saberes entre pares, com acompanhamento e registro do processo.",
      "Desenvolver e aplicar uma atividade educativa em escola, projeto social, comunidade ou UEL.",
      "Facilitar um processo de escuta ativa, diálogo e construção coletiva, registrando aprendizagens e encaminhamentos.",
      "Elaborar um artigo, estudo, ensaio ou iniciação científica sobre uma temática educacional de seu interesse."
    ],
    "compartilharSuggestions": [
      "Apresentar sua experiência para a seção, escola, comunidade.",
      "Produzir materiais explicativos ou conteúdos digitais sobre o papel do educador, métodos de aprendizagem ou temas estudados.",
      "Conduzir uma reflexão guiada com outros jovens sobre suas formas de aprender e ensinar.",
      "Acompanhar colegas em suas próprias ações educativas, oferecendo apoio como facilitador ou mentor.",
      "Criar e disponibilizar um legado educativo acessível (jogo, cartilha, guia, sequência didática, vídeo, banco de ideias) para a seção, escola ou comunidade."
    ]
  },
  {
    "id": "empreendedorismo-e-negocios",
    "name": "Empreendedorismo e Negócios",
    "eixoId": "habilidades-para-a-vida",
    "description": "Sabe aquela ideia que faz você pensar: \"isso daria um projeto incrível\"? Esta especialidade é o espaço para transformar essa ideia em algo concreto. Aqui, você é convidado a explorar seu potencial criativo. Empreender é experimentar, testar, errar e aprender, sempre com responsabilidade e buscando um impacto positivo. Esta especialidade te ajuda a desenvolver visão e capacidade de mobilizar pessoas e recursos para a realização de projetos.",
    "conhecerSuggestions": [
      "Participar de oficinas, hackathons, feiras, bootcamps ou encontros de empreendedores jovens.",
      "Pesquisar modelos de negócios reais, iniciativas de impacto, startups e trajetórias de empreendedores(as) comerciais, sociais ou culturais.",
      "Entrevistar empreendedores(as), investidores(as), educadores financeiros, líderes comunitários ou pessoas que já tiraram projetos do papel.",
      "Estudar ferramentas como Canvas, Mapa de Empatia, SWOT, Jornada do Usuário, 5W2H, Lean Startup.",
      "Observar o contexto local para identificar necessidades, dores, oportunidades e potenciais parcerias.",
      "Validar experiências anteriores em feiras, clubes de empreendedorismo, economia criativa, economia solidária ou especialidades relacionadas.",
      "Analisar um caso real de falha ou sucesso empreendedor, identificando fatores-chave.",
      "Participar de uma conversa com profissionais de áreas como marketing, design, finanças ou inovação, conectando saberes."
    ],
    "fazerSuggestions": [
      "Criar e executar um projeto, produto, serviço ou iniciativa de impacto, com objetivos e proposta de valor claros.",
      "Desenvolver um modelo de negócio completo, incluindo viabilidade financeira, estratégias de divulgação, análise de riscos e definição de indicadores.",
      "Realizar uma feira, simulação de vendas, apresentação de pitch ou demonstração pública do projeto (com retorno real ou fictício).",
      "Elaborar um guia, vídeo, infográfico, landing page ou material educativo sobre como transformar ideias em ação.",
      "Criar uma solução para um desafio real da comunidade, incorporando inovação e sustentabilidade.",
      "Desenvolver um protótipo simples, que represente a ideia central do seu projeto, testá-lo com usuários reais e registrar feedbacks.",
      "Elaborar uma proposta objetiva de pitch (2 a 3 minutos) que apresente o problema, a proposta, os diferenciais e o impacto esperado, e apresentá-la para um grupo avaliador (seção, professores, mentores ou outro público relevante).",
      "Criar um plano de parcerias para o projeto (ONGs, comerciantes locais, instituições, comunidade escoteira)."
    ],
    "compartilharSuggestions": [
      "Apresentar seu projeto em eventos, escolas, feiras ou espaços juvenis, mostrando processo, erros e aprendizados.",
      "Produzir conteúdo (vídeos, textos, podcasts) explicando sua experiência e dicas para quem deseja empreender.",
      "Conduzir uma oficina de prototipagem, ideação ou planejamento de negócios para outros jovens.",
      "Apoiar colegas na validação de ideias, na construção de modelos de negócio ou na elaboração de MVPs.",
      "Criar ou fortalecer uma rede de troca colaborativa de jovens empreendedores na comunidade ou na UEL.",
      "Documentar todo o processo em um portfólio digital ou relatório.",
      "Disponibilizar seu projeto para ser replicado por outras unidades ou grupos, criando um \"manual de implementação\".",
      "Participar de eventos externos (como feiras comunitárias, mostras culturais ou oficinas públicas) levando sua solução para mais pessoas."
    ]
  },
  {
    "id": "financas-e-economia",
    "name": "Finanças e Economia",
    "eixoId": "habilidades-para-a-vida",
    "description": "O dinheiro faz parte da vida, e aprender a usá-lo de maneira consciente é uma habilidade essencial para o presente e para o futuro. Nesta especialidade, você será convidado a organizar suas finanças, planejar metas e tomar decisões responsáveis, entendendo que cada escolha econômica - individual ou coletiva - tem impacto no mundo. É uma oportunidade de desenvolver autonomia financeira e compreender como a economia funciona no cotidiano.",
    "conhecerSuggestions": [
      "Participar de oficinas, cursos, palestras ou rodas de conversa sobre finanças, economia solidária ou planejamento financeiro.",
      "Pesquisar ferramentas de organização financeira (planilhas, apps, métodos de envelope, metas SMART).",
      "Observar hábitos de consumo pessoal e familiar, identificando padrões, gatilhos e oportunidades de mudança.",
      "Entrevistar profissionais das áreas financeira, administrativa ou bancária.",
      "Estudar modelos alternativos de economia popular, colaborativa, sustentável ou comunitária (moedas sociais, bancos comunitários, cooperativas).",
      "Validar experiências anteriores envolvendo gestão de recursos, vendas, campanhas ou feiras solidárias.",
      "Analisar um caso real de endividamento e identificar estratégias de prevenção.",
      "Estudar os princípios básicos de investimentos para iniciantes (Renda Fixa, CDB, Tesouro Selic), sem caráter consultivo.",
      "Pesquisar como funcionam impostos, tributos e taxas que influenciam a vida de jovens e famílias."
    ],
    "fazerSuggestions": [
      "Criar um orçamento pessoal, familiar ou coletivo, com metas e monitoramento ao longo de algumas semanas.",
      "Conduzir uma campanha educativa sobre consumo consciente, redução de desperdício ou finanças responsáveis.",
      "Organizar uma feira de trocas, economia criativa ou economia solidária na comunidade, escola, universidade ou UEL.",
      "Desenvolver um recurso educativo (planilha, guia, vídeo, infográfico, podcast) sobre organização financeira para jovens.",
      "Criar um plano financeiro completo para um projeto escoteiro, social ou empreendedor.",
      "Planejar e executar uma ação de arrecadação transparente, com registro de entradas, saídas e prestação de contas.",
      "Simular investimentos básicos utilizando plataformas virtuais de treinamento (sem envolver dinheiro real).",
      "Criar uma análise comparativa de preços, serviços ou produtos, avaliando custo-benefício e escolha responsável.",
      "Elaborar um plano de redução de gastos ou readequação financeira na rotina pessoal."
    ],
    "compartilharSuggestions": [
      "Apresentar seu plano, projeto ou análise financeira para a seção, escola, universidade ou comunidade.",
      "Produzir conteúdos acessíveis e didáticos sobre finanças pessoais, economia solidária ou consumo consciente.",
      "Conduzir uma oficina prática de organização financeira, planejamento ou economia colaborativa.",
      "Estimular diálogos sobre desigualdade, justiça econômica, ética e escolhas financeiras responsáveis.",
      "Deixar como legado um recurso educativo (cartilha, planilha, guia prático, mural ou vídeo) para sua UEL ou comunidade.",
      "Criar uma \"Semana da Consciência Financeira\" ou uma roda de conversa aberta sobre economia na vida real.",
      "Compartilhar estratégias pessoais de aprendizagem financeira em redes jovens ou grupos de apoio.",
      "Ajudar colegas a organizar seus próprios orçamentos e planos financeiros, atuando como multiplicador."
    ]
  },
  {
    "id": "gastronomia",
    "name": "Gastronomia",
    "eixoId": "habilidades-para-a-vida",
    "description": "Cozinhar vai muito além de preparar alimentos: é uma forma de expressar cultura e aproximar as pessoas. Nesta especialidade, você será convidado a explorar a alimentação como campo de aprendizagem. Você vai conhecer ingredientes, métodos e tradições, desenvolver hábitos alimentares conscientes e compreender como suas escolhas culinárias influenciam o ambiente, a saúde, a cultura e a comunidade.",
    "conhecerSuggestions": [
      "Participar de oficinas, cursos livres, aulas-show, visitas técnicas ou degustações orientadas.",
      "Pesquisar uma tradição culinária e analisar seu papel na cultura, memória e identidade de um povo.",
      "Estudar nutrição básica, grupos alimentares e elaborar cardápios equilibrados para diferentes perfis.",
      "Conversar com profissionais da área - chefs, nutricionistas, merendeiras, agricultores familiares, padeiros, confeiteiros.",
      "Investigar práticas de gastronomia sustentável, segurança alimentar e produção responsável.",
      "Validar experiências anteriores em projetos de culinária, eventos, comissões de alimentação ou cozinhas comunitárias.",
      "Realizar análise comparativa de rotulagem de alimentos e identificar padrões de consumo.",
      "Pesquisar a cadeia produtiva de um alimento (do campo ao prato) e entender os impactos sociais e ambientais.",
      "Estudar princípios de ciência dos alimentos (reação de Maillard, fermentação, emulsões, gelificação)."
    ],
    "fazerSuggestions": [
      "Desenvolver uma receita autoral, ou reinterpretar um prato tradicional com identidade própria.",
      "Criar uma ação educativa sobre alimentação saudável, sustentável ou cultural para sua seção, escola, universidade ou comunidade.",
      "Montar e aplicar um cardápio acessível, equilibrado e saudável para um evento ou acampamento.",
      "Aplicar princípios de economia doméstica, sustentabilidade e aproveitamento integral na cozinha.",
      "Organizar uma vivência culinária temática (ex.: culinária ancestral, de imigrantes, comida de rua, cozinha sazonal, internacional).",
      "Criar um pequeno dossiê ou portfólio culinário com registros fotográficos, processos, técnicas e reflexões.",
      "Desenvolver um produto gastronômico (geleia, pão, tempero, prato autoral) e validá-lo com usuários.",
      "Projetar uma horta doméstica ou horta comunitária vinculada a um plano culinário.",
      "Preparar uma refeição inclusiva considerando restrições alimentares reais do grupo."
    ],
    "compartilharSuggestions": [
      "Apresentar sua experiência culinária, receitas e reflexões para a seção, escola ou comunidade.",
      "Produzir conteúdos educativos (vídeos, textos, podcasts, infográficos, receituários) sobre alimentação consciente.",
      "Realizar uma oficina prática com foco em técnicas culinárias, saúde, cultura ou sustentabilidade.",
      "Estimular diálogos sobre o papel da comida na família, comunidade, identidade e afeto.",
      "Deixar como legado um acervo de receitas, guia culinário, vídeo-aula, caderno de técnicas ou projeto gastronômico contínuo.",
      "Organizar um \"Festival Gastronômico\" com pratos acessíveis.",
      "Montar uma exposição ou mostra culinária com fotos, relatos e receitas.",
      "Apoiar colegas na elaboração de cardápios, técnicas ou projetos culinários como orientador."
    ]
  },
  {
    "id": "idiomas",
    "name": "Idiomas",
    "eixoId": "habilidades-para-a-vida",
    "description": "Aprender um novo idioma é abrir portas para o mundo e ampliar horizontes. Nesta especialidade, você será convidado a explorar línguas como ferramentas de comunicação e convivência multicultural. Ao mergulhar em outros idiomas, você também se aproxima de modos de viver e visões de mundo. É uma oportunidade de fortalecer conexões globais e ampliar suas possibilidades pessoais e profissionais.",
    "conhecerSuggestions": [
      "Participar de cursos, oficinas, encontros de conversação ou plataformas online de estudo do idioma escolhido.",
      "Pesquisar sobre a cultura, história, costumes, culinária, símbolos e expressões idiomáticas dos povos falantes da língua estudada.",
      "Entrevistar falantes nativos, intercambistas, professores ou voluntários internacionais.",
      "Refletir sobre sua motivação, objetivos e formas de uso do idioma na vida pessoal, acadêmica ou profissional.",
      "Observar o idioma em músicas, filmes, séries, jogos, redes sociais, podcasts e livros, registrando vocabulário e expressões.",
      "Investigar como o idioma se relaciona com temas globais (migração, direitos linguísticos, comunicação internacional).",
      "Identificar semelhanças e diferenças entre o idioma estudado e a língua portuguesa (sonoridade, gramática, vocabulário).",
      "Participar de um \"tandem linguístico\", troca de aprendizado com outra pessoa que fala o idioma nativamente."
    ],
    "fazerSuggestions": [
      "Apresentar-se, conversar ou gravar um vídeo em outro idioma com fluência básica ou intermediária.",
      "Criar um glossário ilustrado, guia prático, caderno visual ou conjunto de expressões úteis no idioma estudado.",
      "Traduzir e adaptar uma música, poema, texto escoteiro, carta, história ou material educativo.",
      "Participar de um intercâmbio cultural virtual, correspondência internacional ou evento escoteiro com uso do idioma.",
      "Organizar uma atividade escoteira temática sobre um país, povo ou cultura ligada ao idioma escolhido.",
      "Ministrar oficinas comunitárias de iniciação ao idioma ou de Língua Portuguesa para estrangeiros (com orientação adequada).",
      "Criar um pequeno podcast, vídeo ou miniaula no idioma.",
      "Elaborar um pequeno projeto de imersão cultural (ex: \"dia temático\" com culinária, expressões e músicas).",
      "Escrever um relato, carta ou diário curto no idioma.",
      "Participar de um clube de leitura ou cinema em língua estrangeira."
    ],
    "compartilharSuggestions": [
      "Conduzir uma dinâmica, quiz ou roda de conversa ensinando expressões úteis, saudações e curiosidades culturais.",
      "Criar um mural cultural ou espaço temático sobre o país, povo ou região trabalhada na especialidade.",
      "Produzir conteúdo bilíngue (vídeos, posts, histórias, podcast, zines) para redes sociais ou plataformas de jovens.",
      "Estimular outros jovens a aprender idiomas, mostrando caminhos, métodos e depoimentos.",
      "Deixar como legado um material de apoio: guia para iniciantes, cartão de vocabulário, minidicionário, oficina gravada.",
      "Apoiar colegas em tarefas de tradução ou mediação cultural em eventos da UEL.",
      "Participar como voluntário em atividades ligadas à acolhida de estrangeiros ou migrantes (se houver iniciativas locais).",
      "Contribuir para que sua seção desenvolva ações de comunicação multicultural com outros escoteiros do mundo."
    ]
  },
  {
    "id": "lideranca-e-gestao",
    "name": "Liderança e Gestão",
    "eixoId": "habilidades-para-a-vida",
    "description": "Liderar é saber inspirar. Nesta especialidade, você é convidado a desenvolver seu potencial como líder, alguém capaz de tomar decisões responsáveis, facilitar processos, mediar conflitos e construir caminhos coletivos. É uma oportunidade de se conhecer melhor, fortalecer sua presença, enxergar possibilidades e liderar de um jeito que transforma as pessoas. Liderança aqui é serviço e cooperação.",
    "conhecerSuggestions": [
      "Participar de oficinas, rodas de conversa, cursos ou grupos de estudo sobre liderança, gestão, facilitação ou comunicação.",
      "Realizar entrevistas com líderes de diferentes áreas (comunitários, sociais, empresariais, educacionais, esportivos).",
      "Estudar experiências de liderança juvenil em movimentos sociais, coletivos, universitários, projetos escolares ou UELs.",
      "Pesquisar diferentes estilos de liderança (servidora, situacional, transformacional, colaborativa, estratégica).",
      "Observar como grupos tomam decisões, distribuem tarefas e resolvem conflitos, analisando padrões e atitudes.",
      "Validar experiências anteriores em cargos de liderança juvenil, coordenação de projetos ou mediações.",
      "Estudar ferramentas de facilitação (World Café, Open Space, Design Thinking, Círculos de Diálogo).",
      "Analisar um caso real de liderança positiva ou negativa, extraindo lições aplicáveis.",
      "Investigar o papel da liderança feminina, periférica ou de minorias sociais.",
      "Mapear suas próprias competências com testes ou instrumentos (DISC, MBTI, Roda de Competências, etc.)."
    ],
    "fazerSuggestions": [
      "Liderar um projeto, equipe ou atividade escoteira, escolar ou comunitária, aplicando planejamento, organização e cooperação.",
      "Criar uma ação formativa para desenvolver habilidades de liderança entre jovens do seu grupo ou seção.",
      "Planejar e conduzir uma reunião, assembleia, consulta ou espaço de escuta com foco em participação juvenil.",
      "Produzir um recurso educativo (guia, vídeo, apresentação, infográfico) sobre liderança, mediação ou gestão.",
      "Elaborar um plano pessoal de desenvolvimento em liderança, com metas, estratégias e indicadores de progresso.",
      "Aplicar ferramentas de planejamento, gestão e avaliação em uma atividade ou evento.",
      "Facilitar uma atividade que envolva mediação de conflitos ou tomada de decisão coletiva.",
      "Criar um processo colaborativo de construção de regras, acordos de convivência ou metas.",
      "Desenvolver um diagnóstico de clima ou relacionamento em uma equipe (por meio de entrevistas, formulários, mapas de empatia).",
      "Liderar um projeto de impacto social com foco em transformação comunitária."
    ],
    "compartilharSuggestions": [
      "Apresentar seus aprendizados e resultados para a seção, UEL, escola ou comunidade.",
      "Facilitar um espaço de partilha sobre desafios, erros e descobertas no exercício da liderança.",
      "Produzir conteúdos acessíveis (vídeos, posts, cartilhas, podcasts) sobre liderança juvenil e participação.",
      "Estimular a participação democrática, a escuta ativa e a corresponsabilidade na sua UEL ou em outro espaço social.",
      "Deixar como legado uma ferramenta, metodologia, relatório ou projeto que ajude novos líderes a atuarem melhor.",
      "Organizar uma roda de mentoria entre jovens, conectando líderes iniciantes e mais experientes.",
      "Criar um workshop ou minicurso sobre liderança voltado aos jovens.",
      "Documentar aprendizados em um portfólio, caderno de bordo ou diário de liderança.",
      "Contribuir com processos de construção coletiva (assembleias, decisões estratégicas, organização de eventos)."
    ]
  },
  {
    "id": "tecnologia",
    "name": "Tecnologia",
    "eixoId": "habilidades-para-a-vida",
    "description": "Tecnologia é sobre criar soluções e compreender o mundo interconectado em que vivemos. Nesta especialidade, você será convidado a explorar ferramentas digitais, mecânicas e eletrônicas de forma crítica e criativa. É uma oportunidade para experimentar soluções práticas e refletir sobre como a tecnologia influencia o planeta.",
    "conhecerSuggestions": [
      "Participar de oficinas, hackathons, cursos, webinários ou trilhas de programação, robótica ou cidadania digital.",
      "Entrevistar profissionais da área tecnológica: programadores, analistas de dados, desenvolvedores, designers, técnicos em informática.",
      "Pesquisar a história e os impactos sociais da tecnologia, considerando inclusão, exclusão digital e desigualdades.",
      "Testar softwares, apps ou plataformas e analisar objetivo, funcionamento, modelo de negócios e riscos.",
      "Observar e analisar seus hábitos de uso da tecnologia, identificando pontos de atenção (privacidade, tempo de tela, segurança).",
      "Investigar como funciona uma rede Wi-Fi, um servidor, um hardware ou um dispositivo eletrônico básico.",
      "Mapear brechas de segurança comuns (engenharia social, golpes digitais) e estratégias de proteção.",
      "Estudar como funciona a coleta e o uso de dados pessoais em plataformas digitais.",
      "Analisar problemas ambientais relacionados ao lixo eletrônico, propondo alternativas sustentáveis."
    ],
    "fazerSuggestions": [
      "Criar um aplicativo, site, jogo, bot ou ferramenta digital simples, com utilidade prática.",
      "Desenvolver um projeto de automação, robótica ou IoT, aplicando sensores, motores ou componentes eletrônicos.",
      "Organizar uma campanha educativa sobre segurança digital, privacidade, respeito e cidadania online.",
      "Criar um tutorial, guia ou série de dicas sobre o uso responsável, produtivo ou seguro da tecnologia.",
      "Conduzir um mapeamento de oportunidades de inclusão digital e propor soluções viáveis para sua comunidade.",
      "Organizar uma oficina de alfabetização digital, robótica ou programação para jovens ou adultos.",
      "Criar um protótipo sustentável usando materiais reutilizados e componentes eletrônicos simples.",
      "Construir um website ou banco de dados básico para uma UEL ou projeto comunitário.",
      "Desenvolver um painel de segurança digital com recomendações para sua UEL, escola ou universidade.",
      "Criar um mini laboratório de experimentação tecnológica na UEL."
    ],
    "compartilharSuggestions": [
      "Apresentar seu projeto, protótipo ou análise para a seção, escola, universidade ou comunidade.",
      "Produzir conteúdo acessível (vídeos, posts, podcasts) sobre segurança, inovação ou cidadania digital.",
      "Facilitar uma roda de conversa, oficina ou minicurso sobre temas tecnológicos.",
      "Ajudar outros jovens a criar projetos, programar, montar robôs ou aplicar segurança digital no cotidiano.",
      "Criar e divulgar um guia de boas práticas digitais.",
      "Disponibilizar seu projeto como open-source ou documentar o código para que outros possam reutilizar.",
      "Apoiar adultos e idosos em oficinas de inclusão digital.",
      "Participar de eventos de tecnologia, feiras, semanas digitais ou maratonas de inovação compartilhando sua experiência.",
      "Construir uma \"Semana da Tecnologia e Segurança Digital\" na UEL."
    ]
  },
  {
    "id": "viagens",
    "name": "Viagens",
    "eixoId": "habilidades-para-a-vida",
    "description": "Viajar é aprender com o mundo. Cada deslocamento permite conhecer culturas, pessoas, histórias e modos de vida diversos. Nesta especialidade você será convidado a planejar viagens e viver cada experiência com entusiasmo. Viajar é ampliar horizontes e refletir sobre o próprio lugar no mundo.",
    "conhecerSuggestions": [
      "Pesquisar destinos, culturas, hábitos e práticas responsáveis de viagem.",
      "Assistir documentários ou ler relatos de viajantes, exploradores, missionários, mochileiros e escoteiros.",
      "Participar de rodas de conversa, entrevistas ou bate-papos com jovens que viveram viagens, intercâmbios ou grandes eventos escoteiros.",
      "Planejar uma viagem com roteiro, orçamento, cronograma, alternativas de transporte e cuidados essenciais.",
      "Pesquisar práticas de turismo sustentável e comunitário em diferentes regiões.",
      "Estudar noções básicas de geografia cultural, localização, mapas, fuso horário e clima.",
      "Analisar riscos e elaborar uma lista de cuidados ou protocolo de segurança para viagens.",
      "Pesquisar iniciativas de acomodações solidárias, voluntariado internacional e viagens de interesse."
    ],
    "fazerSuggestions": [
      "Realizar uma viagem, expedição local ou saída com objetivo cultural, histórico, ambiental ou escoteiro.",
      "Organizar ou participar de uma atividade de preparação para eventos escoteiros regionais, nacionais ou internacionais.",
      "Elaborar um roteiro de viagem responsável e acessível para um grupo de pessoas, incluindo logística, riscos e alternativas sustentáveis.",
      "Criar um diário de bordo, blog, vídeo ou série fotográfica narrando uma experiência de viagem.",
      "Desenvolver uma proposta de intercâmbio cultural, visita ou rota de exploração para a seção ou UEL.",
      "Realizar uma \"viagem de um dia\" com objetivo definido: rota cultural, trilha histórica, circuito gastronômico, visita guiada.",
      "Criar uma simulação de viagem internacional incluindo câmbio, documentação, roteiros, orçamento e planejamento.",
      "Organizar um evento temático na UEL (ex.: \"Noite de Países\", \"Festival Cultural\").",
      "Elaborar um mapa digital ou guia de viagem com sugestões."
    ],
    "compartilharSuggestions": [
      "Apresentar sua viagem, expedição ou projeto para a seção, escola, universidade ou comunidade.",
      "Conduzir uma oficina prática sobre como planejar viagens.",
      "Criar um mapa interativo, painel visual, guia de viagem escoteira ou rota cultural para inspirar outros jovens.",
      "Compartilhar reflexões sobre aprendizados, desafios e descobertas vividas ou sonhadas.",
      "Estimular a participação de colegas em eventos escoteiros regionais, nacionais ou internacionais.",
      "Criar um mini-documentário ou série de vídeos sobre a experiência de viajar.",
      "Organizar uma roda de conversa com jovens que já viajaram ou desejam viajar.",
      "Disponibilizar um kit ou checklist de viagem.",
      "Contribuir com relatos para materiais escoteiros, blogs do grupo ou redes juvenis globais."
    ]
  },
  {
    "id": "agricultura-sustentavel",
    "name": "Agricultura Sustentável",
    "eixoId": "meio-ambiente",
    "description": "Esta especialidade convida você a aprender, pela prática, como produzir alimentos de forma responsável e em harmonia com o ambiente. Você vai conhecer técnicas de cultivo que respeitam os ciclos naturais, valorizar saberes tradicionais e entender como a agricultura pode fortalecer comunidades, preservar a biodiversidade e regenerar o solo. É uma oportunidade de experimentar modelos de produção sustentáveis, desenvolver consciência ecológica e construir uma relação mais profunda com a terra.",
    "conhecerSuggestions": [
      "Participar de oficinas, mutirões agroecológicos, feiras rurais, visitas guiadas ou cursos de cultivo sustentável.",
      "Visitar hortas comunitárias, cooperativas, assentamentos, quintais produtivos ou propriedades que praticam manejo ecológico.",
      "Entrevistar agricultores familiares, guardiões de sementes, extensionistas rurais, agroecólogos, permacultores ou povos tradicionais.",
      "Pesquisar modelos de agricultura urbana, agroflorestas, práticas ancestrais de cultivo ou tecnologias sustentáveis.",
      "Observar e registrar um ciclo completo de plantio, manejo e colheita, identificando fatores que influenciam seu desenvolvimento.",
      "Validar experiências prévias em hortas escolares, projetos ambientais, oficinas ou especialidades relacionadas.",
      "Pesquisar os impactos do uso de agrotóxicos e alternativas de manejo ecológico.",
      "Estudar o papel das abelhas e polinizadores na produção de alimentos e na biodiversidade.",
      "Investigar práticas de regeneração do solo, como adubação verde e manejo de matéria orgânica."
    ],
    "fazerSuggestions": [
      "Implantar ou revitalizar uma horta comunitária, escolar ou doméstica, integrando princípios de sustentabilidade.",
      "Criar e gerenciar um sistema de compostagem (doméstico, comunitário, minhocário ou compostagem acelerada).",
      "Produzir um manual, guia prático ou conteúdo ilustrado sobre técnicas sustentáveis de agricultura urbana.",
      "Cultivar uma parcela de PANCs, promovendo seu valor nutricional, cultural e culinário.",
      "Colaborar em ações de agricultura regenerativa, sistemas agroflorestais ou projetos de permacultura.",
      "Organizar oficinas ou workshops sobre alimentação saudável, compostagem, riscos dos pesticidas ou aproveitamento integral.",
      "Implementar um sistema de captação de água da chuva para rega da horta.",
      "Criar uma horta mandala, espiral de ervas ou canteiro elevado com materiais reaproveitados.",
      "Fazer um diagnóstico do solo (textura, cor, drenagem) e aplicar correções naturais.",
      "Desenvolver um pequeno projeto de agricultura solidária, doando parte da produção para a comunidade."
    ],
    "compartilharSuggestions": [
      "Realizar uma feira, exposição ou degustação com alimentos cultivados e práticas adotadas no projeto.",
      "Criar vídeos, cartilhas, tutoriais, fotos processuais ou sequências de stories ensinando técnicas sustentáveis.",
      "Organizar uma oficina de cultivo, compostagem, PANCs ou horta urbana para jovens, escolas, universidades ou comunidade.",
      "Participar de rodas de conversa sobre segurança alimentar, soberania alimentar, agroecologia ou produção local.",
      "Apoiar colegas a iniciarem seus próprios projetos de agricultura sustentável, atuando como orientador.",
      "Criar um banco comunitário de sementes e mudas.",
      "Produzir um documentário curto ou diário visual sobre o ciclo da horta.",
      "Registrar metodologias e aprendizados, deixando um legado replicável para a UEL ou comunidade.",
      "Contribuir para ações de alimentação solidária ou hortas urbanas coletivas do bairro."
    ]
  },
  {
    "id": "ecoturismo",
    "name": "Ecoturismo",
    "eixoId": "meio-ambiente",
    "description": "O ecoturismo propõe vivências em trilhas, rios, montanhas e outros ambientes naturais de forma responsável. Nesta especialidade, você vai aprender a planejar e realizar atividades ao ar livre minimizando impactos e respeitando os limites ambientais de cada território. É uma oportunidade de desenvolver conhecimentos sobre conservação e turismo responsável, compreendendo que cada visita deve deixar mais conhecimento do que pegadas.",
    "conhecerSuggestions": [
      "Visitar uma unidade de conservação, parque natural ou área protegida com orientação técnica.",
      "Entrevistar guias de ecoturismo, condutores ambientais, brigadistas, guardas-parques ou lideranças comunitárias.",
      "Participar de uma trilha guiada com interpretação ambiental, oficina de turismo de base comunitária ou caminhada educativa.",
      "Pesquisar sobre princípios do ecoturismo e comparar práticas sustentáveis com o turismo convencional.",
      "Observar a infraestrutura, sinalização e conduta ambiental de um atrativo turístico local, registrando boas práticas e problemas.",
      "Estudar a fauna e flora típicas do bioma da sua região, identificando espécies sensíveis ao turismo.",
      "Pesquisar vivências e impactos de grandes trilhas nacionais (como Caminho da Fé, Caminhos da Serra do Mar, etc.).",
      "Investigar ferramentas de navegação e segurança (apps, mapas, bússola, rastreadores).",
      "Analisar relatos de acidentes ou incidentes em trilhas para compreender riscos e prevenção."
    ],
    "fazerSuggestions": [
      "Planejar e realizar uma trilha, expedição local ou passeio ecológico aplicando práticas de mínimo impacto.",
      "Criar um roteiro ecoturístico interpretativo para sua cidade, seção, escola, universidade ou comunidade.",
      "Produzir um guia prático de condutas sustentáveis para jovens em atividades ao ar livre.",
      "Desenvolver uma campanha de valorização de uma área natural local, incentivando a conservação.",
      "Colaborar em ações de limpeza, manejo ou conservação em áreas naturais afetadas pelo turismo.",
      "Apoiar um projeto de turismo de base comunitária, contribuindo com divulgação, mapeamento ou operação.",
      "Criar placas educativas, mapas ou trilhas interpretativas (físicas ou digitais).",
      "Implementar práticas sustentáveis em atividades escoteiras (gestão de resíduos, alimentação local, logística verde).",
      "Liderar uma atividade de observação de fauna, fotografia de natureza ou outra.",
      "Elaborar um plano de gestão de riscos para trilhas ou visitas naturais."
    ],
    "compartilharSuggestions": [
      "Apresentar seu projeto, roteiro ou experiência de campo para a seção, escola, universidade ou comunidade.",
      "Produzir vídeos, cartilhas, infográficos, e-books ou posts sobre práticas sustentáveis de visitação.",
      "Criar um conteúdo comparando turismo convencional x ecoturismo, ressaltando impactos e alternativas.",
      "Conduzir uma oficina prática sobre mínimo impacto, conduta consciente, escolha de equipamentos ou ética ambiental.",
      "Registrar a experiência nas redes sociais, incentivando outros jovens a viajar de modo responsável.",
      "Organizar uma rota cultural ou caminhada educativa com foco em patrimônio natural.",
      "Criar um painel visual ou mapa colaborativo de áreas naturais preservadas da região.",
      "Acompanhar jovens iniciantes em suas primeiras trilhas, atuando como orientador em práticas sustentáveis.",
      "Documentar metodologias, aprendizados e recomendações em um guia replicável."
    ]
  },
  {
    "id": "educacao-ambiental",
    "name": "Educação Ambiental",
    "eixoId": "meio-ambiente",
    "description": "A Educação Ambiental é uma ferramenta para compreender como nossas ações transformam o meio ambiente e como podemos atuar para proteger o planeta. Nesta especialidade, você vai estudar os principais desafios socioambientais da atualidade e descobrir caminhos para agir de forma responsável. É uma oportunidade de desenvolver projetos de mobilização e inspirar outras pessoas a defender um futuro mais equilibrado, justo e sustentável.",
    "conhecerSuggestions": [
      "Participar de palestras, rodas de conversa, oficinas ou cursos sobre meio ambiente e justiça climática.",
      "Visitar unidades de conservação, museus, ONGs, centros de triagem de resíduos, cooperativas ou hortas urbanas.",
      "Entrevistar educadores ambientais, lideranças comunitárias, ativistas, pesquisadores ou gestores públicos.",
      "Acompanhar um projeto de mobilização ambiental (local, regional ou digital) e analisar seus impactos.",
      "Pesquisar políticas públicas ambientais, ODS, acordos internacionais e o papel da juventude.",
      "Validar experiências anteriores em projetos ambientais, especialidades correlatas ou iniciativas comunitárias.",
      "Estudar um bioma brasileiro, seus ciclos ecológicos, espécies sensíveis e desafios ambientais.",
      "Analisar campanhas ambientais já existentes para entender estratégias e impactos.",
      "Investigar dados sobre qualidade do ar, da água ou resíduos em sua região, utilizando fontes confiáveis.",
      "Pesquisar impactos da crise climática em populações vulneráveis (periferias, povos originários, crianças)."
    ],
    "fazerSuggestions": [
      "Criar uma campanha educativa sobre resíduos, energia, água, mudanças climáticas ou consumo consciente.",
      "Desenvolver um projeto de Educação Ambiental em parceria com escola, universidade, comunidade, UEL ou ONG local.",
      "Conduzir trilhas interpretativas, jogos, oficinas ou vivências ambientais com outros jovens ou crianças.",
      "Produzir materiais educativos como vídeos, podcasts, HQs, cartilhas ou exposições sensoriais/visuais.",
      "Planejar e realizar uma atividade de campo com coleta de dados e interpretação ambiental.",
      "Promover uma ação de limpeza, revitalização ou conservação com foco educativo e registro de impactos.",
      "Criar um diagnóstico ambiental da escola, da comunidade ou da UEL e sugerir melhorias.",
      "Desenvolver um plano de redução de resíduos ou de consumo de água na UEL ou em casa.",
      "Implementar um experimento científico (qualidade da água, permeabilidade do solo, compostagem acelerada).",
      "Articular uma rede juvenil para mobilizar ações ambientais contínuas."
    ],
    "compartilharSuggestions": [
      "Apresentar resultados, registros e reflexões do projeto para a seção, escola, universidade ou comunidade.",
      "Facilitar uma oficina, roda de conversa ou vivência sobre o tema estudado.",
      "Registrar a experiência em redes sociais, plataformas de especialidades, blog ou site.",
      "Elaborar um relatório reflexivo destacando impactos, dificuldades e propostas para continuidade.",
      "Orientar outro jovem no desenvolvimento de uma ação ambiental.",
      "Criar um banco de ideias ambientais para sua UEL ou comunidade.",
      "Produzir um mini-documentário ambiental ou diário visual do projeto.",
      "Criar um painel ou mural comunitário com dados, mapas e conquistas ambientais.",
      "Apresentar o projeto em eventos, feiras socioambientais ou fóruns comunitários."
    ]
  },
  {
    "id": "esportes-de-aventura",
    "name": "Esportes de Aventura",
    "eixoId": "meio-ambiente",
    "description": "Os esportes de aventura convidam você a explorar trilhas, rios, montanhas e ambientes desafiadores com técnica e segurança. Nesta especialidade você vai vivenciar atividades como trilhas, escalada, rapel, canoagem e outras práticas ao ar livre, desenvolvendo sua autoconfiança e capacidade de tomada de decisão em situações reais. Além da busca por adrenalina é uma oportunidade de conhecer seus limites e valorizar os espaços naturais que tornam essas experiências possíveis.",
    "conhecerSuggestions": [
      "Participar de oficina, treinamento, vivência prática ou curso introdutório com instrutores qualificados.",
      "Realizar entrevistas com praticantes, atletas, guias especializados, grupos de resgate ou profissionais de parques.",
      "Visitar um centro de esportes de aventura, parque de ecoturismo ou complexo de atividades verticais.",
      "Participar de formação em segurança ao ar livre, primeiros socorros ou prevenção de acidentes.",
      "Pesquisar sobre práticas sustentáveis, protocolos de segurança e legislações específicas.",
      "Validar aprendizados prévios em especialidades como campismo, técnicas verticais, canoagem etc.",
      "Estudar o clima e o relevo da sua região e como influenciam esportes de aventura.",
      "Analisar equipamentos de segurança (EPIs), entendendo suas funções, revisões e cuidados.",
      "Pesquisar casos reais de incidentes e como poderiam ter sido evitados.",
      "Realizar um estudo comparativo entre modalidades de aventura e seus níveis de risco."
    ],
    "fazerSuggestions": [
      "Planejar e realizar uma atividade escoteira de aventura com cuidados ambientais, logísticos e de segurança.",
      "Produzir um guia, vídeo, artigo ou material visual sobre uma modalidade, incluindo orientações de segurança.",
      "Criar ou mapear uma trilha interpretativa, percurso de aventura ou mini-expedição local.",
      "Colaborar com a organização de um desafio ou competição entre patrulhas envolvendo modalidades de aventura.",
      "Implementar melhorias de segurança, sinalização ou mínimo impacto em trilhas ou áreas utilizadas pela Unidade Escoteira Local.",
      "Realizar (com supervisão competente) uma prática específica da modalidade escolhida.",
      "Desenvolver um manual de equipamentos e checklist de segurança para atividades externas.",
      "Criar uma solução para problemas comuns em trilhas (pontos de erosão, lixo, água etc.).",
      "Organizar uma mini expedição com pernoite, aplicando navegação e gestão de riscos.",
      "Propor melhorias no plano de atividades de aventura da Unidade Escoteira Local."
    ],
    "compartilharSuggestions": [
      "Apresentar seu projeto, relato ou experiência para a seção, UEL ou comunidade.",
      "Promover uma oficina prática, palestra demonstrativa ou vivência sobre a modalidade estudada.",
      "Criar conteúdo audiovisual (vídeos, fotos, reels, podcasts) incentivando práticas seguras e sustentáveis.",
      "Escrever um relato ou artigo para plataforma de especialidades, site da UEL ou boletins locais.",
      "Ajudar outros jovens interessados a iniciar nos esportes de aventura.",
      "Criar um mural, mapa ou guia local com trilhas e áreas seguras para práticas de esportes de aventura.",
      "Acompanhar jovens iniciantes durante suas primeiras práticas, atuando como facilitador.",
      "Produzir um \"diário de campo\" com aprendizados, desafios e reflexões.",
      "Construir uma campanha educativa sobre responsabilidade ambiental em áreas de aventura."
    ]
  },
  {
    "id": "habilidades-escoteiras",
    "name": "Habilidades Escoteiras",
    "eixoId": "meio-ambiente",
    "description": "As habilidades escoteiras reúnem conhecimentos essenciais para vivenciar atividades junto ao ar livre. Nesta especialidade você vai aprender a montar acampamentos funcionais, manusear ferramentas, construir estruturas úteis, preparar refeições em campo, orientar-se em ambientes naturais e lidar com situações de risco. O objetivo é desenvolver domínio técnico e a capacidade de planejar e executar ações que tornam as atividades escoteiras mais bem organizadas.",
    "conhecerSuggestions": [
      "Participar de oficinas práticas conduzidas por escotistas, especialistas, trilheiros, instrutores ou profissionais da área.",
      "Observar pioneirias, estruturas, fogos, acampamentos e técnicas utilizadas em atividades anteriores, identificando melhorias.",
      "Realizar entrevistas ou pesquisas com praticantes de bushcraft, campismo avançado, técnicas mateiras ou escotistas experientes.",
      "Estudar referências clássicas do escotismo e adaptações modernas das técnicas para segurança e sustentabilidade.",
      "Testar diferentes formas de acendimento de fogo em condições variadas (úmido, vento, pouco material).",
      "Pesquisar sobre normas de segurança no uso de ferramentas cortantes e compará-las com práticas escoteiras.",
      "Analisar diferentes modelos de abrigos, fogueiras, cozinhas e pioneirias, identificando usos e limitações.",
      "Estudar técnicas de navegação noturna, leitura de céu e orientação por marcos naturais."
    ],
    "fazerSuggestions": [
      "Orientar jovens de outras seções na construção de uma pioneiria segura e funcional durante um acampamento.",
      "Preparar uma refeição completa utilizando técnicas de cozinha mateira, documentando o processo.",
      "Criar um acampamento modelo com foco em sustentabilidade, mínimo impacto e organização eficiente.",
      "Conduzir uma atividade de orientação com mapa e bússola em campo aberto, incluindo checagem de segurança.",
      "Elaborar um plano de primeiros socorros para ambientes remotos e simular um cenário realista com tomada de decisão.",
      "Planejar e executar um projeto de pioneiria de grande porte com cálculos e croquis.",
      "Criar um manual prático ou kit de referência sobre técnicas escoteiras sustentáveis para jovens.",
      "Desenvolver um sistema de iluminação natural e segura para acampamentos (pontos de luz, lanternas artesanais).",
      "Construir abrigos naturais ou estruturais e avaliar resistência, drenagem e conforto.",
      "Realizar uma expedição com navegação, cozinha mateira e pernoite.",
      "Criar um protocolo interno de segurança para ferramentas, fogueiras e construção de estruturas."
    ],
    "compartilharSuggestions": [
      "Apresentar o projeto e os resultados na seção ou UEL, explicando escolhas técnicas.",
      "Conduzir oficinas ou treinos práticos demonstrando habilidades específicas (nós, fogo, cozinha, ferramentas).",
      "Criar vídeos, tutoriais, infográficos, cartões de habilidade ou manuais colaborativos.",
      "Documentar a experiência em blogs, plataformas escoteiras ou redes sociais com foco educativo.",
      "Acompanhar jovens iniciantes na aquisição de habilidades escoteiras básicas e avançadas.",
      "Criar uma \"trilha de habilidades\" para jovens da UEL, com desafios progressivos.",
      "Produzir um mapa ou guia de técnicas mateiras.",
      "Deixar como legado uma pioneiria funcional, um kit educativo ou uma metodologia replicável."
    ]
  },
  {
    "id": "natureza-e-ciencias-naturais",
    "name": "Natureza e Ciências Naturais",
    "eixoId": "meio-ambiente",
    "description": "Observar a natureza com curiosidade é o primeiro passo para aprender a protegê-la. Nesta especialidade você vai explorar o comportamento dos animais, o funcionamento das plantas, as reações químicas, as leis físicas e os ciclos que sustentam a vida, tudo a partir da observação direta e do uso do pensamento científico. O objetivo é desenvolver um olhar investigativo e a compreensão dos processos naturais, percebendo como cada elemento do meio ambiente está conectado aos demais.",
    "conhecerSuggestions": [
      "Participar de visita técnica a parques, reservas, museus, centros de pesquisa ou jardins botânicos.",
      "Realizar entrevistas com biólogos, geógrafos, naturalistas, pesquisadores ou educadores ambientais.",
      "Participar de projetos de ciência cidadã: observação de aves, insetos, meteorologia, qualidade da água, estrelas etc.",
      "Desenvolver um diário de campo com registros sistemáticos de fauna, flora, meteorologia ou ciclos naturais.",
      "Participar de oficinas, minicursos, feiras científicas ou atividades universitárias abertas.",
      "Aprender sobre enriquecimento ambiental aplicado em centros de recuperação de fauna silvestre.",
      "Mapear espécies-chave do seu bioma e estudar seu papel ecológico.",
      "Analisar fenômenos naturais (chuvas, ventos, neblina, pontos de orvalho) e seus padrões.",
      "Pesquisar aplicativos e ferramentas digitais para identificação de espécies e coleta de dados.",
      "Estudar os impactos das mudanças climáticas na sua comunidade (temperatura, chuva, fauna, flora)."
    ],
    "fazerSuggestions": [
      "Criar uma trilha interpretativa mostrando aspectos científicos, ecológicos e culturais da região.",
      "Produzir um documentário, curta, podcast ou série fotográfica sobre um fenômeno natural ou ecossistema local.",
      "Produzir um herbário, coleção botânica, coleção de rochas/minerais ou catálogo fotográfico de espécies observadas.",
      "Colaborar em um projeto de restauração de área degradada ou monitoramento ambiental de longo prazo.",
      "Planejar e executar um projeto de enriquecimento ambiental para fauna silvestre (avaliado por responsável técnico).",
      "Atuar como voluntário em campanhas de conservação, mutirões de reflorestamento ou resgates ambientais.",
      "Desenvolver uma pesquisa (pH da água, temperatura do solo, dispersão de sementes).",
      "Criar um mapa de biodiversidade de um parque ou ambiente natural da sua região.",
      "Construir um protótipo educativo (pluviômetro, abrigo para polinizadores, estação meteorológica simples).",
      "Realizar uma expedição investigativa com foco em observação sistemática e coleta de dados."
    ],
    "compartilharSuggestions": [
      "Apresentar os resultados da investigação para a seção, escola, universidade, comunidade ou outros.",
      "Produzir conteúdos educativos (vídeos, posts, artigos, infográficos) para redes sociais ou blogs locais.",
      "Conduzir uma oficina prática ou roda de conversa sobre biodiversidade, fenômenos naturais ou ciência cidadã.",
      "Apoiar outros jovens na realização de trilhas, observações, coleções e práticas científicas.",
      "Produzir materiais como cartilhas, painéis, exposições ou mapas interpretativos.",
      "Criar um acervo digital com registros coletados.",
      "Organizar um \"dia da natureza\" na UEL com exposições e vivências científicas.",
      "Apoiar escolas ou comunidades na criação de mini projetos de monitoramento ambiental.",
      "Publicar o projeto em plataformas de ciência cidadã ou eventos de educação ambiental."
    ]
  },
  {
    "id": "sustentabilidade",
    "name": "Sustentabilidade",
    "eixoId": "meio-ambiente",
    "description": "A sustentabilidade envolve compreender como nossas escolhas influenciam o planeta, as comunidades e nosso próprio futuro. Nesta especialidade você será convidado a refletir sobre o impacto das ações humanas e analisar alternativas viáveis. O foco está em identificar mudanças possíveis e criar soluções sustentáveis. Trata-se de equilibrar cuidado ambiental e inovação, construindo caminhos para um futuro mais justo e regenerativo.",
    "conhecerSuggestions": [
      "Participar de oficina, minicurso, live, debate ou roda de conversa sobre sustentabilidade e inovação verde.",
      "Visitar cooperativas, ecopontos, ONGs, empreendimentos sustentáveis, projetos de energia limpa ou iniciativas de economia solidária.",
      "Pesquisar sobre os ODS e analisar como eles se conectam com desafios da sua escola, universidade, bairro ou Unidade Escoteira Local.",
      "Entrevistar educadores ambientais, empreendedores sociais, ativistas, pesquisadores ou gestores públicos.",
      "Validar experiências anteriores em especialidades correlatas ou projetos com foco ambiental/social.",
      "Analisar a pegada ecológica pessoal e comparar resultados com a média nacional/mundial.",
      "Pesquisar boas práticas de sustentabilidade adotadas por cidades-modelo no Brasil e no mundo.",
      "Investigar tecnologias sustentáveis (fogões solares, composteiras, captação de chuva).",
      "Estudar casos de injustiça ambiental e compreender seus determinantes sociais."
    ],
    "fazerSuggestions": [
      "Criar uma campanha de conscientização sobre lixo zero, energia limpa, consumo responsável ou água.",
      "Reduzir a própria pegada ecológica em um ou mais aspectos (energia, resíduos, mobilidade, alimentação) com registro do processo.",
      "Implantar uma prática sustentável na comunidade, escola, universidade ou UEL (compostagem, coleta seletiva estruturada, economia de água, ponto de reparos, banco de trocas etc.).",
      "Produzir conteúdo educativo: vídeos, infográficos, podcasts, cartilhas — apresentando conceitos e soluções.",
      "Desenvolver um projeto envolvendo inovação verde ou economia circular (utensílios reutilizáveis, hortas, compostagem, upcycling).",
      "Criar uma solução de baixo custo para reduzir resíduos ou consumo de energia.",
      "Organizar um \"dia sem lixo\", feiras de trocas, mutirões ou ações coletivas de sustentabilidade.",
      "Montar uma composteira funcional com registro dos resultados ao longo de semanas.",
      "Implementar um diagnóstico de sustentabilidade da UEL (resíduos, água, energia, transporte)."
    ],
    "compartilharSuggestions": [
      "Apresentar os resultados e impactos para a seção, escola, universidade, comunidade ou eventos juvenis.",
      "Conduzir oficinas, rodas de conversa ou dinâmicas sobre sustentabilidade e mudança de hábitos.",
      "Registrar a experiência em blogs, jornais locais, plataformas escoteiras ou redes sociais.",
      "Acompanhar colegas ou grupos no processo de replicar a prática sustentável implementada.",
      "Criar materiais didáticos replicáveis, como guias rápidos, vídeos curtos ou outros.",
      "Criar uma \"trilha de sustentabilidade\" com desafios progressivos para sua UEL.",
      "Produzir uma exposição ou painel visual com dados, fotos e reflexões sobre o projeto.",
      "Estabelecer uma parceria com organizações locais para ampliar o impacto da ação."
    ]
  },
  {
    "id": "acoes-humanitarias",
    "name": "Ações Humanitárias",
    "eixoId": "paz-e-desenvolvimento",
    "description": "A ação humanitária busca proteger a vida e aliviar o sofrimento de pessoas em situação de vulnerabilidade. Nesta especialidade, você vai conhecer princípios como humanidade, imparcialidade e neutralidade, compreender direitos humanos e aprender a agir de forma ética e responsável em contextos de crise. É uma oportunidade para desenvolver a capacidade de mobilização e compromisso com o bem-estar coletivo.",
    "conhecerSuggestions": [
      "Participar de formações, encontros, oficinas ou rodas de conversa sobre ação humanitária, riscos e proteção.",
      "Realizar entrevistas com profissionais, voluntários ou lideranças comunitárias atuantes em organizações humanitárias.",
      "Visitar abrigos, centros de acolhida, cozinhas solidárias, bancos de alimentos ou pontos de apoio emergencial.",
      "Pesquisar os princípios humanitários, direitos humanos, ética do cuidado e códigos de conduta internacionais.",
      "Estudar experiências brasileiras e internacionais de solidariedade e resposta a crises.",
      "Analisar como os jovens atuam em redes humanitárias, no Brasil e no mundo.",
      "Pesquisar causas estruturais de vulnerabilidade (racismo ambiental, desigualdade, acesso a direitos).",
      "Estudar como a comunicação responsável é essencial em emergências (evitar boatos, orientar corretamente).",
      "Conhecer boas práticas de segurança e autocuidado para voluntários."
    ],
    "fazerSuggestions": [
      "Organizar uma campanha de arrecadação baseada na dignidade (kits de higiene, limpeza, roupas adequadas, itens necessários).",
      "Apoiar de forma logística ou afetiva ações de acolhimento a pessoas em situação de risco ou vulnerabilidade.",
      "Produzir materiais educativos sobre ações responsáveis (como doar, como ajudar, como não expor pessoas).",
      "Colaborar com organizações locais em mutirões ou iniciativas de cuidado (montagem de kits, organização de estoques, apoio comunitário).",
      "Criar um plano de contingência para sua comunidade ou UEL, com rotas seguras, contatos úteis e procedimentos básicos.",
      "Desenvolver uma ação de mobilização sobre direitos humanos em situações de crise.",
      "Organizar campanhas de prevenção (enchentes, inverno, ondas de calor, saúde).",
      "Criar um guia de acolhimento juvenil para pessoas recém-chegadas (refugiadas, migrantes, deslocadas).",
      "Contribuir em ações de mapeamento comunitário para identificar grupos vulneráveis."
    ],
    "compartilharSuggestions": [
      "Relatar sua experiência em reunião de seção, ação comunitária ou redes sociais.",
      "Criar uma exposição, mural, vídeo ou minidocumentário sobre o projeto e o que foi aprendido.",
      "Conduzir rodas de conversa sobre responsabilidade afetiva, empatia, direitos e cuidado.",
      "Apoiar outros jovens a desenvolverem ações humanitárias responsáveis.",
      "Participar de redes, plataformas ou espaços de juventude engajada em solidariedade.",
      "Produzir materiais replicáveis (cartilhas, dicas rápidas, guias de doação responsável).",
      "Criar uma rede interna de mobilização para emergências na UEL.",
      "Registrar aprendizados e recomendações para continuidade do projeto ao longo do ano."
    ]
  },
  {
    "id": "ciencias-humanas",
    "name": "Ciências Humanas",
    "eixoId": "paz-e-desenvolvimento",
    "description": "As Ciências Humanas oferecem ferramentas para compreender como as sociedades se organizam e se transformam ao longo do tempo. Nesta especialidade você vai explorar temas como história, geografia humana, cultura, política, ética e comportamento social, exercitando o pensamento crítico e a capacidade de analisar diferentes pontos de vista. O objetivo é ampliar sua compreensão sobre o mundo e reconhecer a diversidade humana.",
    "conhecerSuggestions": [
      "Pesquisar temas históricos, culturais, sociais, filosóficos ou políticos de interesse pessoal.",
      "Participar de eventos, rodas de conversa, visitas a museus, centros culturais, memoriais ou arquivos públicos.",
      "Realizar entrevistas com pessoas que vivenciaram marcos históricos, práticas culturais ou movimentos sociais.",
      "Observar fenômenos sociais do cotidiano com olhar crítico e investigativo.",
      "Refletir sobre relações entre cultura, espaço, tempo, poder e sociedade na sua realidade local.",
      "Validar experiências anteriores em projetos escolares, universitários, comunitários ou culturais.",
      "Analisar discursos públicos, notícias ou campanhas e identificar relações de poder e construção de narrativa.",
      "Mapear manifestações culturais da sua região (festas, culinária, músicas, saberes tradicionais).",
      "Pesquisar sobre movimentos juvenis e sua contribuição para transformações sociais.",
      "Estudar teorias básicas das ciências humanas (ex.: contrato social, espaço geográfico, cultura, direitos)."
    ],
    "fazerSuggestions": [
      "Produzir um documentário, curta, artigo, podcast, ensaio fotográfico ou vídeo sobre tema social, cultural ou histórico.",
      "Desenvolver um projeto de valorização da memória local, cultura tradicional ou patrimônio da comunidade.",
      "Organizar uma exposição, roda de conversa, debate guiado ou painel reflexivo sobre tema das ciências humanas.",
      "Criar um mapa mental, linha do tempo, mapa temático ou recurso didático sobre fenômenos sociais.",
      "Investigar uma problemática local com ferramentas das ciências humanas (entrevistas, observação, registros).",
      "Desenvolver um dossiê sobre manifestações culturais ameaçadas ou pouco reconhecidas.",
      "Criar um guia de leitura crítica da mídia para jovens da UEL.",
      "Elaborar um projeto de intervenção cultural ou educativa na UEL, escola, universidade ou bairro.",
      "Realizar uma pesquisa de campo simples (percepção de segurança, mobilidade, espaços públicos, hábitos culturais)."
    ],
    "compartilharSuggestions": [
      "Apresentar o projeto para a seção, escola, universidade, comunidade ou evento cultural.",
      "Criar conteúdo acessível (vídeo, card, texto, infográfico) para redes sociais, blogs ou plataformas educativas.",
      "Conduzir roda de conversa, quiz, dinâmica ou debate mediado sobre temas das ciências humanas.",
      "Deixar como legado exposição, mural, linha do tempo, catálogo cultural ou material educativo.",
      "Produzir uma \"caixa de memórias\" ou acervo digital com registros de histórias, costumes e tradições.",
      "Organizar um cine-debate com tema social ou filosófico.",
      "Criar uma trilha de estudos e indicações de filmes, livros, músicas e podcasts.",
      "Facilitar um encontro intergeracional entre jovens e pessoas idosas da comunidade."
    ]
  },
  {
    "id": "cultura-e-arte",
    "name": "Cultura e Arte",
    "eixoId": "paz-e-desenvolvimento",
    "description": "Cultura e arte são expressões vivas da identidade de cada povo e revelam como grupos humanos pensam, sentem e se relacionam com o mundo. Nesta especialidade, você vai conhecer músicas, danças, narrativas, saberes tradicionais, artes visuais, modos de vida e outras manifestações que mostram como as culturas se transformam e se conectam. O foco é reconhecer a diversidade e valorizar a criatividade humana.",
    "conhecerSuggestions": [
      "Participar de workshops, oficinas, rodas culturais ou vivências artísticas com especialistas.",
      "Realizar atividades práticas orientadas por artistas, artesãos, mestres de cultura ou pessoas com saber tradicional.",
      "Entrevistar artistas locais, griôs, líderes culturais, professores, pesquisadores ou contadores de histórias.",
      "Visitar museus, centros culturais, casas de memória, ateliês, comunidades tradicionais ou festivais.",
      "Participar de debates, cineclubes, saraus ou rodas de conversa sobre cultura e arte.",
      "Pesquisar a história e os significados de uma manifestação cultural regional.",
      "Analisar como diferentes culturas representam temas semelhantes (como família, trabalho, natureza).",
      "Investigar o impacto da tecnologia nas expressões artísticas contemporâneas.",
      "Estudar a relação entre cultura, identidade, território e pertencimento."
    ],
    "fazerSuggestions": [
      "Organizar um festival cultural, feira, sarau, roda de danças, mostra de cinema ou evento temático.",
      "Criar um documentário, curta, podcast, série fotográfica ou vídeo sobre uma manifestação cultural.",
      "Promover oficinas de arte para a comunidade ou para outras seções do grupo.",
      "Realizar uma exposição (física ou virtual) de artes visuais, fotografias, artesanato ou histórias locais.",
      "Criar um blog, zine, jornal, catálogo ou revista cultural com produções próprias ou pesquisas.",
      "Produzir peças de artesanato, obras artísticas ou recriações inspiradas em tradições culturais.",
      "Apresentar uma performance teatral, musical ou de dança em sua comunidade ou UEL.",
      "Desenvolver um projeto de registro e preservação de memória cultural da sua região.",
      "Construir uma narrativa artística (instalação, performance, vídeo) sobre um tema social.",
      "Produzir uma coletânea com histórias, fotos e entrevistas coletadas no processo investigativo."
    ],
    "compartilharSuggestions": [
      "Apresentar à seção, escola, universidade ou comunidade o projeto realizado, com reflexões e aprendizados.",
      "Conduzir oficinas, rodas de conversa ou vivências culturais para outros jovens.",
      "Divulgar a ação em redes sociais, plataformas de arte e cultura ou eventos locais.",
      "Orientar outros jovens na conquista dessa especialidade ou no desenvolvimento de projetos culturais.",
      "Criar uma mostra colaborativa com produções de vários jovens da UEL.",
      "Registrar e publicar seu processo criativo e investigativo em um diário cultural.",
      "Produzir um painel ou mural sobre a diversidade cultural presente na comunidade.",
      "Organizar um encontro entre gerações (jovens e pessoas idosas) para troca de histórias e saberes."
    ]
  },
  {
    "id": "desenvolvimento-comunitario",
    "name": "Desenvolvimento Comunitário",
    "eixoId": "paz-e-desenvolvimento",
    "description": "O desenvolvimento comunitário começa pela compreensão do território onde vivemos e pela disposição de agir para melhorar o que está ao nosso redor. Nesta especialidade, você será convidado a observar sua comunidade com atenção, identificar desafios e construir soluções colaborativas. O foco é fortalecer a capacidade de promover mudanças que façam sentido para as pessoas da comunidade. Se você quer transformar sua realidade local, esta especialidade é para você.",
    "conhecerSuggestions": [
      "Realizar entrevistas com lideranças comunitárias, educadores populares, agentes de saúde, comerciantes e moradores.",
      "Participar de mutirões, assembleias, redes de apoio, iniciativas de economia solidária ou grupos comunitários.",
      "Pesquisar metodologias participativas (como diagnóstico rápido participativo, cartografia social, design participativo).",
      "Visitar centros culturais, associações, cooperativas, hortas urbanas, pontos de cultura e coletivos locais.",
      "Refletir sobre a história do território, suas desigualdades, potencialidades e desafios.",
      "Validar vivências anteriores obtidas em ações de serviço ou projetos escoteiros na comunidade.",
      "Construir um mapa afetivo do bairro com moradores de diferentes idades.",
      "Investigar como políticas públicas locais influenciam a vida comunitária.",
      "Pesquisar práticas de desenvolvimento comunitário no Brasil e em outros países.",
      "Observar como diferentes grupos usam e ocupam os espaços públicos."
    ],
    "fazerSuggestions": [
      "Mapear demandas e potencialidades da comunidade e construir uma proposta conjunta com moradores.",
      "Organizar uma ação ou campanha de mobilização sobre um tema relevante (saúde, ambiente, cultura, direitos).",
      "Criar ou fortalecer uma rede de apoio envolvendo pessoas de diversas idades e grupos sociais.",
      "Colaborar com a revitalização de espaços públicos, praças, becos, terrenos ou equipamentos comunitários.",
      "Desenvolver um projeto que promova educação, cultura, esporte, meio ambiente, saúde ou segurança comunitária.",
      "Elaborar materiais educativos acessíveis (vídeos, mapas, guias) para uso comunitário.",
      "Criar um evento comunitário (feira de troca, roda de histórias, festival local, mutirão cultural).",
      "Propor melhorias simples e viáveis para equipamentos comunitários (biblioteca, praça, pista, horta).",
      "Desenvolver uma solução de tecnologia social (como coletor de água, sistema de compostagem, biblioteca livre)."
    ],
    "compartilharSuggestions": [
      "Apresentar o projeto, seus resultados e aprendizados para a seção, escola, universidade, comunidade ou eventos juvenis.",
      "Produzir vídeos, infográficos, mini-documentários ou relatos sobre o processo vivido.",
      "Conduzir uma roda de conversa ou painel com moradores e jovens envolvidos.",
      "Incentivar outras seções a desenvolverem seus próprios diagnósticos e projetos.",
      "Contribuir com materiais, registros e reflexões para sites ou boletins locais.",
      "Criar um mural comunitário ou painel visual com fotos, dados e memórias do projeto.",
      "Registrar aprendizados e recomendações para continuidade da ação ao longo do ano.",
      "Criar um guia replicável para futuros projetos comunitários na UEL."
    ]
  },
  {
    "id": "direitos-humanos",
    "name": "Direitos Humanos",
    "eixoId": "paz-e-desenvolvimento",
    "description": "Esta especialidade apresenta os princípios fundamentais dos direitos humanos e sua importância para assegurar dignidade e respeito para todas as pessoas. Ao explorá-la, você vai compreender como surgiram esses direitos, reconhecer situações de injustiça, refletir sobre desigualdades e aprender formas responsáveis de agir, apoiar e se posicionar. O objetivo é desenvolver consciência cidadã e o fortalecimento de uma cultura de direitos no cotidiano.",
    "conhecerSuggestions": [
      "Participar de oficinas, rodas de conversa, seminários ou cursos introdutórios sobre direitos humanos.",
      "Pesquisar a Declaração Universal dos Direitos Humanos, leis nacionais e tratados internacionais.",
      "Entrevistar defensores de direitos humanos, lideranças sociais, educadores populares, conselheiros tutelares ou assistentes sociais.",
      "Visitar centros de referência, espaços de memória, defensorias públicas, museus, organizações sociais ou conselhos comunitários.",
      "Refletir sobre situações de injustiça, exclusão ou violação de direitos observadas no cotidiano.",
      "Validar experiências anteriores em ações sociais, campanhas de conscientização ou especialidades relacionadas.",
      "Participar de uma audiência pública, sessão legislativa, conselho municipal ou fórum comunitário.",
      "Analisar casos reais de violações de direitos e como foram solucionados.",
      "Pesquisar iniciativas juvenis de defesa de direitos no Brasil e no mundo.",
      "Criar um diário de observação sobre situações de desigualdade e práticas de solidariedade na comunidade."
    ],
    "fazerSuggestions": [
      "Criar uma campanha de informação e sensibilização sobre um direito específico ou uma violação recorrente.",
      "Produzir vídeos, cartilhas, podcasts, exposições, textos ou conteúdos educativos sobre direitos fundamentais.",
      "Organizar uma roda de conversa ou encontro com pessoas que enfrentam situações de violação de direitos (como refugiados, pessoas com deficiência, mulheres, povos tradicionais).",
      "Participar ou apoiar um projeto de proteção, acolhimento ou promoção de direitos na comunidade.",
      "Conduzir uma ação educativa em sua seção, escola, universidade ou UEL com foco em dignidade e equidade.",
      "Criar um mapeamento de serviços públicos que garantem direitos (CRAS, UBS, Defensoria, CAPS, Conselho Tutelar).",
      "Desenvolver um projeto de cultura de paz na escola ou na UEL (mediação, convivência, combate ao bullying).",
      "Elaborar um guia prático para jovens com informações sobre direitos básicos e onde buscar ajuda.",
      "Criar uma intervenção artística (mural, teatro, slam, fotografia) que promova justiça social."
    ],
    "compartilharSuggestions": [
      "Apresentar sua ação na seção, escola, universidade, comunidade ou eventos locais.",
      "Produzir conteúdos acessíveis (vídeos, relatos, infográficos, blogs) sobre os aprendizados do projeto.",
      "Conduzir uma atividade educativa com foco em empatia, respeito e dignidade humana.",
      "Criar um guia, zine ou material replicável para apoiar futuros jovens que desejem seguir esse caminho.",
      "Apoiar a organização de uma nova ação coletiva de defesa de direitos na UEL ou na comunidade.",
      "Organizar um painel, debate ou exposição pública envolvendo moradores e outros jovens.",
      "Apresentar o trabalho em fóruns ou encontros juvenis de participação social.",
      "Criar um registro reflexivo (texto, vídeo, portfólio) sobre os impactos e aprendizados do processo.",
      "Inspirar outras patrulhas ou seções a desenvolverem projetos permanentes de direitos humanos."
    ]
  },
  {
    "id": "diversidades",
    "name": "Diversidades",
    "eixoId": "paz-e-desenvolvimento",
    "description": "Esta especialidade trata do reconhecimento e da valorização das diversas formas de existência presentes na sociedade. Você vai refletir sobre culturas, identidades, orientações, corpos, gerações e modos de viver que muitas vezes são pouco visíveis ou alvo de preconceito. O objetivo é desenvolver respeito, empatia e compreensão sobre a diversidade humana, fortalecendo relações mais justas e inclusivas.",
    "conhecerSuggestions": [
      "Participar de rodas de conversa, oficinas, seminários ou eventos sobre diversidade.",
      "Realizar entrevistas com pessoas de diferentes contextos sociais, étnicos, identitários, geracionais.",
      "Visitar instituições, centros culturais, museus, espaços de memória ou organizações ligadas à promoção da diversidade.",
      "Pesquisar sobre legislações, campanhas, documentos e políticas públicas sobre diversidade, inclusão e direitos humanos.",
      "Refletir sobre experiências pessoais de convivência, escuta e aprendizado com pessoas diversas.",
      "Validar aprendizagens anteriores de atividades escolares, acadêmicas, escoteiras ou comunitárias relacionadas ao tema.",
      "Analisar casos de discriminação, preconceito ou exclusão e estudar formas de enfrentamento e superação.",
      "Pesquisar iniciativas juvenis, nacionais ou internacionais, que promovem diversidade, inclusão e equidade."
    ],
    "fazerSuggestions": [
      "Produzir um material educativo sobre o valor da diversidade (podcast, cartilha, vídeo, exposição ou série fotográfica).",
      "Organizar uma atividade temática para a seção, escola, universidade ou comunidade sobre respeito, inclusão e convivência.",
      "Criar uma campanha contra qualquer forma de discriminação, preconceito ou violência simbólica.",
      "Promover uma roda de conversa, painel ou encontro com convidados que tragam diferentes vivências de diversidade.",
      "Desenvolver uma iniciativa de valorização da cultura ou identidade de um grupo social local.",
      "Criar um projeto de acessibilidade ou inclusão na UEL, escola, universidade ou comunidade.",
      "Elaborar um guia ou recurso prático com orientações sobre convivência respeitosa e linguagem inclusiva."
    ],
    "compartilharSuggestions": [
      "Apresentar o projeto e seus impactos para a seção, escola, universidade ou comunidade.",
      "Produzir conteúdo educativo para redes sociais, blogs, jornais locais ou plataformas escoteiras.",
      "Conduzir uma atividade educativa, roda de conversa ou dinâmica sobre diversidade para outros jovens.",
      "Apoiar colegas e outras seções ou grupos a realizarem ações semelhantes.",
      "Deixar um legado para a comunidade: mural, exposição, intervenção artística, festival cultural, zine ou outro registro que celebre a diversidade.",
      "Criar um relato reflexivo (texto, vídeo, portfólio) destacando aprendizados, desafios e transformações do processo."
    ]
  },
  {
    "id": "equidade",
    "name": "Equidade",
    "eixoId": "paz-e-desenvolvimento",
    "description": "Esta especialidade aborda como as desigualdades afetam diferentes grupos e o que pode ser feito para promover mais justiça e participação. Você vai entender a diferença entre igualdade e equidade, identificar barreiras que limitam oportunidades e aprender formas responsáveis de agir para reduzir essas diferenças. O foco é desenvolver o compromisso com soluções que ampliem o acesso e a participação de todas as pessoas.",
    "conhecerSuggestions": [
      "Participar de rodas de conversa, oficinas, palestras ou campanhas que discutam equidade e justiça social.",
      "Realizar entrevistas com pessoas que atuam em políticas públicas, movimentos sociais, coletivos comunitários ou instituições de apoio.",
      "Pesquisar sobre as desigualdades de sua cidade ou região e as políticas que visam combatê-las.",
      "Estudar os marcos legais relacionados à equidade no Brasil, incluindo políticas afirmativas e leis de proteção a grupos vulnerabilizados.",
      "Observar e registrar situações em que a equidade está ou não sendo aplicada no cotidiano (escola, comunidade, internet, espaços públicos).",
      "Validar experiências anteriores adquiridas em projetos sociais, fóruns de juventude, grêmios, coletivos ou especialidades relacionadas.",
      "Analisar indicadores sociais, econômicos ou educacionais que evidenciem desigualdades.",
      "Pesquisar iniciativas de protagonismo juvenil voltadas à redução de desigualdades."
    ],
    "fazerSuggestions": [
      "Criar uma campanha sobre equidade de gênero, racial, acessibilidade ou oportunidades em sua escola, universidade, comunidade, seção ou UEL.",
      "Desenvolver uma proposta de melhoria em um espaço ou serviço para torná-lo mais inclusivo e justo (escola, universidade, praça, UEL, projeto local).",
      "Produzir um material educativo (vídeo, guia, infográfico ou e-book) explicando conceitos e práticas de equidade.",
      "Colaborar com um projeto social que trabalhe com populações impactadas por desigualdades estruturais.",
      "Conduzir uma atividade prática que mostre a diferença entre igualdade e equidade (dinâmica, jogo, estudo de caso).",
      "Criar um diagnóstico participativo sobre barreiras enfrentadas por um grupo local e propor soluções de equidade.",
      "Desenvolver um mural, intervenção artística ou exposição que valorize representatividade e justiça social."
    ],
    "compartilharSuggestions": [
      "Apresentar os resultados e aprendizados da ação para sua seção, escola, universidade ou comunidade.",
      "Registrar a experiência em redes sociais, plataforma, blog ou boletim local.",
      "Conduzir uma atividade educativa sobre equidade para outras seções ou comunidade.",
      "Apoiar colegas na criação de ações similares, oferecendo orientação, materiais ou apoio técnico.",
      "Criar um repositório de boas práticas que promovam equidade em sua UEL, comunidade, escola ou universidade.",
      "Deixar um legado acessível: guia, relatório, mural, vídeo ou recurso que ajude outras pessoas a compreender e agir pela equidade."
    ]
  },
  {
    "id": "fe-crencas-e-dialogo-inter-religioso",
    "name": "Fé, Crenças e Diálogo Inter-Religioso",
    "eixoId": "paz-e-desenvolvimento",
    "description": "Esta especialidade apresenta diferentes formas de viver a espiritualidade e destaca a importância de reconhecer a diversidade de crenças presentes na sociedade. Você vai refletir sobre seu próprio caminho espiritual e exercitar o diálogo respeitoso, mesmo diante de opiniões distintas. O objetivo é promover entendimento e fortalecer a convivência pacífica e respeitosa entre pessoas de diferentes tradições religiosas e filosóficas.",
    "conhecerSuggestions": [
      "Participar de uma roda de conversa, seminário ou grupo inter-religioso.",
      "Visitar espaços religiosos diferentes da sua própria crença, com respeito e escuta ativa (templos, terreiros, igrejas, sinagogas, mesquitas, centros comunitários).",
      "Realizar entrevistas com representantes ou praticantes de diferentes tradições espirituais (lideranças, fiéis, estudiosos).",
      "Pesquisar sobre a história, valores e práticas de três ou mais religiões presentes no Brasil.",
      "Refletir e registrar, em diário pessoal ou outro formato, a própria vivência espiritual, dúvidas e descobertas.",
      "Validar aprendizados anteriores obtidos em ações, jornadas espirituais, encontros regionais ou especialidades relacionadas.",
      "Pesquisar casos de intolerância religiosa e iniciativas de enfrentamento.",
      "Estudar documentos, cartas de princípios ou organizações que promovem o diálogo inter-religioso."
    ],
    "fazerSuggestions": [
      "Organizar um encontro ou roda de diálogo com jovens de diferentes tradições religiosas.",
      "Criar uma campanha educativa contra a intolerância religiosa e desinformação sobre religiões.",
      "Produzir um material informativo (vídeo, podcast, infográfico ou guia) sobre o respeito à diversidade religiosa.",
      "Desenvolver uma ação comunitária com participação de diferentes grupos de fé (mutirão, campanha social, arrecadação solidária).",
      "Criar um espaço ou momento de expressão espiritual inclusivo em sua UEL, promovendo o respeito mútuo.",
      "Elaborar uma proposta de atividade escoteira que incorpore práticas de diálogo inter-religioso."
    ],
    "compartilharSuggestions": [
      "Apresentar a atividade na seção, escola, universidade ou comunidade.",
      "Compartilhar reflexões, aprendizados e descobertas em redes sociais, blog, jornal local ou outra plataforma.",
      "Conduzir uma atividade espiritual aberta, inclusiva e respeitosa para a seção ou UEL.",
      "Participar de um projeto inter-religioso local, regional ou nacional, ampliando conexões entre grupos.",
      "Apoiar outros jovens na construção de um ambiente respeitoso às diferentes expressões de fé.",
      "Promover uma roda de conversa sobre espiritualidade, valores e convivência entre crenças diversas."
    ]
  },
  {
    "id": "inclusao-e-acessibilidade",
    "name": "Inclusão e Acessibilidade",
    "eixoId": "paz-e-desenvolvimento",
    "description": "Esta especialidade aborda os desafios enfrentados por pessoas que vivem barreiras relacionadas à acessibilidade, às diferenças e às desigualdades sociais. Você vai compreender como essas barreiras impactam a autonomia das pessoas e a buscar maneiras de criar ambientes mais inclusivos e acessíveis. O objetivo é desenvolver práticas e relações para garantir a participação plena de todas as pessoas.",
    "conhecerSuggestions": [
      "Participar de oficinas, rodas de conversa ou formações sobre inclusão e acessibilidade.",
      "Visitar instituições que atuam com pessoas com deficiência, neurodivergências, idosos, migrantes ou grupos em vulnerabilidade social.",
      "Realizar entrevistas com pessoas com deficiência, profissionais de apoio, cuidadores, educadores ou ativistas da inclusão.",
      "Pesquisar sobre os diferentes tipos de acessibilidade e sobre os direitos previstos em lei (como o Estatuto da Pessoa com Deficiência).",
      "Realizar uma vivência com simulações de acessibilidade ou uso de recursos alternativos de comunicação (bengala, cadeira de rodas, venda, aplicativos de voz, pictogramas).",
      "Validar conhecimentos anteriores adquiridos em ações inclusivas escoteiras, escolares, universitárias ou comunitárias.",
      "Observar e registrar barreiras presentes na escola, universidade, comunidade, transporte público ou UEL.",
      "Pesquisar tecnologias assistivas e soluções de baixo custo para inclusão."
    ],
    "fazerSuggestions": [
      "Criar ou adaptar uma atividade escoteira para torná-la acessível a diferentes públicos.",
      "Desenvolver materiais em formatos acessíveis (vídeo com legenda ou Libras, cartilha em leitura simples, pictogramas, audiodescrição, QR codes).",
      "Organizar uma campanha contra o capacitismo, o preconceito e a exclusão social.",
      "Conduzir uma formação para a seção sobre inclusão, acessibilidade e convivência respeitosa.",
      "Ajudar a identificar, mapear e propor soluções para barreiras de acesso na seção, na UEL, na escola, universidade ou em espaço público.",
      "Criar um projeto de tecnologia assistiva ou adaptação simples (rampa, pranchas de comunicação, sinalização tátil, recursos para atividades).",
      "Desenvolver uma ação que fortaleça vínculos com pessoas ou grupos vulnerabilizados (visitas, oficinas, mutirões, apoio educativo)."
    ],
    "compartilharSuggestions": [
      "Apresentar os resultados da ação em reunião de seção, evento escolar, universitário, comunitário ou nas redes sociais.",
      "Produzir conteúdo educativo (podcast, vídeo, guia ou postagens) sobre inclusão e acessibilidade.",
      "Conduzir uma atividade prática com foco em acessibilidade para jovens da seção, da UEL ou da comunidade.",
      "Apoiar outros jovens ou adultos voluntários a adaptarem práticas, atividades e espaços.",
      "Criar ou deixar como legado uma estrutura, recurso acessível ou guia permanente para a UEL.",
      "Registrar as aprendizagens e reflexões em texto, vídeo ou portfólio, inspirando outras pessoas a seguirem o mesmo caminho."
    ]
  },
  {
    "id": "politicas-publicas",
    "name": "Políticas Públicas",
    "eixoId": "paz-e-desenvolvimento",
    "description": "Esta especialidade apresenta como o Estado funciona, como os direitos são garantidos e de que forma as políticas públicas influenciam a vida das pessoas. Você vai entender processos de participação cidadã, acompanhar decisões que afetam a sociedade e reconhecer como cada pessoa pode contribuir para que essas políticas atendam às reais necessidades da comunidade. O objetivo é desenvolver consciência crítica e a capacidade de atuação responsável na construção de soluções coletivas.",
    "conhecerSuggestions": [
      "Participar de reuniões de conselhos municipais, audiências públicas ou fóruns comunitários.",
      "Pesquisar sobre políticas públicas voltadas à juventude em seu município, estado ou país.",
      "Realizar entrevistas com gestores públicos, conselheiros municipais, lideranças comunitárias, técnicos ou pesquisadores da área.",
      "Visitar uma instituição pública e entender seu funcionamento (escola, universidade, unidade de saúde, CRAS, conselho tutelar, câmara municipal).",
      "Acompanhar a elaboração, execução ou revisão de uma política pública local (PPA, LDO, LOA).",
      "Validar conhecimentos anteriores adquiridos em projetos sociais, fóruns de juventude, grêmios, coletivos ou especialidades correlatas.",
      "Analisar dados públicos sobre temas que afetam a comunidade (saúde, educação, segurança, meio ambiente, gastos públicos).",
      "Pesquisar movimentos democráticos, lutas históricas e conquistas de direitos relacionados a políticas públicas."
    ],
    "fazerSuggestions": [
      "Realizar um mapeamento de demandas juvenis e apresentar propostas a gestores públicos locais.",
      "Criar uma cartilha, vídeo ou guia educativo explicando o que são políticas públicas e como os jovens podem participar.",
      "Organizar uma roda de conversa com representantes do poder público e da comunidade.",
      "Participar de um conselho de juventude, campanha de consulta pública ou fórum democrático local.",
      "Desenvolver uma ação que dê visibilidade a um problema coletivo e proponha caminhos de solução por meio de políticas públicas.",
      "Criar um observatório juvenil local para acompanhar indicadores, serviços públicos ou temas relevantes da comunidade.",
      "Elaborar um diagnóstico participativo de uma área específica (mobilidade, educação, esporte, meio ambiente)."
    ],
    "compartilharSuggestions": [
      "Apresentar os resultados da ação para sua seção, escola, universidade ou comunidade.",
      "Publicar sua experiência, análise ou aprendizados em redes sociais, blogs, podcasts ou outras plataformas.",
      "Conduzir uma oficina ou atividade educativa sobre participação cidadã e tomada de decisão pública.",
      "Apoiar novas iniciativas juvenis de acompanhamento, incidência ou controle social de políticas públicas.",
      "Documentar o processo e deixar um legado para outras pessoas interessadas no tema (guia, relatório, vídeo ou painel visual).",
      "Criar um espaço de diálogo contínuo entre jovens e representantes locais para fortalecer a participação juvenil na comunidade."
    ]
  },
  {
    "id": "educacao-alimentar-e-nutricional",
    "name": "Educação Alimentar e Nutricional",
    "eixoId": "saude-e-bem-estar",
    "description": "Esta especialidade aborda a relação entre alimentação, meio ambiente e cultura. Você vai observar seus próprios hábitos, compreender como as escolhas alimentares impactam o corpo, o bem-estar e o planeta, e aprender a tomar decisões mais conscientes. O foco é desenvolver a responsabilidade e visão crítica sobre o que se consome, valorizando práticas alimentares sustentáveis e culturalmente diversas.",
    "conhecerSuggestions": [
      "Participar de oficinas, formações ou bate-papos com nutricionistas, cozinheiros(as) populares, agricultores ou educadores alimentares.",
      "Visitar feiras livres, mercados locais, hortas comunitárias, cooperativas de produtores ou cozinhas solidárias.",
      "Pesquisar sobre os Dez Passos do Guia Alimentar para a População Brasileira, seus princípios e orientações práticas.",
      "Observar seus próprios hábitos alimentares e os da sua família, registrando padrões e possibilidades de mudança.",
      "Conversar com pessoas de diferentes culturas, estilos alimentares ou restrições (vegetarianos, veganos, religiosos, atletas, etc.).",
      "Validar experiências anteriores em especialidades.",
      "Pesquisar sobre desperdício de alimentos, rotulagem, políticas de combate à fome e programas públicos de alimentação.",
      "Explorar receitas tradicionais e seus significados culturais."
    ],
    "fazerSuggestions": [
      "Elaborar e aplicar um plano pessoal de melhoria dos hábitos alimentares, com registro reflexivo.",
      "Organizar uma oficina culinária saudável ou roda de conversa sobre escolhas alimentares.",
      "Criar um conteúdo (vídeo, podcast, cardápio ilustrado) para divulgar boas práticas alimentares.",
      "Desenvolver uma campanha de conscientização sobre alimentos ultraprocessados.",
      "Planejar e preparar refeições para um evento escoteiro com foco em equilíbrio nutricional.",
      "Criar um projeto de horta ou cultivo doméstico vinculado ao tema da alimentação saudável."
    ],
    "compartilharSuggestions": [
      "Apresentar seu projeto ou campanha para a seção, escola ou comunidade.",
      "Compartilhar receitas, dicas, conteúdos educativos e reflexões em redes sociais, boletins, rodas de conversa ou eventos locais.",
      "Conduzir uma conversa leve e informativa sobre alimentação saudável entre pares, incentivando mudanças de hábitos.",
      "Inspirar amigos, familiares e colegas a melhorarem sua relação com a comida e adotarem escolhas mais conscientes.",
      "Deixar um legado como vídeo, e-book, cardápio acessível ou coleção de receitas para uso da UEL ou da comunidade."
    ]
  },
  {
    "id": "esportes",
    "name": "Esportes",
    "eixoId": "saude-e-bem-estar",
    "description": "Esta especialidade apresenta o esporte como ferramenta de desenvolvimento pessoal. Você vai praticar diferentes modalidades, exercitar disciplina, foco e cooperação, além de compreender como a atividade física contribui para o equilíbrio emocional e a saúde. O objetivo é desenvolver hábitos de vida ativos e saudáveis.",
    "conhecerSuggestions": [
      "Pesquisar os benefícios físicos, emocionais e sociais da prática esportiva.",
      "Participar de uma clínica, treino, aula experimental ou vivência esportiva com profissionais, técnicos ou atletas.",
      "Realizar entrevistas com atletas, treinadores ou praticantes experientes sobre suas rotinas, desafios e aprendizados.",
      "Observar a prática esportiva em diferentes contextos: escolar, comunitário, profissional, inclusivo ou recreativo.",
      "Refletir sobre a própria relação com o esporte, registrando sentimentos, dificuldades e motivações.",
      "Validar experiências anteriores com prática esportiva regular ou participação em equipes, grupos ou projetos.",
      "Pesquisar regras, curiosidades e história de modalidades de interesse.",
      "Explorar exercícios básicos de condicionamento físico, coordenação e força relacionados à modalidade escolhida."
    ],
    "fazerSuggestions": [
      "Estabelecer e registrar uma rotina esportiva pessoal com metas de desempenho, saúde ou bem-estar.",
      "Organizar ou participar ativamente de um campeonato, desafio, torneio interno ou circuito esportivo entre jovens.",
      "Promover oficinas, treinos abertos ou vivências esportivas para sua comunidade, escola, universidade ou seção.",
      "Criar um guia, vídeo ou série de orientações sobre como começar a praticar determinada modalidade.",
      "Planejar uma atividade que integre esporte, lazer e valores como respeito, cooperação e perseverança.",
      "Implementar práticas de aquecimento, alongamento e autocuidado para prevenção de lesões no grupo.",
      "Desenvolver um projeto esportivo que una saúde, diversão e inclusão (ex.: torneios inclusivos, atividades multi-esporte)."
    ],
    "compartilharSuggestions": [
      "Apresentar sua trajetória esportiva, desafios e aprendizados para a seção, escola, universidade ou comunidade.",
      "Produzir um vídeo ou outro conteúdo digital com dicas e benefícios da atividade física.",
      "Conduzir uma aula, treino, desafio técnico ou demonstração de movimento para outros jovens.",
      "Criar um ambiente na UEL que incentive e amplie o acesso à prática esportiva entre os membros.",
      "Ajudar outros jovens a encontrarem o esporte que melhor combina com seu perfil, ritmo e interesses.",
      "Registrar em texto, vídeo ou portfólio seus avanços, aprendizados e reflexões sobre o esporte como parte da vida."
    ]
  },
  {
    "id": "hobbies-e-lazer",
    "name": "Hobbies e Lazer",
    "eixoId": "saude-e-bem-estar",
    "description": "Esta especialidade apresenta o lazer como parte importante do bem-estar e como um direito que contribui para o equilíbrio emocional. Você vai explorar atividades que geram prazer, criatividade e descanso, identificando hobbies que façam sentido para sua vida: música, arte, jogos, escrita, jardinagem, coleções, esportes alternativos, entre muitas outras possibilidades. O objetivo é reconhecer o lazer como forma de autocuidado.",
    "conhecerSuggestions": [
      "Investigar como hobbies e lazer impactam positivamente o bem-estar físico, emocional e social.",
      "Conversar com pessoas que têm hobbies marcantes e aprender com suas histórias, práticas e estratégias.",
      "Participar de oficinas, feiras, convenções, encontros de fãs ou eventos culturais ligados ao tema de interesse.",
      "Pesquisar sobre o papel do lazer como direito humano, forma de expressão e fator de saúde integral.",
      "Refletir sobre sua própria relação com o tempo livre e identificar atividades que realmente trazem alegria e descanso.",
      "Validar experiências anteriores com hobbies que já façam parte do cotidiano.",
      "Investigar comunidades ou grupos organizados ligados a seu hobby (clubes, grupos online, associações).",
      "Pesquisar técnicas, ferramentas ou histórias relacionadas ao hobby escolhido."
    ],
    "fazerSuggestions": [
      "Desenvolver ou aprofundar-se em um hobby com objetivo pessoal claro, registrando avanços, dificuldades e aprendizados.",
      "Organizar um encontro de talentos, feira de hobbies, oficina prática ou clube temático para outros jovens.",
      "Criar um grupo de estudo, prática ou convivência em torno de um hobby (como leitura, música, jogos, fotografia).",
      "Desenvolver um conteúdo (vídeo, blog, zine, exposição, diário visual) mostrando como hobbies contribuem para o bem-estar.",
      "Incentivar outros jovens a descobrirem e valorizarem seus próprios interesses e tempo livre.",
      "Criar um projeto de lazer comunitário (como uma tarde de jogos, sessão de cinema, oficina criativa).",
      "Criar ou restaurar objetos relacionados ao hobby (miniaturas, instrumentos, artesanato, coleções).",
      "Participar de eventos ou desafios relacionados à prática escolhida."
    ],
    "compartilharSuggestions": [
      "Apresentar o hobby, seus aprendizados e evolução para a seção, escola, universidade ou comunidade.",
      "Produzir um material que ajude outras pessoas a começarem um hobby semelhante (guia, vídeo, tutorial, postagens).",
      "Conduzir uma atividade prática para outros jovens com foco no hobby escolhido.",
      "Criar uma exposição, roda de conversa ou mostra cultural sobre lazer saudável.",
      "Escrever um relato pessoal, artigo, vídeo ou portfólio sobre o valor do lazer para sua saúde integral.",
      "Apoiar outros jovens a descobrirem novos interesses, oferecendo suporte, dicas ou materiais iniciais."
    ]
  },
  {
    "id": "saude",
    "name": "Saúde",
    "eixoId": "saude-e-bem-estar",
    "description": "Esta especialidade aborda como o corpo funciona e o que podemos fazer para manter a saúde em equilíbrio. Você vai aprender sobre prevenção e atitudes que tornam o dia a dia mais seguro para você e para as pessoas ao redor. O objetivo é reconhecer sinais importantes e agir com consciência diante de situações que envolvem cuidados básicos de saúde.",
    "conhecerSuggestions": [
      "Participar de uma palestra, roda de conversa ou oficina com profissionais da saúde.",
      "Pesquisar sobre como os hábitos cotidianos afetam a saúde física, mental e emocional.",
      "Realizar entrevistas com agentes comunitários, enfermeiros, médicos, nutricionistas ou fisioterapeutas.",
      "Visitar uma Unidade Básica de Saúde para conhecer seus serviços e entender como o SUS funciona.",
      "Refletir sobre sua própria rotina de autocuidado, identificando pontos fortes e melhorias possíveis.",
      "Observar medidas de prevenção e higiene em espaços públicos e comparar boas práticas.",
      "Validar conhecimentos anteriores adquiridos em outras especialidades.",
      "Pesquisar campanhas de saúde pública e seus resultados (vacinação, combate a dengue, entre outras)."
    ],
    "fazerSuggestions": [
      "Promover uma campanha educativa sobre higiene, vacinação, prevenção de doenças ou primeiros sinais de alerta.",
      "Organizar uma ação prática com foco em saúde em sua comunidade, escola, universidade ou UEL.",
      "Desenvolver materiais de conscientização sobre saúde em linguagem simples (vídeo, folder, infográfico, podcast).",
      "Colaborar com ações locais de saúde preventiva (mutirões, feiras, atividades educativas com profissionais).",
      "Organizar um workshop de primeiros socorros aberto à comunidade.",
      "Criar um plano pessoal de autocuidado com metas realistas e registrar sua evolução."
    ],
    "compartilharSuggestions": [
      "Apresentar os resultados da sua ação e seus aprendizados para a seção, escola, universidade ou comunidade.",
      "Conduzir uma roda de conversa, oficina ou dinâmica sobre cuidados básicos com a saúde.",
      "Produzir e divulgar conteúdo em redes sociais, boletins ou outras plataformas.",
      "Inspirar amigos e familiares a adotarem hábitos mais saudáveis, compartilhando práticas simples do cotidiano.",
      "Apoiar jovens na busca por atendimento de saúde quando necessário, indicando serviços e informações confiáveis.",
      "Criar um material replicável (cartilha, guia rápido, infográficos) para estimular outros jovens a cuidarem da própria saúde."
    ]
  },
  {
    "id": "saude-mental-e-bem-estar-emocional",
    "name": "Saúde Mental e Bem-estar Emocional",
    "eixoId": "saude-e-bem-estar",
    "description": "Esta especialidade apresenta aspectos fundamentais da saúde mental e do cuidado emocional. Você vai conhecer melhor suas emoções, praticar o autocuidado e aprender atitudes que fortalecem o bem-estar. Também vai compreender a importância da empatia e das relações afetivas saudáveis, além de reconhecer que pedir ajuda quando necessário é uma ação responsável e madura.",
    "conhecerSuggestions": [
      "Participar de rodas de conversa, oficinas ou formações sobre saúde mental com educadores, especialistas ou profissionais da área.",
      "Realizar entrevistas com psicólogos, terapeutas, profissionais de acolhimento escolar ou pessoas envolvidas em projetos de cuidado emocional.",
      "Pesquisar sobre os principais transtornos emocionais que afetam adolescentes e jovens, além dos serviços de apoio disponíveis.",
      "Observar como as emoções influenciam seu cotidiano, suas relações e suas decisões.",
      "Refletir sobre situações que geraram bem-estar ou sobrecarga emocional e o que você aprendeu com elas.",
      "Validar experiências anteriores vividas em acompanhamentos profissionais, projetos escolares ou escoteiros com foco em saúde mental.",
      "Conhecer iniciativas de promoção de bem-estar emocional existentes no Brasil e no mundo."
    ],
    "fazerSuggestions": [
      "Criar uma campanha de valorização da saúde mental com linguagem acolhedora e informativa.",
      "Organizar uma roda de conversa ou espaço de escuta ativa com jovens, sempre com o apoio de especialistas capacitados.",
      "Produzir conteúdos (vídeo, guia, podcast) com dicas de autocuidado emocional e canais de apoio.",
      "Criar uma playlist, kit de bem-estar, espaço de descompressão ou ritual pessoal para momentos difíceis.",
      "Planejar uma rotina mais equilibrada com metas simples de descanso, lazer e organização emocional."
    ],
    "compartilharSuggestions": [
      "Apresentar seus aprendizados à seção, escola, universidade ou comunidade.",
      "Conduzir, com apoio de um especialista, uma atividade leve e segura sobre bem-estar emocional.",
      "Produzir conteúdos em redes sociais, blogs ou canais escoteiros que incentivem conversas responsáveis sobre saúde mental.",
      "Apoiar outros jovens a reconhecer sinais de sobrecarga e buscar ajuda quando necessário.",
      "Criar um material replicável (zine, infográfico, guia) com práticas de cuidado emocional.",
      "Registrar sua experiência em texto, vídeo ou diário reflexivo e inspirar ações futuras de cuidado coletivo."
    ]
  },
  {
    "id": "saude-sexual-e-reprodutiva",
    "name": "Saúde Sexual e Reprodutiva",
    "eixoId": "saude-e-bem-estar",
    "description": "Esta especialidade aborda a sexualidade como um tema ligado ao respeito e ao cuidado. Você vai conhecer melhor o funcionamento do corpo, compreender as emoções envolvidas e aprender sobre consentimento, prevenção e informações seguras. O objetivo é desenvolver responsabilidade e relações baseadas no respeito mútuo, na segurança e na dignidade.",
    "conhecerSuggestions": [
      "Participar de uma roda de conversa, oficina ou palestra com profissionais da saúde, educação ou juventude.",
      "Pesquisar materiais educativos confiáveis sobre saúde sexual e reprodutiva, incluindo cartilhas oficiais e conteúdos verificados.",
      "Visitar uma unidade básica de saúde ou entrevistar profissionais do SUS sobre atendimento e acolhimento a jovens.",
      "Pesquisar sobre direitos sexuais e reprodutivos previstos em leis e políticas públicas brasileiras.",
      "Observar e refletir sobre como os temas da sexualidade aparecem em seu cotidiano (escola, universidade, mídia, redes, conversas).",
      "Validar conhecimentos adquiridos em outras formações sobre saúde, bem-estar ou autocuidado."
    ],
    "fazerSuggestions": [
      "Produzir um conteúdo educativo (vídeo, infográfico ou podcast) sobre saúde sexual com linguagem clara e responsável.",
      "Conduzir, com o apoio de um especialista, uma roda de conversa leve e segura sobre o tema com jovens da sua seção.",
      "Criar um mural, guia simples ou kit de autocuidado com foco em prevenção, autoestima e respeito aos limites.",
      "Organizar uma campanha contra o preconceito, o estigma e a desinformação sobre sexualidade.",
      "Participar ou apoiar campanhas comunitárias de saúde sexual e planejamento familiar.",
      "Criar um mapa de serviços de saúde acessíveis para adolescentes e jovens na sua cidade."
    ],
    "compartilharSuggestions": [
      "Apresentar os resultados da sua ação à seção, escola, universidade ou comunidade de maneira sensível e informativa.",
      "Produzir conteúdos que promovam empatia, cuidado e informações de qualidade sobre saúde sexual.",
      "Conduzir, com apoio de um especialista, um espaço de escuta ou roda de conversa sobre respeito, limites e prevenção.",
      "Apoiar outros jovens a encontrarem fontes confiáveis de informação e a acessarem serviços de saúde quando necessário.",
      "Criar um material replicável (guia, zine, vídeo) para inspirar novas ações relacionadas ao tema."
    ]
  }
];

export const OLDER_SPECIALTY_BY_ID = new Map<string, OlderSpecialty>(
  OLDER_SPECIALTIES.map((s) => [s.id, s]),
);

export const OLDER_SPECIALTIES_BY_EIXO = OLDER_SPECIALTIES.reduce<
  Record<string, OlderSpecialty[]>
>((acc, s) => {
  (acc[s.eixoId] ??= []).push(s);
  return acc;
}, {});
