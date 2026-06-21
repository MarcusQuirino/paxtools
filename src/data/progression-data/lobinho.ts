import type { Eixo, Action } from "../types";

function fixed(blocoId: string, index: number, text: string): Action {
  return { id: `lobinho:${blocoId}:fixed:${index}`, text, type: "fixed" };
}

function variable(blocoId: string, index: number, text: string): Action {
  return { id: `lobinho:${blocoId}:variable:${index}`, text, type: "variable" };
}

export const EIXOS_LOBINHO: Eixo[] = [
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
          "Se interessar por diversos temas, aprender com diferentes pessoas e consultar várias fontes para ampliar seu conhecimento, explorando novas ideias e recursos nas atividades.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("aprendizagem-continua", 0, "Conquistar uma especialidade sobre um tema de seu interesse e que seja um conhecimento novo."),
        ],
        variableActions: [
          variable("aprendizagem-continua", 0, "Escolher um novo idioma e aprender cinco frases úteis."),
          variable("aprendizagem-continua", 1, "Contar para a alcateia a história de um livro que tenha lido."),
          variable("aprendizagem-continua", 2, "Conhecer uma biblioteca e pedir a recomendação de um livro ao bibliotecário, sobre temas de seu interesse."),
          variable("aprendizagem-continua", 3, "Demonstrar para a alcateia um conhecimento ou habilidade que possui."),
          variable("aprendizagem-continua", 4, "Ouvir a história \"O aguilhão do rei\" e contar suas conclusões."),
          variable("aprendizagem-continua", 5, "Com a ajuda dos responsáveis, escrever uma carta para um Velho Lobo e enviá-la pelo correio ou por e-mail."),
          variable("aprendizagem-continua", 6, "Apresentar à alcateia uma profissão de seu interesse, explicando os requisitos necessários para exercê-la."),
          variable("aprendizagem-continua", 7, "Demonstrar para a alcateia uma habilidade que aprendeu com outra pessoa (familiares, amigos ou convidados)."),
          variable("aprendizagem-continua", 8, "Montar um \"diário de curiosidades\" com cinco coisas novas aprendidas e contar para a alcateia."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "insignia", items: ["Insígnia do Aprender"] },
        ],
      },
      {
        id: "autonomia-lideranca",
        name: "Autonomia e Liderança",
        objective:
          "Participar das atividades com responsabilidade, cumprindo com suas tarefas e ajudando sempre que possível. Refletir sobre suas experiências, fazer escolhas conscientes e aprender a usar o dinheiro de forma responsável no dia a dia.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("autonomia-lideranca", 0, "Organizar os materiais individuais e arrumar sua mochila para um acampamento de alcateia."),
        ],
        variableActions: [
          variable("autonomia-lideranca", 0, "Avaliar as atividades das quais participou, identificando pontos positivos e negativos e sugerindo melhorias."),
          variable("autonomia-lideranca", 1, "Fazer uma compra e prestar contas do pagamento."),
          variable("autonomia-lideranca", 2, "Conhecer os meios de transporte, farmácias, correios, hospitais, supermercados, pontos de ônibus/estações de trem/metrô, igrejas e parques próximos à sua casa."),
          variable("autonomia-lideranca", 3, "Participar de uma atividade sobre o uso do dinheiro de forma responsável."),
          variable("autonomia-lideranca", 4, "Identificar riscos domésticos (facas, fogo, eletricidade, gás, janelas, etc.) e realizar uma ação para prevenir acidentes (cartaz, panfleto, entre outros)."),
          variable("autonomia-lideranca", 5, "Registrar em um quadro ou tabela simples como usou o dinheiro da mesada."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Empreendedorismo", "Educação Financeira", "Administração", "Reparos Domésticos", "Oratória"] },
        ],
      },
      {
        id: "criatividade-inovacao",
        name: "Criatividade e Inovação",
        objective:
          "Utilizar a criatividade para encontrar diferentes soluções para desafios do dia a dia, experimentando novas maneiras de resolver problemas.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [
          fixed("criatividade-inovacao", 0, "Construir uma engenhoca simples (varal, suporte de panela)."),
        ],
        variableActions: [
          variable("criatividade-inovacao", 0, "Em uma atividade de trabalhos manuais, utilizar a técnica de embrulho de presente e encapar um livro para sua melhor conservação."),
          variable("criatividade-inovacao", 1, "Costurar um distintivo em seu uniforme ou vestuário escoteiro."),
          variable("criatividade-inovacao", 2, "Criar e apresentar com sua matilha uma esquete em uma Flor Vermelha."),
          variable("criatividade-inovacao", 3, "Divulgar sua UEL na escola por meio de cartazes, depoimentos, vídeos e folders."),
          variable("criatividade-inovacao", 4, "Apresentar um trabalho artístico para sua alcateia, como: pintura, modelagem, colagem, etc."),
          variable("criatividade-inovacao", 5, "Planejar, organizar e executar um pequeno projeto científico, artístico ou utilitário."),
          variable("criatividade-inovacao", 6, "Ensinar um jogo para outros lobinhos."),
          variable("criatividade-inovacao", 7, "Durante uma Flor Vermelha,  utilizando diversos materiais, para criar uma caracterização."),
          variable("criatividade-inovacao", 8, "Criar um código simples (cores, símbolos ou sons) para enviar uma mensagem para outro lobinho decifrar."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Arte Digital", "Artes Visuais", "Artesanato", "Comédia", "Costura e Estilismo", "Encadernação", "Grafite", "HQ", "Maquete", "Pintura", "Propaganda e Marketing", "Robótica", "Videomaker"] },
        ],
      },
      {
        id: "inteligencia-emocional",
        name: "Inteligência Emocional",
        objective:
          "Reconhecer suas emoções e aprender a lidar com diferentes situações, buscando sempre tirar lições de cada experiência.",
        eixoId: "habilidades-para-a-vida",
        fixedActions: [],
        variableActions: [
          variable("inteligencia-emocional", 0, "Conversar com a família, responsáveis ou Velhos Lobos sobre pontos que gosta e não gosta em si mesmo e como melhorá-los."),
          variable("inteligencia-emocional", 1, "Contar a um Velho Lobo sobre um momento difícil recente e descrever o que ajudou a melhorar a situação."),
          variable("inteligencia-emocional", 2, "Cantar canções com a alcateia e participar de uma dança da Jângal."),
          variable("inteligencia-emocional", 3, "Identificar situações perigosas, sabendo como agir e a quem recorrer."),
          variable("inteligencia-emocional", 4, "Escolher um pequeno desafio que dá insegurança (ex.: falar em público) e tentar superá-lo; depois contar a um Velho Lobo o que mudou."),
          variable("inteligencia-emocional", 5, "Aprender e ensinar para a alcateia uma atividade de relaxamento."),
        ],
        variableRequired: 5,
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
          "Usar apenas o necessário, evitando desperdícios e consumindo de forma consciente para preservar os recursos naturais.",
        eixoId: "meio-ambiente",
        fixedActions: [
          fixed("consumo-responsavel", 0, "Participar de um piquenique, excursão ou acampamento com a alcateia, sem a utilização de plásticos descartáveis."),
        ],
        variableActions: [
          variable("consumo-responsavel", 0, "Separar e classificar materiais para coleta seletiva do lixo em casa."),
          variable("consumo-responsavel", 1, "Observar os rótulos e as embalagens dos produtos usados no dia a dia, entender sua origem e destino, e conversar com os Velhos Lobos sobre o tema."),
          variable("consumo-responsavel", 2, "Consertar roupas ou brinquedos com a ajuda de adultos."),
          variable("consumo-responsavel", 3, "Adotar diariamente práticas sustentáveis, como apagar luzes, separar o lixo e reduzir o uso de plástico, motivando o seu entorno a fazer o mesmo."),
          variable("consumo-responsavel", 4, "Escolher frutas e vegetais da estação e produzidos localmente e utilizá-los em um lanche coletvo da alcateia."),
          variable("consumo-responsavel", 5, "Nas refeições, colocar apenas a quantidade de comida que vai consumir e aproveitar as sobras quando possível."),
          variable("consumo-responsavel", 6, "Selecionar brinquedos e roupas em bom estado e doar para uma campanha, ação comunitária ou instituição de caridade."),
          variable("consumo-responsavel", 7, "Reutilizar cadernos com folhas sobrando e outros materiais escolares, como mochilas ou estojos em bom estado."),
          variable("consumo-responsavel", 8, "Cuidar dos materiais da sua alcateia."),
          variable("consumo-responsavel", 9, "Evitar desperdício de água, fechando a torneira ao escovar os dentes ou lavar a louça e reduzindo o tempo de banho, sem ficar com a água ligada sem necessidade."),
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
          "Cuidar do planeta adotando hábitos que ajudam a reduzir os impactos das mudanças climáticas no dia a dia.",
        eixoId: "meio-ambiente",
        fixedActions: [],
        variableActions: [
          variable("mudancas-climaticas", 0, "Reconhecer na natureza os sinais de mudança do tempo."),
          variable("mudancas-climaticas", 1, "Cultivar uma horta sozinho ou com a alcateia, promovendo o cuidado com a natureza."),
          variable("mudancas-climaticas", 2, "Realizar uma experiência de condensação do vapor da água, relacionando-a com as nuvens e as chuvas."),
          variable("mudancas-climaticas", 3, "Participar de uma caçada urbana para identificar práticas prejudiciais e sustentáveis para a natureza, e sugerir soluções."),
          variable("mudancas-climaticas", 4, "Participar de um plantio de árvores em áreas urbanas e discutir com os Velhos Lobos sobre a importância da arborização."),
          variable("mudancas-climaticas", 5, "Conversar com os Velhos Lobos sobre como as ações cotidianas afetam as mudanças climáticas."),
          variable("mudancas-climaticas", 6, "Visitar um local que use energia renovável para entender seu impacto."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Meteorologia"] },
          { type: "insignia", items: ["Escoteiros pela Energia Solar"] },
        ],
      },
      {
        id: "preservacao-biodiversidade",
        name: "Preservação da Biodiversidade",
        objective:
          "Usar apenas o necessário, evitando desperdícios e consumindo de forma consciente para preservar os recursos naturais.",
        eixoId: "meio-ambiente",
        fixedActions: [
          fixed("preservacao-biodiversidade", 0, "Explorar a fauna e a flora local em uma atividade com a alcateia, compreendendo a importância da preservação."),
        ],
        variableActions: [
          variable("preservacao-biodiversidade", 0, "Cuidar de uma planta ou de um animal de estimação em casa, demonstrando estes cuidados para a alcateia."),
          variable("preservacao-biodiversidade", 1, "Em uma atividade ao ar livre com a alcateia, identificar as características da região onde mora, como relevo, clima, hidrografia, bioma, fauna e flora."),
          variable("preservacao-biodiversidade", 2, "Criar um \"diário da biodiversidade\", registrando plantas, animais e insetos encontrados na vizinhança."),
          variable("preservacao-biodiversidade", 3, "Participar, com a alcateia, da limpeza de praias, rios ou parques."),
          variable("preservacao-biodiversidade", 4, "Visitar um zoológico, jardim botânico, abrigo de animais, horto florestal, viveiro de plantas ou propriedade rural de produção agrícola."),
          variable("preservacao-biodiversidade", 5, "Plantar flores que atraem abelhas e borboletas, discutindo com os Velhos Lobos sobre o papel desses insetos na reprodução das plantas."),
          variable("preservacao-biodiversidade", 6, "Ler ou ouvir histórias sobre animais em ameaça de extinção, florestas e a importância dos ecossistemas e explicar a um Velho Lobo."),
          variable("preservacao-biodiversidade", 7, "Montar comedouros simples para atrair aves para o quintal/varanda ou para a UEL."),
          variable("preservacao-biodiversidade", 8, "Criar ecossistemas em miniatura, como terrários ou aquários, e observar a convivência entre os seres."),
          variable("preservacao-biodiversidade", 9, "Pesquisar um animal nativo ameaçado da região, fazer um cartaz para a alcateia e sugerir como ajudar sua preservação."),
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
          "Aproveitar as atividades ao ar livre com responsabilidade, sempre cuidando da natureza e deixando os lugares melhores do que o encontrado.",
        eixoId: "meio-ambiente",
        fixedActions: [
          fixed("vida-ao-ar-livre", 0, "Explorar a fauna e a flora local em uma atividade com a alcateia, compreendendo a importância da preservação."),
          fixed("vida-ao-ar-livre", 1, "Aplicar os seguintes nós: direito, escota alceado, aselha, de correr e volta do fiel, sabendo suas funções, durante um acampamento com a alcateia."),
          fixed("vida-ao-ar-livre", 2, "Montar, pernoitar, demontar e acondicionar corretamente a barraca durante um acampamento."),
          fixed("vida-ao-ar-livre", 3, "Acender uma pequena fogueira para fazer uma bebida quente ou lanche, demonstrando as técnicas de segurança no uso de fósforos e acendedores, em um acampamento com a alcateia."),
          fixed("vida-ao-ar-livre", 4, "Conhecer a Rosa dos Ventos e a constelação do Cruzeiro do Sul, usando-os para sua orientação."),
          fixed("vida-ao-ar-livre", 5, "Participar de pelo menos dois acampamentos ou acantonamentos com a alcateia."),
          fixed("vida-ao-ar-livre", 6, "Cozinhar um prato de comida mateira com a alcateia."),
        ],
        variableActions: [
          variable("vida-ao-ar-livre", 0, "Percorrer uma pista de obstáculos em uma atividade da alcateia."),
          variable("vida-ao-ar-livre", 1, "Participar de caçadas ao ar livre com a alcateia, seguindo as regras de etiqueta e de segurança para trilhas."),
          variable("vida-ao-ar-livre", 2, "Participar de jogos ao ar livre com a alcateia."),
          variable("vida-ao-ar-livre", 3, "Em uma caminhada com a alcateia, observar a natureza, identificar diferentes sons e agradecer por sua existência."),
        ],
        variableRequired: 4,
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
          "Praticar boas ações diariamente, seja em casa, na escola ou na comunidade, contribuindo para tornar o mundo um lugar melhor.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("comunidade", 0, "Identificar, com sua alcateia, uma necessidade da UEL e participar de uma ação coletiva de melhoria."),
          fixed("comunidade", 1, "Conhecer os hospitais próximos à sua casa e os contatos de emergência (Bombeiros, SAMU, Polícia)."),
        ],
        variableActions: [
          variable("comunidade", 0, "Participar ativamente, com sua alcateia ou grupo escoteiro, de uma campanha de ajuda ao próximo"),
          variable("comunidade", 1, "Visitar um lar de idosos, creche ou entidade assistencial, prestando apoio conforme necessidade."),
          variable("comunidade", 2, "Identificar uma forma de praticar uma Boa Ação e realizá-la."),
          variable("comunidade", 3, "Conhecer ações solidárias realizadas por instituições de sua comunidade."),
          variable("comunidade", 4, "Preparar e entregar cartinhas, desenhos ou mensagens de carinho para pessoas em hospitais ou instituições."),
          variable("comunidade", 5, "Participar de uma ação de apoio a animais, como arrecadação de ração para abrigos."),
          variable("comunidade", 6, "Com a ajuda de sua família, separar brinquedos ou roupas em bom estado para doação e relatar para onde foram."),
        ],
        variableRequired: 3,
        alternativeCompletions: [
          { type: "especialidade", items: ["Defesa Civil"] },
          { type: "insignia", items: ["Mensageiros da Paz", "Insígnia da Boa Ação"] },
        ],
      },
      {
        id: "democracia",
        name: "Democracia",
        objective:
          "Ajudar na tomada de decisões em grupo, respeitando as escolhas coletivas e colaborando para que todos sejam ouvidos.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("democracia", 0, "Participar ativamente de uma Roca de Conselho, expressando opiniões de forma respeitosa."),
          fixed("democracia", 1, "Conhecer a história \"Caçadas de Kaa\" e discutir com os companheiros a conduta dos personagens."),
          fixed("democracia", 2, "Participar da eleição de primo e segundo da matilha e combinar suas responsabilidades."),
        ],
        variableActions: [
          variable("democracia", 0, "Visitar a câmara de vereadores ou prefeitura, discutindo com os Velhos Lobos o que aprendeu."),
          variable("democracia", 1, "Participar de um fórum de grupo escoteiro."),
          variable("democracia", 2, "Participar de um debate com a alcateia, sobre um tema de interesse dos lobinhos."),
          variable("democracia", 3, "Participar de um jogo democrático com a alcateia."),
          variable("democracia", 4, "Participar da criação de um \"acordo de convivência\" da alcateia (ou conhecê-lo) e assiná-lo."),
        ],
        variableRequired: 2,
        alternativeCompletions: [],
      },
      {
        id: "heranca-cultural",
        name: "Herança Cultural",
        objective:
          "Descobrir e valorizar a cultura da sua comunidade e do seu país, explorando histórias, tradições e costumes em atividades divertidas.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("heranca-cultural", 0, "Realizar o hasteamento ou arriamento da Bandeira Nacional em cerimônia de abertura ou de encerramento de atividade."),
        ],
        variableActions: [
          variable("heranca-cultural", 0, "Criar um álbum com fotos (ou desenhos), histórias e tradições familiares de onde vive."),
          variable("heranca-cultural", 1, "Aprender e cantar o Hino Nacional Brasileiro com a alcateia e conhecer os elementos e o simbolismo da Bandeira Nacional, demonstrando respeito por estes símbolos."),
          variable("heranca-cultural", 2, "Contar ou encenar, em uma Flor Vermelha, a história de uma pessoa que teve destaque na história do Brasil ou da sua cidade."),
          variable("heranca-cultural", 3, "Participar de atividades sobre a cultura popular brasileira."),
          variable("heranca-cultural", 4, "Visitar um museu histórico com a alcateia e contar o que mais chamou a atenção."),
          variable("heranca-cultural", 5, "Preparar e degustar, com a sua alcateia, uma receita típica de sua cidade ou região."),
          variable("heranca-cultural", 6, "Reproduzir jogos e brincadeiras típicas de diferentes épocas ou culturas, como amarelinha ou pião."),
          variable("heranca-cultural", 7, "Conversar com avós ou membros mais velhos da comunidade sobre histórias do passado."),
          variable("heranca-cultural", 8, "Participar de feiras, festas ou eventos que celebrem tradições locais."),
          variable("heranca-cultural", 9, "Aprender alguma técnica de artesanato local e produzir um presente."),
          variable("heranca-cultural", 10, "Apresentar uma canção, dança ou brincadeira folclórica do Brasil em uma Flor Vermelha."),
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
          "Participar de atividades que promovem a paz e o respeito entre as pessoas, aprendendo a conviver com diferentes crenças e formas de pensar.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("promocao-da-paz", 0, "Ouvir as histórias \"Flor Vermelha\" e \"Irmãos de Mowgli\", do Livro da Jângal."),
        ],
        variableActions: [
          variable("promocao-da-paz", 0, "Participar de jogos e atividades relacionados ao diálogo e a cultura de paz."),
          variable("promocao-da-paz", 1, "Visitar um templo de uma religião diferente da sua e, após a visita, expressar suas impressões por meio de um desenho ou depoimento."),
          variable("promocao-da-paz", 2, "Organizar e apresentar um jogo tradicional de outro país, promovendo troca cultural e cooperação."),
          variable("promocao-da-paz", 3, "Visitar outra UEL e refletir sobre o que é a Fraternidade Escoteira."),
          variable("promocao-da-paz", 4, "Participar de uma \"feira cultural\" com comidas, músicas, danças e vestimentas típicas de diferentes países, envolvendo a matilha e as famílias ou responsáveis."),
          variable("promocao-da-paz", 5, "Criar com sua alcateia um mural sobre as religiões do mundo, expressando artisticamente as principais características (símbolos, datas comemorativas, etc.)."),
          variable("promocao-da-paz", 6, "Conhecer uma festa ou celebração de uma religião diferente da sua e apresentar para sua alcateia."),
          variable("promocao-da-paz", 7, "Apresentar com a alcateia, em uma Flor Vermelha, uma esquete sobre a cultura de outro país."),
          variable("promocao-da-paz", 8, "Registrar no calendário as celebrações religiosas e as festividades das crenças ou religiões dos membros da alcateia."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "insignia", items: ["Insígnia da Lusofonia", "Insígnia do Cone Sul", "Diálogos pela Paz"] },
        ],
      },
      {
        id: "valores",
        name: "Valores",
        objective:
          "Agir sempre de acordo com os valores da Promessa do Lobinho, sendo amigo, legal e prestativo com todos ao seu redor.",
        eixoId: "paz-e-desenvolvimento",
        fixedActions: [
          fixed("valores", 0, "Ouvir a história \"Tigre Tigre\" e comparar a conduta de Mowgli com a sua Promessa de Lobinho."),
        ],
        variableActions: [
          variable("valores", 0, "Contar a um Velho Lobo sobre três boas ações que praticou."),
          variable("valores", 1, "Explicar o significado da Lei e da Promessa do Lobinho a um novo lobinho da alcateia."),
          variable("valores", 2, "Ensinar aos novos membros da alcateia o aperto de mão e a Saudação do Lobinho."),
          variable("valores", 3, "Participar com a alcateia de jogos distintos, respeitando as suas regras e agindo com cordialidade."),
          variable("valores", 4, "Escrever ou desenhar uma história sobre uma situação em que agiu conforme os ensinamentos da Lei e da Promessa do Lobinho."),
          variable("valores", 5, "Saber quem é Baloo e o motivo dele ensinar a viver de acordo com a Lei da Jângal."),
          variable("valores", 6, "Discutir com um Velho Lobo as principais regras dos locais onde convive, compreendendo a importância do respeito."),
        ],
        variableRequired: 5,
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
          "Conhecer seu corpo, entender as diferenças entre as pessoas e realizar atividades que desenvolvem sua agilidade, força e flexibilidade. Conhecer técncias básicas de primeiros socorros para ajudar em situações simples.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("cuidado-com-o-corpo", 0, "Saber realizar os primeiros socorros em cortes, queimaduras e outros pequenos ferimentos."),
          fixed("cuidado-com-o-corpo", 1, "Saber utilizar ataduras e tipoias."),
          fixed("cuidado-com-o-corpo", 2, "Saber usar um termômetro."),
          fixed("cuidado-com-o-corpo", 3, "Cuidar de sua segurança e dos demais nas atividades da alcateia, seguindo as orientações dos Velhos Lobos."),
        ],
        variableActions: [
          variable("cuidado-com-o-corpo", 0, "Em atividades da alcateia, mostrar que conhece os limites do próprio corpo e dos demais, respeitando a privacidade de cada um."),
          variable("cuidado-com-o-corpo", 1, "Participar de atividades voltadas à prevenção das doenças mais comuns na infância (viroses, febre, gripe, dengue, catapora, caxumba, sarampo, etc.), identificando seus sintomas e aprendendo formas de prevenção."),
          variable("cuidado-com-o-corpo", 2, "Proteger-se do calor e do frio nas atividades da alcateia, utilizando boné, protetor solar, blusas para o frio, beber água e respeitar os limites do seu corpo."),
          variable("cuidado-com-o-corpo", 3, "Realizar atividades físicas desafiadoras, como passar por uma falsa baiana, subir em uma árvore, dar cambalhota ou fazer estrela."),
          variable("cuidado-com-o-corpo", 4, "Durante o Jogo do Kim, acertar a maioria dos objetos usando visão, audição, tato, olfato ou paladar."),
          variable("cuidado-com-o-corpo", 5, "Conhecer e saber utilizar os recursos da caixa de primeiros socorros da alcateia."),
          variable("cuidado-com-o-corpo", 6, "Fazer um checklist de segurança para a próxima atividade ao ar livre (hidratação, protetor, boné, calçado)."),
          variable("cuidado-com-o-corpo", 7, "Simular como pedir ajuda: quem chamar, o que dizer, onde estamos e como manter a calma."),
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
          "Descobrir e respeitar diferentes crenças espirituais em sua comunidade, expressando sua própria fé com respeito e bondade no ambiente familiar e entre amigos.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [],
        variableActions: [
          variable("espiritualidade", 0, "Realizar orações de agradecimento ou momento de reflexão nas atividades da alcateia."),
          variable("espiritualidade", 1, "Representar artisticamente um símbolo de sua religião e explicá-lo à alcateia."),
          variable("espiritualidade", 2, "Participar das celebrações e compromissos com sua crença ou religião regularmente."),
          variable("espiritualidade", 3, "Durante um momento de reflexão, fazer a leitura de um texto de sua crença ou religião."),
          variable("espiritualidade", 4, "Participar de uma atividade que expressa gratidão sobre coisas da vida e da natureza."),
          variable("espiritualidade", 5, "Criar uma mandala com elementos da natureza, representando a união e harmonia, e explicar a importância de cada elemento."),
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
          "Cuidar de si mesmo, praticando atividades físicas, mantendo uma alimentação saudável e garantindo a higiene pessoal e do ambiente ao seu redor.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("habitos-saudaveis", 0, "Auxiliar na preparação de uma refeição saudável em um acampamento ou acantonamento da alcateia e experimentá-la."),
          fixed("habitos-saudaveis", 1, "Preparar um lanche saudável para uma caçada, contendo pelo menos três tipos de legumes e dois tipos de frutas."),
          fixed("habitos-saudaveis", 2, "Participar de pelo menos uma caminhada ao ar livre com a alcateia (entre 2 e 3km) registrando três observações sobre o local durante o percurso."),
        ],
        variableActions: [
          variable("habitos-saudaveis", 0, "Utilizar o vestuário ou uniforme de lobinho adequadamente, demonstrando aplicação correta dos distintivos."),
          variable("habitos-saudaveis", 1, "Participar de atividades que demonstrem a importância de uma boa alimentação para a saúde, consumindo alimentos variados e cuidando da higiene."),
          variable("habitos-saudaveis", 2, "Escolher um esporte, aprender sobre ele e praticá-lo. Contar para a alcateia sobre o esporte que você pratica, suas características e regras."),
          variable("habitos-saudaveis", 3, "Cuidar da limpeza do corpo, manter uma boa rotina de sono, alimentação e brincadeiras e dedicar um tempo adequado aos estudos."),
          variable("habitos-saudaveis", 4, "Manter seu quarto e pertences em ordem."),
          variable("habitos-saudaveis", 5, "Fazer refeições saudáveis nos horários estabelecidos por sua família."),
          variable("habitos-saudaveis", 6, "Conhecer Bagheera e entender como ela ensina a viver de forma saudável."),
          variable("habitos-saudaveis", 7, "Preparar um espetinho com pelo menos quatro legumes diferentes e assá-lo em uma fogueira para seu consumo."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Noções Desportivas", "Nutrição"] },
        ],
      },
      {
        id: "saude-mental",
        name: "Saúde Mental",
        objective:
          "Adotar hábitos que ajudam a equilibrar sua saúde mental, buscando momentos de relaxamento, diversão e bem-estar, tanto para si quanto para os outros.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [],
        variableActions: [
          variable("saude-mental", 0, "Representar de maneira artística, com a sua alcateia, quais emoções está sentindo e que coisas te deixam feliz."),
          variable("saude-mental", 1, "Ajudar um amigo com alguma dificuldade e relatar a experiência a um Velho Lobo."),
          variable("saude-mental", 2, "Elogiar os lobinhos da alcateia e agradecer pela ajuda recebida."),
          variable("saude-mental", 3, "Saber a quem pedir ajuda quando sentir que algo está incomodando."),
          variable("saude-mental", 4, "Propor momentos divertidos e de relaxamento com a sua família, como ir ao parque, praticar esportes, ler um livro, montar um quebra-cabeça, etc. e relatar para os Velhos Lobos como foi essa experiência."),
          variable("saude-mental", 5, "Identificar suas atividades favoritas e separar um tempo para praticá-las."),
          variable("saude-mental", 6, "Praticar uma atividade que te faça sentir feliz e relaxado, encaixando na sua rotina e vendo quanto tempo gasta em suas atividades diárias."),
        ],
        variableRequired: 4,
        alternativeCompletions: [
          { type: "especialidade", items: ["Prevenção aos Vícios"] },
        ],
      },
      {
        id: "vinculos-saudaveis",
        name: "Vínculos Saudáveis",
        objective:
          "Fazer novas amizades, fortalecer os laços com os amigos e aprender a se relacionar de maneira saudável e positiva.",
        eixoId: "saude-e-bem-estar",
        fixedActions: [
          fixed("vinculos-saudaveis", 0, "Participar com entusiasmo das atividades da alcateia, brincando, conversando e respeitando os lobinhos e os Velhos Lobos."),
          fixed("vinculos-saudaveis", 1, "Cumprimentar membros do grupo com a saudação do lobinho e o aperto de mão."),
        ],
        variableActions: [
          variable("vinculos-saudaveis", 0, "Conhecer a história \"Como apareceu o medo\"."),
          variable("vinculos-saudaveis", 1, "Com sua alcateia, ir ao cinema ou teatro, se divertir com outros lobinhos e os Velhos Lobos."),
          variable("vinculos-saudaveis", 2, "Participar de uma atividade sobre bullying e formas de evitar essa prática."),
          variable("vinculos-saudaveis", 3, "Convidar um amigo ou parente para conhecer e participar de uma atividade da alcateia."),
          variable("vinculos-saudaveis", 4, "Participar de uma atividade da alcateia que conte com a presença das famílias."),
          variable("vinculos-saudaveis", 5, "Participar de um jogo ou atividade de expressão de sentimentos."),
          variable("vinculos-saudaveis", 6, "Acolher os novos lobinhos e ajudá-los a se integrar na alcateia."),
          variable("vinculos-saudaveis", 7, "Conhecer as seções do seu grupo escoteiro e participar de uma atividade com outra seção."),
          variable("vinculos-saudaveis", 8, "Participar de uma atividade entre diferentes Unidades Escoteira ou atividade regional do Ramo Lobinho."),
          variable("vinculos-saudaveis", 9, "Participar de uma atividade com outra alcateia."),
          variable("vinculos-saudaveis", 10, "Manter contato com amigos da alcateia, além da atividade semanal."),
        ],
        variableRequired: 5,
        alternativeCompletions: [
          { type: "especialidade", items: ["Prevenção ao Bullying"] },
        ],
      },
    ],
  },
];
