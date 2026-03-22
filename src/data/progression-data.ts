import type { Eixo, Action } from "./types";

function fixed(blocoId: string, index: number, text: string): Action {
  return { id: `${blocoId}:fixed:${index}`, text, type: "fixed" };
}

function variable(blocoId: string, index: number, text: string): Action {
  return { id: `${blocoId}:variable:${index}`, text, type: "variable" };
}

export const EIXOS: Eixo[] = [
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
          "Explorar assuntos que você acha interessante, procurar informações confiáveis para experimentar novas ideias e recursos, colocando o que aprendeu em prática nas atividades e nos projetos de serviço.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("aprendizagem-continua", 0, "Conquistar, no Ramo Escoteiro, uma especialidade sobre um tema de seu interesse e que seja um conhecimento novo."),
          fixed("aprendizagem-continua", 1, "Em conjunto com a sua patrulha, realizar um Percurso de Gilwell de pelo menos 3km."),
        ],
        variableActions: [
          variable("aprendizagem-continua", 0, "Enviar e receber mensagens simples em Alfabeto Fonético, Código Internacional de Sinais, Semáfora, Heliografia, Cifra de César ou Criptografia."),
          variable("aprendizagem-continua", 1, "Visitar com a sua patrulha: hospital, quartel de bombeiros, delegacia, empresas, comércios locais ou outros para conhecer diferentes profissões."),
          variable("aprendizagem-continua", 2, "Conhecer o funcionamento de serviços de internet, rádio e TV, e usar esses conhecimentos para resolver problemas técnicos."),
          variable("aprendizagem-continua", 3, "Convidar um especialista da comunidade para dialogar com a tropa e esclarecer dúvidas sobre determinado tema ou profissão."),
          variable("aprendizagem-continua", 4, "Utilizar corretamente um rádio comunicador em atividade da patrulha."),
          variable("aprendizagem-continua", 5, "Realizar uma pesquisa sobre um tema escolhido e apresentar os resultados para a patrulha ou tropa em formato criativo (cartaz, teatro, vídeo, oficina)."),
          variable("aprendizagem-continua", 6, "Planejar e executar, em conjunto com a sua patrulha, uma ação de serviço comunitário baseada em informações pesquisadas sobre necessidades locais."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "insignia", items: ["Insígnia do Aprender"] },
        ],
      },
      {
        id: "autonomia-lideranca",
        name: "Autonomia e Liderança",
        objective:
          "Viver diferentes funções na patrulha, sabendo quando ajudar e quando é sua vez de liderar. Saber administrar o seu dinheiro para conseguir realizar atividades e projetos. Planejar, colocar em prática e depois avaliar as tarefas com o grupo, tomando decisões com responsabilidade.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("autonomia-lideranca", 0, "Montar corretamente uma mochila para um acampamento, mantendo o equipamento pessoal em bom estado."),
        ],
        variableActions: [
          variable("autonomia-lideranca", 0, "Contribuir para o planejamento e a organização de uma excursão de patrulha."),
          variable("autonomia-lideranca", 1, "Fazer uma excursão urbana com a sua patrulha ou tropa, se locomovendo por meio de transportes públicos como ônibus, trens, metrô, entre outros."),
          variable("autonomia-lideranca", 2, "Pesquisar e realizar as compras dos alimentos para um acampamento, apresentando para a patrulha uma prestação de contas."),
          variable("autonomia-lideranca", 3, "Saber onde encontrar, identificando em um mapa, os principais serviços públicos na cidade."),
          variable("autonomia-lideranca", 4, "Planejar e executar em patrulha um projeto de captação de recursos para participação em uma atividade escoteira."),
          variable("autonomia-lideranca", 5, "Participar de atividades ou oficinas sobre finanças pessoais."),
          variable("autonomia-lideranca", 6, "Assumir pelo menos três encargos diferentes na patrulha, sendo bem avaliado pelos seus companheiros."),
          variable("autonomia-lideranca", 7, "Administrar o fundo de patrulha por pelo menos três meses, registrando receitas e despesas, e utilizar os recursos em atividades planejadas pela patrulha."),
          variable("autonomia-lideranca", 8, "Registrar receitas e despesas simples ou da mesada em planilha ou caderno por um período determinado."),
          variable("autonomia-lideranca", 9, "Conduzir uma reunião de patrulha como monitor ou secretário, registrando decisões e acompanhando sua execução."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Empreendedorismo", "Educação Financeira", "Administração", "Reparos Domésticos", "Oratória"] },
        ],
      },
      {
        id: "criatividade-inovacao",
        name: "Criatividade e Inovação",
        objective:
          "Usar a criatividade para resolver problemas do dia a dia, pensando em várias ideias diferentes antes de decidir qual é a melhor solução.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("criatividade-inovacao", 0, "Animar um Fogo de Conselho em um acampamento da patrulha ou de tropa."),
          fixed("criatividade-inovacao", 1, "Aplicar conceitos básicos de estruturas (cavaletes, encaixes, ancoragens) em projetos como pontes, balsas, pórticos ou outras pioneirias."),
        ],
        variableActions: [
          variable("criatividade-inovacao", 0, "Organizar uma atividade de divulgação do escotismo no colégio, usando diferentes recursos: vídeos, cartazes, panfletos, entre outros."),
          variable("criatividade-inovacao", 1, "Conhecer e cantar canções e danças apropriadas para diferentes momentos."),
          variable("criatividade-inovacao", 2, "Criar uma campanha publicitária divertida promovendo algum projeto ou atividade da patrulha ou Tropa Escoteira."),
          variable("criatividade-inovacao", 3, "Construir equipamentos improvisados de campo (mesa, suporte, abrigo, utensílios) utilizando materiais disponíveis."),
          variable("criatividade-inovacao", 4, "Propor e implementar soluções criativas para reduzir custos de uma atividade, aproveitando materiais recicláveis ou doados."),
          variable("criatividade-inovacao", 5, "Ensinar e aplicar dois novos jogos para sua tropa."),
          variable("criatividade-inovacao", 6, "Criar alternativas criativas para decorar o canto da patrulha ou o acampamento."),
          variable("criatividade-inovacao", 7, "Participar de um festival de talentos na tropa."),
          variable("criatividade-inovacao", 8, "Improvisar apresentações artísticas (esquetes, músicas, danças) em um Fogo de Conselho, explorando recursos disponíveis."),
          variable("criatividade-inovacao", 9, "Criar um vídeo de divulgação das atividades de sua patrulha ou tropa."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Arte Digital", "Artes Visuais", "Artesanato", "Comédia", "Costura e Estilismo", "Encadernação", "Grafite", "HQ", "Maquete", "Pintura", "Propaganda e Marketing", "Robótica", "Videomaker"] },
        ],
      },
      {
        id: "inteligencia-emocional",
        name: "Inteligência Emocional",
        objective:
          "Entender o que você sente, aprender a lidar com suas emoções de forma respeitosa e enfrentar desafios mesmo quando as coisas ficam difíceis.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("inteligencia-emocional", 0, "Identificar situações perigosas e de maus tratos, sabendo como agir e a quem recorrer."),
        ],
        variableActions: [
          variable("inteligencia-emocional", 0, "Conversar com a patrulha sobre pontos fortes e de melhoria no desempenho da equipe em atividades e acampamentos."),
          variable("inteligencia-emocional", 1, "Identificar seus medos e suas emoções diante de um obstáculo desafiador, trabalhando para conseguir superá-lo."),
          variable("inteligencia-emocional", 2, "Em um acampamento, participar de um turno de ronda com outro companheiro de patrulha, refletindo sobre o cuidado com o outro."),
          variable("inteligencia-emocional", 3, "Participar de jogos ou competições, respeitando regras e resultados."),
          variable("inteligencia-emocional", 4, "Em uma atividade de patrulha ou de tropa aplicar técnicas de respiração, relaxamento ou meditação antes de um grande desafio."),
          variable("inteligencia-emocional", 5, "Participar de rodas de conversa ou momentos de partilha após atividades intensas, ouvindo e respeitando as emoções dos demais."),
          variable("inteligencia-emocional", 6, "Escrever uma pequena carta para si mesmo com palavras de incentivo, lembrando de suas qualidades e dando sugestões de como você pode superar desafios futuros."),
          variable("inteligencia-emocional", 7, "Criar e encenar uma pequena história em que o personagem passa por dificuldades e encontra formas saudáveis de lidar com elas."),
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
          "Praticar o consumo consciente diariamente, evitando desperdícios e ajudando a preservar os recursos naturais.",
        eixoId: "meio-ambiente",
        fixedActions: [
          fixed("consumo-responsavel", 0, "Em acampamentos e excursões, criar soluções para melhorar a higiene e conforto e classificar os resíduos em categorias, tratando-os adequadamente."),
          fixed("consumo-responsavel", 1, "Planejar adequadamente e adquirir as quantidades dos alimentos para refeições em um acampamento para sua patrulha, evitando desperdício."),
        ],
        variableActions: [
          variable("consumo-responsavel", 0, "Registrar e analisar o consumo de água e energia da sua residência, buscando ideias para economizar, e apresentar para sua patrulha os resultados."),
          variable("consumo-responsavel", 1, "Avaliar o impacto ambiental de uma atividade e apresentar alternativas mais sustentáveis."),
          variable("consumo-responsavel", 2, "Visitar uma estação de energia renovável, uma estação de tratamento de água, uma cooperativa ou usina de reciclagem ou outras opções semelhantes."),
          variable("consumo-responsavel", 3, "Consertar objetos simples, como brinquedos ou pequenos eletrodomésticos."),
          variable("consumo-responsavel", 4, "Utilizar embalagens retornáveis ou reutilizáveis nas refeições de campo, evitando descartáveis."),
          variable("consumo-responsavel", 5, "Separar resíduos orgânicos e criar um sistema de compostagem caseira."),
          variable("consumo-responsavel", 6, "Criar uma campanha educativa para a tropa sobre consumo consciente e economia de recursos."),
          variable("consumo-responsavel", 7, "Trocar roupas, livros ou jogos com amigos e familiares em vez de comprar novos."),
          variable("consumo-responsavel", 8, "Organizar, com sua patrulha, uma campanha de conscientização sobre consumo responsável."),
          variable("consumo-responsavel", 9, "Confeccionar utensílios ou equipamentos a partir de materiais reciclados para uso nas atividades da patrulha."),
          variable("consumo-responsavel", 10, "Planejar e realizar as refeições de um dia de acampamento sem carne, garantindo a ingestão adequada de proteínas."),
          variable("consumo-responsavel", 11, "Organizar, cuidar e fazer reparos nos materiais da patrulha."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Horticultura"] },
          { type: "insignia", items: ["Reduzir, Reciclar, Reutilizar"] },
        ],
      },
      {
        id: "mudancas-climaticas",
        name: "Mudanças Climáticas",
        objective:
          "Participar de ações e projetos que ajudem a proteger o meio ambiente e enfrentar as mudanças do clima.",
        eixoId: "meio-ambiente",
        fixedActions: [],
        variableActions: [
          variable("mudancas-climaticas", 0, "Em um acampamento, criar uma estação meteorológica simples para registrar temperatura, umidade, direção do vento, nuvens e possíveis mudanças no tempo."),
          variable("mudancas-climaticas", 1, "Participar da construção de um fogão solar e usá-lo em um acampamento de patrulha ou tropa."),
          variable("mudancas-climaticas", 2, "Participar de uma excursão urbana com foco ecológico, identificando situações de risco para a sociedade referentes às mudanças climáticas."),
          variable("mudancas-climaticas", 3, "Visitar ou participar de uma atividade com uma organização que atua em prol do meio ambiente."),
          variable("mudancas-climaticas", 4, "Em uma excursão ou acampamento em área não urbana, identificar ações prejudiciais à natureza, como extrativismo e mineração, e listar seus impactos."),
          variable("mudancas-climaticas", 5, "Planejar e participar de uma excursão, utilizando meios de transporte que dependem de fontes de energia limpa (bicicleta, ônibus elétrico, embarcação a remo, entre outros)."),
          variable("mudancas-climaticas", 6, "Organizar, com sua patrulha ou tropa, um projeto de conscientização sobre o uso de energia e água em sua escola, condomínio ou sede da UEL."),
          variable("mudancas-climaticas", 7, "Participar de mutirões de plantio de mudas ou cultivo de uma horta em casa, na escola ou na UEL."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Meteorologia"] },
          { type: "insignia", items: ["Escoteiros pela Energia Solar"] },
        ],
      },
      {
        id: "preservacao-biodiversidade",
        name: "Preservação da Biodiversidade",
        objective:
          "Proteger os animais e as plantas, percebendo como nossas ações podem ajudar ou atrapalhar a natureza.",
        eixoId: "meio-ambiente",
        fixedActions: [
          fixed("preservacao-biodiversidade", 0, "Participar, em patrulha, de uma atividade de exploração em ambiente natural, reconhecendo a fauna e a flora locais e identificando riscos à preservação, além de propor soluções para evitá-los."),
        ],
        variableActions: [
          variable("preservacao-biodiversidade", 0, "Reconhecer os animais venenosos e peçonhentos da região e saber como agir em casos de picadas ou contaminação."),
          variable("preservacao-biodiversidade", 1, "Planejar e executar um projeto ambiental com a patrulha ou tropa."),
          variable("preservacao-biodiversidade", 2, "Plantar uma espécie nativa e observar seu crescimento, registrando cada etapa."),
          variable("preservacao-biodiversidade", 3, "Identificar as pegadas de pelo menos cinco animais da fauna brasileira e realizar levantamento das pegadas em áreas naturais."),
          variable("preservacao-biodiversidade", 4, "Participar de uma atividade de mergulho que tenha o objetivo de conhecer e explorar a vida na água."),
          variable("preservacao-biodiversidade", 5, "Participar de uma atividade de observação de animais noturnos com sua patrulha."),
          variable("preservacao-biodiversidade", 6, "Observar e registrar espécies de aves, insetos, plantas ou outros animais durante um acampamento ou excursão."),
          variable("preservacao-biodiversidade", 7, "Visitar parques, reservas ou centros de proteção ambiental para conhecer ações de preservação da fauna e da flora."),
          variable("preservacao-biodiversidade", 8, "Construir comedouros ou bebedouros para aves e instalar em áreas adequadas, acompanhando seu uso."),
          variable("preservacao-biodiversidade", 9, "Criar materiais educativos, como vídeos ou posts, sobre a importância de preservar a biodiversidade."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Ciências da Terra", "Zoologia", "Oceanologia", "Botânica"] },
          { type: "insignia", items: ["Campeões da Natureza"] },
        ],
      },
      {
        id: "vida-ao-ar-livre",
        name: "Vida ao Ar Livre",
        objective:
          "Aproveitar as atividades ao ar livre com respeito e cuidado, deixando cada lugar melhor do que encontrou.",
        eixoId: "meio-ambiente",
        fixedActions: [
          fixed("vida-ao-ar-livre", 0, "Montar o campo de patrulha com pioneirias como mesa, pórtico e canto do lenhador, utilizando amarras adequadas."),
          fixed("vida-ao-ar-livre", 1, "Aplicar os nós direito, correr, aselha, volta do fiel, escota, durante um acampamento sabendo sua utilização."),
          fixed("vida-ao-ar-livre", 2, "Escolher corretamente o local para montagem da barraca, incluindo técnicas de montagem, desmontagem e acondicionamento durante um acampamento de patrulha ou tropa."),
          fixed("vida-ao-ar-livre", 3, "Manusear corretamente ferramentas de corte e sapa durante um acampamento de patrulha ou tropa, zelando pela segurança e realizando reparos."),
          fixed("vida-ao-ar-livre", 4, "Preparar e executar uma fogueira para uma refeição mateira durante um acampamento de patrulha ou tropa, seguindo as técnicas de segurança."),
          fixed("vida-ao-ar-livre", 5, "Participar de ao menos duas excursões ao ar livre (patrulha ou tropa), utilizando normas de baixo impacto ambiental."),
          fixed("vida-ao-ar-livre", 6, "Participar de ao menos dois acampamentos ao ar livre (patrulha ou tropa), utilizando normas de baixo impacto ambiental."),
          fixed("vida-ao-ar-livre", 7, "Orientar-se com recursos naturais, bússola e mapa, utilizando azimutes."),
        ],
        variableActions: [
          variable("vida-ao-ar-livre", 0, "Participar de um percurso no campo de pelo menos 1 km utilizando sinais de pista."),
          variable("vida-ao-ar-livre", 1, "Colaborar na preparação de alimentos para a patrulha em pelo menos três atividades ao ar livre, sendo uma delas no estilo comida mateira, sem utensílios."),
          variable("vida-ao-ar-livre", 2, "Desenvolver soluções para purificação e consumo de água em um acampamento."),
          variable("vida-ao-ar-livre", 3, "Aplicar técnicas de \"tocaia\" em jogos com a patrulha."),
          variable("vida-ao-ar-livre", 4, "Participar da construção de um fogão suspenso ou forno de acampamento para o preparo de uma refeição."),
          variable("vida-ao-ar-livre", 5, "Construir e pernoitar em um bivaque ou abrigo natural durante uma atividade de patrulha."),
          variable("vida-ao-ar-livre", 6, "Confeccionar falcaças, nó catau, lais de guia, pescador, oito duplo e demonstrar cuidados com as cordas."),
          variable("vida-ao-ar-livre", 7, "Participar de uma atividade aquática com a tropa, seguindo as normas de segurança."),
          variable("vida-ao-ar-livre", 8, "Desenhar um croqui de um acampamento, usando sinais topográficos."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Acampamento", "Excursões", "Montanhismo", "Pioneiria", "Sobrevivência"] },
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
          "Realizar boas ações diariamente e trabalhar em equipe para organizar atividades e projetos de serviço.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("comunidade", 0, "Identificar, sozinho ou em patrulha, uma necessidade da comunidade e planejar e executar uma ação comunitária."),
          fixed("comunidade", 1, "Identificar os riscos de desastres naturais na comunidade e conhecer os hospitais e contatos de emergência, sabendo quando acionar cada um."),
        ],
        variableActions: [
          variable("comunidade", 0, "Aplicar o conhecimento adquirido nas especialidades em ações de serviço à comunidade."),
          variable("comunidade", 1, "Participar ativamente de pelo menos uma campanha de serviço e desenvolvimento comunitário organizadas pela UEL, distrito ou região."),
          variable("comunidade", 2, "Organizar uma oficina de brinquedos, doando os itens consertados para uma instituição que atende crianças carentes."),
          variable("comunidade", 3, "Colaborar em ações organizadas por outras instituições de serviço."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "especialidade", items: ["Defesa Civil"] },
          { type: "insignia", items: ["Mensageiros da Paz", "Insígnia da Ação Comunitária"] },
        ],
      },
      {
        id: "democracia",
        name: "Democracia",
        objective:
          "Participar das decisões da tropa, contribuindo com suas ideias, respeitando as opiniões dos colegas e se comprometendo a seguir o que foi decidido em conjunto.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("democracia", 0, "Participar ativamente das decisões do Conselho de Patrulha, contribuindo com ideias, votando e assumindo responsabilidades, respeitando os resultados."),
          fixed("democracia", 1, "Participar ativamente das decisões da Assembleia de Tropa, contribuindo com ideias, votando e assumindo responsabilidades, respeitando os resultados."),
          fixed("democracia", 2, "Participar da eleição do monitor da patrulha e das decisões de encargos, respeitando os resultados."),
        ],
        variableActions: [
          variable("democracia", 0, "Visitar a sede administrativa de qualquer um dos três poderes, e explicar a importância e as particularidades desta forma de governo, conhecendo a constituição e os símbolos nacionais, do estado e do município."),
          variable("democracia", 1, "Conhecer a estrutura do Grupo Escoteiro ou Seção Autônoma e participar de uma Assembleia de Grupo Escoteiro."),
          variable("democracia", 2, "Participar ativamente de um fórum de jovens do Grupo Escoteiro."),
          variable("democracia", 3, "Aprender e compartilhar sobre a história do voto e da democracia no Brasil."),
        ],
        variableRequired: 2,
        alternativeCompletions: [],
      },
      {
        id: "heranca-cultural",
        name: "Herança Cultural",
        objective:
          "Conhecer e valorizar as histórias, os costumes e os lugares da sua comunidade e país, e propor atividades para compartilhar esses conhecimentos com os outros.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("heranca-cultural", 0, "Realizar o hasteamento ou arriamento da bandeira em cerimônia de abertura ou encerramento de atividade."),
        ],
        variableActions: [
          variable("heranca-cultural", 0, "Desenvolver sua \"Árvore Genealógica\", pesquisando seu sobrenome, significado e a história dos seus antepassados, situando-os no contexto histórico, e apresentá-la para sua patrulha."),
          variable("heranca-cultural", 1, "Participar das cerimônias com os símbolos nacionais e cantar o Hino Nacional corretamente."),
          variable("heranca-cultural", 2, "Apresentar para sua patrulha ou tropa histórias de mulheres que se destacaram em nosso país."),
          variable("heranca-cultural", 3, "Participar, com sua patrulha, de uma comemoração ou festa típica da sua região."),
          variable("heranca-cultural", 4, "Participar, com sua patrulha, de um safari fotográfico em sua cidade, identificando os locais de importância histórica da localidade."),
          variable("heranca-cultural", 5, "Participar de um jantar festivo representando um estado diferente do seu."),
          variable("heranca-cultural", 6, "Aplicar jogos e atividades típicas da sua região."),
          variable("heranca-cultural", 7, "Visitar museus, centros culturais ou pontos históricos locais para conhecer o patrimônio da região."),
          variable("heranca-cultural", 8, "Investigar lendas, histórias ou personagens do folclore brasileiro e dramatizá-los em esquetes no Fogo de Conselho."),
          variable("heranca-cultural", 9, "Aplicar canções e danças típicas do Brasil."),
          variable("heranca-cultural", 10, "Confeccionar artesanato típico de alguma região do Brasil."),
          variable("heranca-cultural", 11, "Apresentar a cultura da sua cidade em um evento regional ou nacional, como feira de cidades ou noite folclórica."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Brasilidades", "Genealogia", "Informações Turísticas", "Tradições dos Povos Indígenas"] },
        ],
      },
      {
        id: "promocao-da-paz",
        name: "Promoção da Paz",
        objective:
          "Agir com respeito no dia a dia, acolhendo as diferenças, buscando conhecer crenças, culturas e jeitos de viver diferentes do seu.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("promocao-da-paz", 0, "Aplicar uma atividade para a patrulha sobre Direitos Humanos ou os Direitos da Criança e do Adolescente."),
        ],
        variableActions: [
          variable("promocao-da-paz", 0, "Convidar a patrulha a cooperar em ações organizadas por uma comunidade em favor de pessoas vulneráveis."),
          variable("promocao-da-paz", 1, "Participar de uma excursão com sua patrulha ou tropa visitando diferentes templos e conhecendo um pouco mais sobre cada religião."),
          variable("promocao-da-paz", 2, "Participar de eventos de trocas culturais entre jovens de diferentes origens para estimular o respeito mútuo."),
          variable("promocao-da-paz", 3, "Participar de uma atividade com outro grupo escoteiro ou seção autônoma e refletir sobre o que é Fraternidade Mundial Escoteira."),
          variable("promocao-da-paz", 4, "Conhecer as diferentes denominações de fé e crença de amigos da patrulha, tropa, escola e comunidade."),
          variable("promocao-da-paz", 5, "Promover uma campanha que incentive atitudes de respeito e cooperação entre todos."),
          variable("promocao-da-paz", 6, "Convidar representantes de diferentes crenças para compartilhar experiências e responder perguntas da tropa."),
          variable("promocao-da-paz", 7, "Criar com sua patrulha ou seção um calendário de celebrações religiosas das diferentes denominações de fé e crença ali presentes."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "insignia", items: ["Insígnia da Lusofonia", "Insígnia do Cone Sul", "Diálogos pela Paz"] },
        ],
      },
      {
        id: "valores",
        name: "Valores",
        objective:
          "Colocar em prática a Promessa e a Lei Escoteira em tudo que faz, demonstrando, com atitudes, que vive os valores que acredita.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("valores", 0, "Avaliar, com seus companheiros de patrulha, a vivência da Promessa e Lei Escoteira."),
        ],
        variableActions: [
          variable("valores", 0, "Participar da avaliação da sua Progressão Pessoal e dos companheiros da patrulha."),
          variable("valores", 1, "Explicar o significado da Lei e da Promessa Escoteira aos novos membros da patrulha."),
          variable("valores", 2, "Auxiliar um companheiro de patrulha a realizar sua Promessa Escoteira."),
          variable("valores", 3, "Explicar aos novos membros da patrulha os significados da flor-de-lis e da Saudação Escoteira."),
          variable("valores", 4, "Conhecer e cantar o Hino Alerta."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "especialidade", items: ["Escotismo Mundial"] },
        ],
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
          "Compreender as mudanças do seu corpo e respeitar as diferenças entre as pessoas, sem julgar pela aparência ou jeito de ser. Se cuidar, superar desafios físicos e aprender a ajudar em situações simples com primeiros socorros.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("cuidado-com-o-corpo", 0, "Conhecer as ações iniciais em acidentes e como cuidar de: pequenos cortes, contusões, escoriações, queimaduras e picadas de animais peçonhentos."),
          fixed("cuidado-com-o-corpo", 1, "Aplicar técnicas de bandagens e transporte de feridos."),
          fixed("cuidado-com-o-corpo", 2, "Cuidar da segurança física e mental nas atividades escoteiras, respeitando os limites próprios e dos outros, e seguindo as orientações dos escotistas."),
        ],
        variableActions: [
          variable("cuidado-com-o-corpo", 0, "Conhecer as medidas do seu corpo (palmo, envergadura, passo simples e duplo) e aplicá-las durante uma excursão com sua patrulha."),
          variable("cuidado-com-o-corpo", 1, "Participar de uma atividade, oficina, palestra que trate dos malefícios dos seguintes assuntos: anorexia, bulimia, drogas, álcool, cigarro e cigarros eletrônicos."),
          variable("cuidado-com-o-corpo", 2, "Saber contato dos órgãos de emergência e saber como informar os sinais vitais e situação da vítima."),
          variable("cuidado-com-o-corpo", 3, "Participar de uma simulação de acidente e atuar em conjunto com a sua patrulha."),
          variable("cuidado-com-o-corpo", 4, "Proteger-se do sol e do frio durante as atividades, identificando casos de desidratação e insolação, e respeitar os limites do seu corpo."),
          variable("cuidado-com-o-corpo", 5, "Demonstrar como ajudar uma pessoa em casos de obstrução das vias aéreas e convulsões."),
          variable("cuidado-com-o-corpo", 6, "Conhecer os itens que compõem a caixa de primeiros socorros da patrulha e mantê-la organizada."),
          variable("cuidado-com-o-corpo", 7, "Saber agir em casos de hemorragia."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Anatomia Humana", "Prevenção em Saúde", "Primeiros Socorros"] },
        ],
      },
      {
        id: "espiritualidade",
        name: "Espiritualidade",
        objective:
          "Explorar a espiritualidade ao se encantar com a natureza, ser solidário e conhecer diferentes crenças. Procurar viver com sentido e seguir seus princípios todos os dias.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [],
        variableActions: [
          variable("espiritualidade", 0, "Fazer reflexões espirituais rotineiras na tropa ou patrulha, ao ar livre."),
          variable("espiritualidade", 1, "Apresentar um pequeno relato à patrulha ou tropa sobre os ensinamentos de sua crença ou religião."),
          variable("espiritualidade", 2, "Auxiliar na realização de uma celebração de sua comunidade religiosa."),
          variable("espiritualidade", 3, "Celebrar sua crença ou religião regularmente."),
          variable("espiritualidade", 4, "Colaborar na organização de um culto interconfessional em uma atividade escoteira."),
          variable("espiritualidade", 5, "Participar de um momento de reflexão e conexão com um ambiente natural em que possa apreciar e agradecer a beleza do mundo natural."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Yoga"] },
          { type: "insignia", items: ["Diálogo Inter-religioso"] },
        ],
      },
      {
        id: "habitos-saudaveis",
        name: "Hábitos Saudáveis",
        objective:
          "Cuidar da sua saúde fazendo atividades físicas, comendo de maneira equilibrada, mantendo bons hábitos de higiene e deixando seu espaço sempre limpo e organizado.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("habitos-saudaveis", 0, "Planejar e executar um cardápio completo e saudável (café da manhã, almoço e jantar) para a patrulha em acampamento."),
          fixed("habitos-saudaveis", 1, "Conhecer e aplicar normas de limpeza no tratamento e conservação de alimentos nas atividades de patrulha."),
        ],
        variableActions: [
          variable("habitos-saudaveis", 0, "Manter hábitos de higiene pessoal, utilizar o vestuário ou uniforme adequadamente, demonstrando aplicação correta dos distintivos."),
          variable("habitos-saudaveis", 1, "Contribuir para manter a sede do grupo e canto de patrulha em ordem e em perfeito estado de conservação."),
          variable("habitos-saudaveis", 2, "Montar um cronograma semanal, equilibrando estudos, responsabilidades e momentos de lazer."),
          variable("habitos-saudaveis", 3, "Praticar uma atividade física regularmente."),
          variable("habitos-saudaveis", 4, "Promover um piquenique com alimentos saudáveis com sua patrulha ou tropa."),
          variable("habitos-saudaveis", 5, "Manter adequada rotina de sono e alimentação saudável."),
          variable("habitos-saudaveis", 6, "Saber o que são as indicações de rótulos, o que são gorduras saturadas, conservantes, corantes além dos selos de advertência."),
          variable("habitos-saudaveis", 7, "Arrumar e limpar seu quarto e contribuir nas rotinas da casa."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "especialidade", items: ["Noções Desportivas", "Nutrição"] },
        ],
      },
      {
        id: "saude-mental",
        name: "Saúde Mental",
        objective:
          "Adotar atitudes que ajudam a cuidar da sua saúde mental, encontrando formas de lidar com os desafios do dia a dia e colaborar para que todos se sintam bem ao seu redor.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("saude-mental", 0, "Conhecer o conceito de Espaços Seguros e aplicá-los em todas as atividades de sua patrulha ou tropa."),
          fixed("saude-mental", 1, "Aprender a identificar sinais de tristeza ou isolamento em colegas e saber como oferecer apoio inicial, como conversar com respeito e buscar ajuda de um adulto de confiança."),
        ],
        variableActions: [
          variable("saude-mental", 0, "Participar de uma atividade sobre a importância do autocuidado e da saúde mental."),
          variable("saude-mental", 1, "Conduzir uma sessão de relaxamento como yoga, meditação, caminhadas silenciosas na natureza, alongamentos, entre outras, para sua patrulha ou tropa."),
          variable("saude-mental", 2, "Organizar sua rotina de atividades semanais, considerando a importância do equilíbrio entre as atividades do mundo digital e real e realizar uma atividade de bem-estar offline."),
          variable("saude-mental", 3, "Propor momentos de descontração com a família ao ar livre, evitando o uso da tecnologia e compartilhar como foi a experiência."),
          variable("saude-mental", 4, "Participar com sua patrulha de uma atividade que promova o contato com seus sentidos e promova momentos de equilíbrio emocional como por exemplo: uma trilha sensorial, pintura livre, roda de canções, observação de céu ou fogueira, entre outros."),
        ],
        variableRequired: 2,
        alternativeCompletions: [
          { type: "especialidade", items: ["Prevenção aos Vícios"] },
        ],
      },
      {
        id: "vinculos-saudaveis",
        name: "Vínculos Saudáveis",
        objective:
          "Fazer amizades de um jeito saudável e respeitoso, tratando os outros com empatia, construindo relações positivas no dia a dia.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("vinculos-saudaveis", 0, "Realizar uma campanha para combater o bullying e cyberbullying para a comunidade."),
        ],
        variableActions: [
          variable("vinculos-saudaveis", 0, "Participar de jogos com a patrulha ou a tropa, respeitando as regras e seus participantes."),
          variable("vinculos-saudaveis", 1, "Organizar uma atividade de patrulha em sua casa ou na casa de um membro da patrulha."),
          variable("vinculos-saudaveis", 2, "Ensinar uma canção escoteira a outros escoteiros."),
          variable("vinculos-saudaveis", 3, "Ajudar outro membro da UEL a conquistar uma especialidade ou insígnias."),
          variable("vinculos-saudaveis", 4, "Propor metas para melhorar a convivência na vida na patrulha e na tropa, compreendendo como todos se sentem quanto a isso."),
          variable("vinculos-saudaveis", 5, "Participar de uma atividade entre diferentes grupos escoteiros ou atividade regional ou nacional."),
          variable("vinculos-saudaveis", 6, "Acolher os novos integrantes da patrulha."),
          variable("vinculos-saudaveis", 7, "Assumir tarefas domésticas para melhorar a convivência em casa."),
          variable("vinculos-saudaveis", 8, "Participar de uma atividade da tropa com a família ou responsáveis."),
          variable("vinculos-saudaveis", 9, "Convidar um colega da mesma faixa etária para participar de um Fogo de Conselho, integrado à sua patrulha e com o devido \"Registro de Visitante\"."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Prevenção ao Bullying"] },
        ],
      },
    ],
  },
];
