/**
 * Static specialty catalog data.
 *
 * Item counts sourced from the official Brazilian scout guide
 * (scout-notes reference repo). Names must match the `specialtyName` strings
 * stored by `toggleSpecialty` in `specialtyCompletions`.
 *
 * Used by:
 *   - `migrations:migrateSpecialtyCompletions` — to produce per-item rows
 *   - future specialty UI (#42–44) — to know how many items a specialty has
 */

/**
 * Known item counts for younger-group (lobinho/escoteiro) specialties.
 * Specialties not listed fall back to SPECIALTY_FALLBACK_ITEM_COUNT.
 */
export const YOUNGER_SPECIALTY_ITEM_COUNTS: Record<string, number> = {
  Acampamento: 8,
  Administração: 6,
  "Anatomia Humana": 7,
  "Arte Digital": 8,
  "Artes Visuais": 8,
  Artesanato: 8,
  Botânica: 6,
  Brasilidades: 6,
  "Ciências da Terra": 6, // maps to guide's Geologia (6 items)
  Comunicações: 8,
  Comédia: 8,
  "Costura e Estilismo": 6,
  "Defesa Civil": 6,
  "Educação Financeira": 8,
  Empreendedorismo: 8,
  Encadernação: 8,
  "Escotismo Mundial": 6,
  Excursões: 6,
  Genealogia: 6,
  Grafite: 6,
  HQ: 8,
  Horticultura: 6,
  Maquete: 6,
  Meteorologia: 6,
  Montanhismo: 6,
  "Noções Desportivas": 6,
  Nutrição: 6,
  Oceanologia: 6,
  Oratória: 6,
  Pintura: 8,
  Pioneiria: 8,
  "Prevenção ao Bullying": 6,
  "Prevenção aos Vícios": 6,
  "Prevenção em Saúde": 6,
  "Primeiros Socorros": 8,
  "Propaganda e Marketing": 8,
  "Reparos Domésticos": 8,
  Robótica: 8,
  Sobrevivência: 6,
  Videomaker: 8,
  Yoga: 8,
  Zoologia: 6,
};

/** Fallback item count for specialty names not in the known map. */
export const SPECIALTY_FALLBACK_ITEM_COUNT = 6;
