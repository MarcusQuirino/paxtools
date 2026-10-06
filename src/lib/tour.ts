/**
 * The guided tour shown to a member on their first visit: one script per
 * role, each a list of steps that spotlight a real element of the page.
 *
 * A step's `target` names an element by its `data-tour` attribute; the first
 * match on the page is the one highlighted. A step without a target is a
 * centred card (welcome, farewell). An `optional` step is skipped when its
 * target never shows up — the seção picker only exists in a grupo that has
 * seções, the escoteiro card only when the grupo has escoteiros.
 */

export type TourStep = {
  id: string;
  /** Route the step lives on; the tour navigates there first. */
  route: string;
  /** `data-tour` value of the element to spotlight. */
  target?: string;
  title: string;
  body: string;
  optional?: boolean;
};

const ESCOTEIRO_HOME = "/";
const ESCOTISTA_HOME = "/escotista";

export const ESCOTEIRO_TOUR: TourStep[] = [
  {
    id: "welcome",
    route: ESCOTEIRO_HOME,
    title: "Bem-vindo ao Paxtools!",
    body: "Aqui você registra sua Progressão Pessoal e acompanha cada conquista. Vamos dar uma volta rápida — leva menos de um minuto.",
  },
  {
    id: "stage",
    route: ESCOTEIRO_HOME,
    target: "stage-banner",
    title: "Sua etapa",
    body: "Mostra a etapa em que você está e quantos blocos faltam para a próxima. Ela avança sozinha conforme seus blocos são aprovados.",
  },
  {
    id: "eixos",
    route: ESCOTEIRO_HOME,
    target: "overall-progress",
    title: "Seus eixos",
    body: "Cada cartão é um eixo da progressão. A barra mostra os blocos já aprovados e os que ainda aguardam aprovação.",
  },
  {
    id: "blocos",
    route: ESCOTEIRO_HOME,
    target: "bloco",
    title: "Blocos e ações",
    body: "Toque em um bloco para ver suas ações. Fez uma? Marque-a: ela fica Pendente até um escotista aprovar. Nas ações variáveis você também pode escrever uma ação personalizada.",
  },
  {
    id: "irr",
    route: ESCOTEIRO_HOME,
    target: "recognition",
    title: "A insígnia do ramo",
    body: "Completando os 18 blocos, você libera os itens finais da insígnia máxima do seu ramo. Ela fica aqui, no fim da página.",
  },
  {
    id: "plano",
    route: ESCOTEIRO_HOME,
    target: "tab-plano",
    title: "Plano",
    body: "Toque na ⭐ ao lado de uma ação ou especialidade para guardá-la no seu Plano. Lá você organiza o que quer fazer a seguir, na ordem que preferir.",
  },
  {
    id: "especialidades",
    route: ESCOTEIRO_HOME,
    target: "tab-especialidades",
    title: "Especialidades",
    body: "Explore o catálogo, busque por tema e registre o que já fez de cada especialidade. Conquistar uma também pode completar um bloco da progressão.",
  },
  {
    id: "perfil",
    route: ESCOTEIRO_HOME,
    target: "tab-perfil",
    title: "Perfil",
    body: "Seu nome, seu grupo e a saída da conta. Quer rever este tutorial? O botão fica aqui.",
  },
  {
    id: "done",
    route: ESCOTEIRO_HOME,
    title: "Tudo pronto!",
    body: "Agora é com você: marque o que já fez e combine com seu escotista o que vem a seguir. Sempre Alerta!",
  },
];

/** The escotista script; admins get the extra word on the Admin area. */
export function escotistaTour(isAdmin: boolean): TourStep[] {
  return [
    {
      id: "welcome",
      route: ESCOTISTA_HOME,
      title: "Bem-vindo, escotista!",
      body: "No Paxtools você acompanha a progressão dos escoteiros dos ramos que acompanha e aprova o que eles registram. Vamos conhecer as telas principais.",
    },
    {
      id: "grupo",
      route: ESCOTISTA_HOME,
      target: "group-card",
      title: "Seu grupo",
      body: "O código ao lado do nome é a chave do grupo: toque para copiar e envie a escoteiros e escotistas. Quem entra com ele aguarda a aprovação de um admin.",
    },
    {
      id: "secao",
      route: ESCOTISTA_HOME,
      target: "section-picker",
      optional: true,
      title: "Seção observada",
      body: "Se o grupo tem várias seções, escolha qual você quer acompanhar. A lista abaixo passa a mostrar só ela — e a escolha fica salva.",
    },
    {
      id: "membros",
      route: ESCOTISTA_HOME,
      target: "member-tabs",
      title: "Escoteiros e escotistas",
      body: "Alterne entre a lista de escoteiros e a de escotistas. O contador de pendentes mostra quantas conclusões esperam aprovação.",
    },
    {
      id: "busca",
      route: ESCOTISTA_HOME,
      target: "member-search",
      title: "Buscar e favoritar",
      body: "Ache alguém pelo nome. Marque escoteiros com a ⭐ no cartão deles e use o botão ⭐ daqui para ver só os favoritos.",
    },
    {
      id: "escoteiro",
      route: ESCOTISTA_HOME,
      target: "escoteiro-card",
      optional: true,
      title: "Progressão do escoteiro",
      body: "Toque no ícone de olho para abrir a progressão do escoteiro. O que você marcar por lá já entra aprovado.",
    },
    {
      id: "pendentes",
      route: ESCOTISTA_HOME,
      target: "nav-pendentes",
      title: "Pendentes",
      body: "Tudo que os escoteiros marcam espera por você aqui. Aprove ou rejeite um item, ou selecione vários e resolva de uma vez.",
    },
    {
      id: "especialidades",
      route: ESCOTISTA_HOME,
      target: "nav-especialidades",
      title: "Especialidades",
      body: "Consulte o catálogo de especialidades e abra a ficha de cada escoteiro para acompanhar e aprovar os itens.",
    },
    {
      id: "mais",
      route: ESCOTISTA_HOME,
      target: "nav-mais",
      title: "Mais",
      body: isAdmin
        ? "Estatísticas do grupo, histórico de aprovações e ajustes. Como admin, aqui também fica a área Admin: aprovar novos membros, definir ramos e seções."
        : "Estatísticas do grupo, histórico de aprovações e ajustes da sua conta.",
    },
    {
      id: "done",
      route: ESCOTISTA_HOME,
      title: "Tudo pronto!",
      body: "Você pode rever este tutorial quando quiser em Mais → Ajustes. Sempre Alerta!",
    },
  ];
}

export function tourStepsFor(
  role: "escoteiro" | "escotista",
  isAdmin: boolean,
): TourStep[] {
  return role === "escotista" ? escotistaTour(isAdmin) : ESCOTEIRO_TOUR;
}

/** Routes where the tour never opens on its own: nothing to show there yet. */
const NO_AUTO_TOUR_ROUTES = ["/signin", "/onboarding", "/trocar-senha"];

/**
 * Whether the tour should open by itself: a signed-in, onboarded member who
 * has never finished or skipped it. An escotista still awaiting approval only
 * sees the waiting screen, so their tour waits too.
 */
export function shouldAutoStartTour(
  user: {
    role?: "escoteiro" | "escotista";
    onboardingComplete?: boolean;
    membershipStatus?: "pending" | "approved";
    tourSeenAt?: number;
  } | null,
  pathname: string,
): boolean {
  if (!user || !user.role || !user.onboardingComplete) return false;
  if (user.tourSeenAt !== undefined) return false;
  if (user.role === "escotista" && user.membershipStatus === "pending") {
    return false;
  }
  return !NO_AUTO_TOUR_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );
}

export type Rect = { top: number; left: number; width: number; height: number };

/** Gap between the spotlight and the card, and the card and the viewport. */
const GAP = 12;

/**
 * Where the tour card goes, as a `top` offset in the viewport. Below the
 * spotlight when it fits, else above it, else pinned to the bottom edge —
 * a tall target (an expanded eixo) may leave room on neither side.
 * No target: vertically centred.
 */
export function placeCard(
  target: Rect | null,
  cardHeight: number,
  viewportHeight: number,
): number {
  const centred = Math.max(GAP, (viewportHeight - cardHeight) / 2);
  if (!target) return centred;
  const below = target.top + target.height + GAP;
  if (below + cardHeight + GAP <= viewportHeight) return below;
  const above = target.top - GAP - cardHeight;
  if (above >= GAP) return above;
  return Math.max(GAP, viewportHeight - cardHeight - GAP);
}
