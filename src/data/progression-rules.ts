import type { Ramo } from "./progression-data";

/**
 * A progression stage within a ramo. The COUNT varies by ramo (three or four),
 * so nothing here may assume four — helpers must be count-agnostic. `image` is
 * optional: only escoteiro ships etapa artwork today; other ramos render a
 * fallback marker until their images exist.
 */
export type Etapa = {
  id: string;
  name: string;
  image?: string;
  blocksRequired: number;
  blocksToNext: number;
};

/** One checklist slot of a ramo's IRR. `auto` items are satisfied by the 18
 * blocos rather than an escotista's approval. Item ids are shared across ramos
 * (the 5-slot shape is identical); only the display text differs. */
export type IrrItem = {
  id: string;
  text: string;
  auto: boolean;
};

/**
 * A ramo's IRR (Insígnia de Reconhecimento de Ramo): its display name, colours,
 * the block threshold (always 18), and its five recognition items. "Lis de
 * Ouro" is escoteiro's `name`, not a generic term.
 */
export type Irr = {
  name: string;
  color: string;
  colorLight: string;
  blockThreshold: number;
  items: IrrItem[];
};

/** Everything a screen needs to render a ramo's progression: its etapas and its
 * IRR. The single place to ask "what are the rules for this ramo?". */
export type RamoRules = {
  etapas: Etapa[];
  irr: Irr;
};

// Shared IRR item ids — the 5-slot shape is identical across ramos; only the
// display text varies. Ids stay `lis_*` in Workstream A (the storage rename to
// `irr_*` is Workstream B); "Lis de Ouro" survives only as escoteiro's name.
const IRR_ITEM_PROMESSA = "lis_promessa";
const IRR_ITEM_BLOCOS = "lis_blocos";
const IRR_ITEM_JORNADA = "lis_jornada";
const IRR_ITEM_AUTOAVALIACAO = "lis_autoavaliacao";
const IRR_ITEM_AVALIACAO = "lis_corte_honra";

// The auto (blocos) item is identical for every ramo.
const IRR_ITEM_BLOCOS_TEXT = "Concluiu todos os 18 Blocos de Aprendizagem";
// Autoavaliação is the same wording across ramos.
const IRR_ITEM_AUTOAVALIACAO_TEXT = "Realizou a autoavaliação";

/**
 * Per-ramo progression rules. Maintainer-verified etapa names/thresholds and IRR
 * names/journey items; the OCR'd source guides are unreliable, so these confirmed
 * values are authoritative. Escoteiro reproduces the previous flat constants
 * byte-for-byte (regression lock — its output must be identical to before).
 *
 * FLAGGED FOR MAINTAINER REVIEW (inferred, not maintainer-confirmed):
 *   - IRR colours for lobinho / senior / pioneiro (escoteiro's green is exact).
 *   - The promessa (slot 1) wording for non-escoteiro ramos.
 *   - The avaliação (slot 5) wording for SÊNIOR and PIONEIRO (escoteiro = Corte
 *     de Honra and lobinho = Roca de Conselho + Velhos Lobos are confirmed;
 *     senior/pioneiro are best-effort guesses).
 *   - The "Vivenciou o/a <journey>" phrasing wrapping the confirmed journey names.
 */
const RAMO_RULES: Record<Ramo, RamoRules> = {
  escoteiro: {
    etapas: [
      { id: "pista", name: "Pista", image: "/pista.png", blocksRequired: 0, blocksToNext: 4 },
      { id: "trilha", name: "Trilha", image: "/trilha.png", blocksRequired: 4, blocksToNext: 4 },
      { id: "rumo", name: "Rumo", image: "/rumo.png", blocksRequired: 8, blocksToNext: 5 },
      { id: "travessia", name: "Travessia", image: "/travessia.png", blocksRequired: 13, blocksToNext: 5 },
    ],
    irr: {
      name: "Lis de Ouro",
      color: "#2E7D32",
      colorLight: "#E8F5E9",
      blockThreshold: 18,
      items: [
        { id: IRR_ITEM_PROMESSA, text: "Realizou ou Renovou sua Promessa Escoteira", auto: false },
        { id: IRR_ITEM_BLOCOS, text: IRR_ITEM_BLOCOS_TEXT, auto: true },
        { id: IRR_ITEM_JORNADA, text: "Vivenciou a Jornada de Travessia", auto: false },
        { id: IRR_ITEM_AUTOAVALIACAO, text: IRR_ITEM_AUTOAVALIACAO_TEXT, auto: false },
        {
          id: IRR_ITEM_AVALIACAO,
          text: "Ser avaliado positivamente pela Corte de Honra e pelos Escotistas",
          auto: false,
        },
      ],
    },
  },

  lobinho: {
    etapas: [
      { id: "pata-tenra", name: "Pata Tenra", blocksRequired: 0, blocksToNext: 4 },
      { id: "saltador", name: "Saltador", blocksRequired: 4, blocksToNext: 4 },
      { id: "rastreador", name: "Rastreador", blocksRequired: 8, blocksToNext: 5 },
      { id: "cacador", name: "Caçador", blocksRequired: 13, blocksToNext: 5 },
    ],
    irr: {
      name: "Cruzeiro do Sul",
      // FLAG: inferred colour (lobinho amber).
      color: "#F9A825",
      colorLight: "#FFF8E1",
      blockThreshold: 18,
      items: [
        // FLAG: inferred promessa wording.
        { id: IRR_ITEM_PROMESSA, text: "Realizou ou Renovou sua Promessa", auto: false },
        { id: IRR_ITEM_BLOCOS, text: IRR_ITEM_BLOCOS_TEXT, auto: true },
        { id: IRR_ITEM_JORNADA, text: "Vivenciou o Caminho Caçador", auto: false },
        { id: IRR_ITEM_AUTOAVALIACAO, text: IRR_ITEM_AUTOAVALIACAO_TEXT, auto: false },
        // Confirmed: Roca de Conselho + Velhos Lobos.
        {
          id: IRR_ITEM_AVALIACAO,
          text: "Ser avaliado positivamente pela Roca de Conselho e pelos Velhos Lobos",
          auto: false,
        },
      ],
    },
  },

  senior: {
    etapas: [
      { id: "escalada", name: "Escalada", blocksRequired: 0, blocksToNext: 6 },
      { id: "conquista", name: "Conquista", blocksRequired: 6, blocksToNext: 6 },
      { id: "azimute", name: "Azimute", blocksRequired: 12, blocksToNext: 6 },
    ],
    irr: {
      name: "Escoteiro da Pátria",
      // FLAG: inferred colour (sênior blue).
      color: "#1565C0",
      colorLight: "#E3F2FD",
      blockThreshold: 18,
      items: [
        // FLAG: inferred promessa wording.
        { id: IRR_ITEM_PROMESSA, text: "Realizou ou Renovou sua Promessa", auto: false },
        { id: IRR_ITEM_BLOCOS, text: IRR_ITEM_BLOCOS_TEXT, auto: true },
        { id: IRR_ITEM_JORNADA, text: "Vivenciou o Desafio do Azimute", auto: false },
        { id: IRR_ITEM_AUTOAVALIACAO, text: IRR_ITEM_AUTOAVALIACAO_TEXT, auto: false },
        // FLAG: inferred avaliação wording (unconfirmed for sênior).
        {
          id: IRR_ITEM_AVALIACAO,
          text: "Ser avaliado positivamente pela sua Patrulha e pelos Escotistas",
          auto: false,
        },
      ],
    },
  },

  pioneiro: {
    etapas: [
      { id: "descoberta", name: "Descoberta", blocksRequired: 0, blocksToNext: 6 },
      { id: "destino", name: "Destino", blocksRequired: 6, blocksToNext: 6 },
      { id: "horizonte", name: "Horizonte", blocksRequired: 12, blocksToNext: 6 },
    ],
    irr: {
      name: "Insígnia de BP",
      // FLAG: inferred colour (pioneiro red).
      color: "#C62828",
      colorLight: "#FFEBEE",
      blockThreshold: 18,
      items: [
        // FLAG: inferred promessa wording.
        { id: IRR_ITEM_PROMESSA, text: "Realizou ou Renovou sua Promessa", auto: false },
        { id: IRR_ITEM_BLOCOS, text: IRR_ITEM_BLOCOS_TEXT, auto: true },
        { id: IRR_ITEM_JORNADA, text: "Vivenciou a Expedição Pioneira", auto: false },
        { id: IRR_ITEM_AUTOAVALIACAO, text: IRR_ITEM_AUTOAVALIACAO_TEXT, auto: false },
        // FLAG: inferred avaliação wording (unconfirmed for pioneiro).
        {
          id: IRR_ITEM_AVALIACAO,
          text: "Ser avaliado positivamente pelo seu Clã e pelos Escotistas",
          auto: false,
        },
      ],
    },
  },
};

/**
 * The single entry point: everything about a ramo's stages and recognition.
 * Defaults to escoteiro when the ramo is unknown/unset, mirroring
 * `getEixosForRamo` so a not-yet-onboarded user sees a coherent screen.
 */
export function getRamoRules(ramo: Ramo | null | undefined): RamoRules {
  return RAMO_RULES[ramo ?? "escoteiro"] ?? RAMO_RULES.escoteiro;
}
