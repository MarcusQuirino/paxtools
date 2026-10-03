/**
 * Shared pieces of the escotista Especialidades surfaces (catalog, detail,
 * per-escoteiro ficha), drawn in the "Design A" system: borders on static
 * containers, hard shadows only on interactive/primary elements, ≥44px
 * targets, 15px body, 12px type floor, approved = emerald, aguardando = amber
 * + clock, one colour per eixo.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { YOUNGER_SPECIALTIES } from "@/data/specialty-data/younger";
import { OLDER_SPECIALTIES } from "@/data/specialty-data/older";

export type RamoGroup = "younger" | "older";

export const RAMO_GROUP_LABEL: Record<RamoGroup, string> = {
  younger: "Lobinhos e Escoteiros",
  older: "Sêniores e Pioneiros",
};

/** The ramoGroup an escotista lands on: the first one they accompany. */
export function defaultRamoGroup(
  user: { isAdmin?: boolean; escotistaRamos?: string[] } | null,
): RamoGroup {
  const ramos = user?.escotistaRamos ?? [];
  if (user?.isAdmin) return "younger";
  if (ramos.some((r) => r === "lobinho" || r === "escoteiro")) return "younger";
  if (ramos.some((r) => r === "senior" || r === "pioneiro")) return "older";
  return "younger";
}

export function ramoGroupOf(ramo: string | null | undefined): RamoGroup {
  return ramo === "senior" || ramo === "pioneiro" ? "older" : "younger";
}

// Design A tokens (a-native/index.html).
export const INK = "#141414";
export const EMERALD = "#0E6B4E";
export const AMBER = "#F5B300";
export const AMBER_INK = "#6B4A00";
export const GOLD = "#F4C430";

export const EIXOS: { id: string; name: string; color: string; tint: string }[] =
  [
    {
      id: "habilidades-para-a-vida",
      name: "Habilidades para a Vida",
      color: "#C2185B",
      tint: "#FBE3EC",
    },
    { id: "meio-ambiente", name: "Meio Ambiente", color: "#2E7D32", tint: "#DFF2E0" },
    {
      id: "paz-e-desenvolvimento",
      name: "Paz e Desenvolvimento",
      color: "#1E3A8A",
      tint: "#E3E8F8",
    },
    {
      id: "saude-e-bem-estar",
      name: "Saúde e Bem-estar",
      color: "#C62828",
      tint: "#FCE4E4",
    },
  ];

const EIXO_BY_ID = new Map(EIXOS.map((e) => [e.id, e]));

export function eixoMeta(eixoId: string) {
  return (
    EIXO_BY_ID.get(eixoId) ?? {
      id: eixoId,
      name: eixoId,
      color: "#4A4A44",
      tint: "#F4F1E8",
    }
  );
}

/** One catalog entry, uniform across both ramoGroups. */
export type CatalogEntry = {
  id: string;
  name: string;
  eixoId: string;
  description: string;
  /** Younger: the checklist items. Older: every etapa suggestion. */
  texts: string[];
  /** Younger only: item count (level 1 = half, level 2 = all). */
  itemCount: number | null;
};

function byName(a: CatalogEntry, b: CatalogEntry) {
  return a.name.localeCompare(b.name, "pt-BR");
}

const YOUNGER_CATALOG: CatalogEntry[] = YOUNGER_SPECIALTIES.map((s) => ({
  id: s.id,
  name: s.name,
  eixoId: s.eixoId,
  description: s.description,
  texts: s.items,
  itemCount: s.items.length,
})).sort(byName);

const OLDER_CATALOG: CatalogEntry[] = OLDER_SPECIALTIES.map((s) => ({
  id: s.id,
  name: s.name,
  eixoId: s.eixoId,
  description: s.description,
  texts: [
    ...s.conhecerSuggestions,
    ...s.fazerSuggestions,
    ...s.compartilharSuggestions,
  ],
  itemCount: null,
})).sort(byName);

export function catalogFor(group: RamoGroup): CatalogEntry[] {
  return group === "younger" ? YOUNGER_CATALOG : OLDER_CATALOG;
}

export function findCatalogEntry(
  group: RamoGroup,
  id: string,
): CatalogEntry | undefined {
  return catalogFor(group).find((e) => e.id === id);
}

/** Lowercase + strip accents, so "nos" finds "nós". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Match a catalog entry against a search: name first, else the first item /
 * suggestion whose text contains the query (returned so the row can show
 * which requirement matched).
 */
export function matchEntry(
  entry: CatalogEntry,
  query: string,
): { matched: boolean; snippet: string | null } {
  const q = normalize(query.trim());
  if (!q) return { matched: true, snippet: null };
  if (normalize(entry.name).includes(q)) return { matched: true, snippet: null };
  const hit = entry.texts.find((t) => normalize(t).includes(q));
  return hit ? { matched: true, snippet: hit } : { matched: false, snippet: null };
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function initials(name: string | null | undefined): string {
  const parts = (name ?? "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

const AVATAR_TINTS = ["#F4C430", "#FBE3EC", "#DFF2E0", "#E3E8F8", "#FCE4E4"];

function tintFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length]!;
}

export function PersonAvatar({
  id,
  name,
  image,
  size = 36,
}: {
  id: string;
  name: string | null | undefined;
  image?: string | null;
  size?: number;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#141414] font-black text-[#141414]"
      style={{
        width: size,
        height: size,
        background: tintFor(id),
        fontSize: Math.max(10, Math.round(size * 0.36)),
      }}
      aria-hidden
    >
      {image ? (
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function AvatarStack({
  people,
  total,
}: {
  people: { _id: string; name: string | null; image: string | null }[];
  total: number;
}) {
  const extra = total - people.length;
  return (
    <span className="inline-flex items-center" aria-hidden>
      {people.map((p, i) => (
        <span key={p._id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <PersonAvatar id={p._id} name={p.name} image={p.image} size={26} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="grid size-[26px] place-items-center rounded-full border-2 border-[#141414] bg-white text-[10px] font-black"
          style={{ marginLeft: -8 }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

export function LevelPill({ level }: { level: 0 | 1 | 2 }) {
  if (level === 0) return null;
  return level === 2 ? (
    <span className="inline-flex items-center rounded-full border-2 border-[#141414] bg-[#F4C430] px-2 py-0.5 text-[11px] font-extrabold uppercase leading-tight tracking-wide text-[#141414]">
      Nível 2
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border-2 border-[#1E3A8A] bg-[#E3E8F8] px-2 py-0.5 text-[11px] font-extrabold uppercase leading-tight tracking-wide text-[#1E3A8A]">
      Nível 1
    </span>
  );
}

/** Section heading: caps label left, meta right. */
export function SectionHeading({
  label,
  meta,
}: {
  label: string;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-2 mt-5 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-black uppercase tracking-[0.08em] text-[#141414]">
        {label}
      </h2>
      {meta != null && (
        <span className="text-[13px] font-bold text-[#8A887F]">{meta}</span>
      )}
    </div>
  );
}

/** Search box over names and item/suggestion text, with a clear button. */
export function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="mb-2.5 flex min-h-12 items-center gap-2.5 rounded-[10px] border-2 border-[#141414] bg-white px-3 focus-within:ring-2 focus-within:ring-[#0E6B4E]/40">
      <Search className="size-[22px] shrink-0 text-[#8A887F]" strokeWidth={2.5} />
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="Buscar por nome ou requisito"
        aria-label="Buscar por nome ou requisito"
        className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8A887F]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label="Limpar busca"
          className="-mr-2 grid size-11 place-items-center text-[#4A4A44]"
        >
          <X className="size-5" />
        </button>
      )}
    </label>
  );
}

/** Horizontally-scrolling filter chip row. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {children}
    </div>
  );
}

/** Toggleable filter chip; ink-filled when on. */
export function FilterChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#141414] px-3 text-[14px] font-extrabold ${
        on ? "bg-[#141414] text-white" : "bg-white text-[#141414]"
      }`}
    >
      {children}
    </button>
  );
}

/** Eixo colour dot for an eixo filter chip. */
export function EixoDot({ color }: { color: string }) {
  return (
    <span
      className="size-2.5 rounded-full border-2 border-current"
      style={{ background: color }}
    />
  );
}

/** Static list container: 2px ink border, no shadow (Design A calm rule). */
export function ListBox({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[10px] border-2 border-[#141414] bg-white ${className}`}
    >
      {children}
    </div>
  );
}

export function ListHeader({
  label,
  meta,
  tint = "#F4F1E8",
}: {
  label: string;
  meta?: ReactNode;
  tint?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b-2 border-[#141414] px-3.5 py-2.5"
      style={{ background: tint }}
    >
      <span className="shrink-0 whitespace-nowrap text-[13px] font-black uppercase tracking-[0.06em]">
        {label}
      </span>
      {meta != null && (
        <span className="text-right text-[13px] font-extrabold text-[#4A4A44]">
          {meta}
        </span>
      )}
    </div>
  );
}

/** Pushed-screen header: 44px back target + coloured crumb + 22px title. */
export function SubBar({
  back,
  crumb,
  crumbColor = "#8A887F",
  title,
}: {
  back: ReactNode;
  crumb: string;
  crumbColor?: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 pb-1">
      {back}
      <div className="min-w-0">
        <p
          className="text-[12px] font-extrabold uppercase tracking-[0.08em]"
          style={{ color: crumbColor }}
        >
          {crumb}
        </p>
        <h1 className="text-[22px] font-black leading-tight tracking-[-0.02em] text-[#141414]">
          {title}
        </h1>
      </div>
    </div>
  );
}

export const BACK_CLASS =
  "-ml-2 grid size-11 shrink-0 place-items-center rounded-md text-[#141414] hover:bg-black/5";

export function BackIcon() {
  return <ChevronLeft className="size-[26px]" strokeWidth={2.5} />;
}

export function RowChevron() {
  return (
    <ChevronRight
      className="size-5 shrink-0 text-[#8A887F]"
      strokeWidth={2.5}
      aria-hidden
    />
  );
}

/** Thin progress bar (catalog/roster rows). */
export function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <span className="relative mt-1.5 block h-1.5 w-[120px] overflow-hidden rounded-[3px] border-[1.5px] border-[#141414] bg-[#EEE9DC]">
      <span
        className="absolute inset-y-0 left-0"
        style={{ width: `${Math.round(pct)}%`, background: color }}
      />
    </span>
  );
}

/** "/especialidades?escoteiroId=…&specialty=…" — the per-escoteiro ficha. */
export function FichaLink({
  escoteiroId,
  specialtyId,
  className,
  children,
}: {
  escoteiroId: string;
  specialtyId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      to="/especialidades"
      search={{ escoteiroId, specialty: specialtyId }}
      className={className}
    >
      {children}
    </Link>
  );
}
