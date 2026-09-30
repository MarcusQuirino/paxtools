import { useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { RegiaoInput } from "@/components/onboarding/regiao-input";
import { formatGroupIdentity } from "@/lib/group-identity";
import { Card, ListBox, SectionHeading } from "@/components/ui/section";
import { ListRow } from "@/components/ui/list-row";
import { KpiGrid, KpiTile } from "@/components/ui/kpi-tile";
import { SearchInput } from "@/components/ui/search-input";
import { FilterChip, FilterChips } from "@/components/ui/filter-chips";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { HardButton } from "@/components/ui/hard-button";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { MiniBar } from "@/components/ui/progress-ring";
import {
  progressLabel,
  TOTAL_BLOCOS,
  useScoutProgress,
  type ScoutProgress,
} from "@/components/escotista/use-scout-progress";
import { EMERALD, GOLD, INK } from "@/lib/design-tokens";
import { Star, Copy, Check, Plus, Users, ChevronLeft, Clock } from "lucide-react";

export const Route = createFileRoute("/escotista/")({
  component: EscotistaDashboard,
});

type ListFilter = "todos" | "favoritos" | "pendentes";

function EscotistaDashboard() {
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const { data: stats } = useSuspenseQuery(
    convexQuery(api.approvals.getGroupStats, {}),
  );
  const progress = useScoutProgress();

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ListFilter>("todos");
  const [activeTab, setActiveTab] = useState<"escoteiros" | "escotistas">(
    "escoteiros",
  );

  const toggleFavFn = useConvexMutation(api.users.toggleFavoriteEscoteiro);
  const { mutate: toggleFav } = useMutation({ mutationFn: toggleFavFn });

  if (!stats) {
    return <NoGroupState />;
  }

  const observed = stats.observedSection;
  const favorites = new Set(user?.favoriteEscoteiroIds ?? []);
  const q = searchQuery.trim().toLowerCase();
  const matches = (name?: string | null) =>
    !q || (name?.toLowerCase().includes(q) ?? false);

  const favCount = stats.escoteiroStats.filter((e) => favorites.has(e._id)).length;
  const pendingCount = stats.escoteiroStats.filter((e) => e.pendingActions > 0).length;

  const filteredEscoteiros = stats.escoteiroStats.filter((e) => {
    if (filter === "favoritos" && !favorites.has(e._id)) return false;
    if (filter === "pendentes" && e.pendingActions === 0) return false;
    return matches(e.name);
  });
  const filteredEscotistas = stats.escotistaStats.filter((e) => matches(e.name));

  const escoteiroEmpty =
    filter === "favoritos"
      ? "Nenhum favorito encontrado"
      : filter === "pendentes" && !q
        ? "Ninguém com ações aguardando aprovação"
        : q
          ? "Nenhum escoteiro encontrado"
          : "Nenhum escoteiro no grupo";

  return (
    <div className="space-y-4">
      <KpiGrid cols={3}>
        <KpiTile value={stats.escoteiroCount} label="Escoteiros" testId="kpi-escoteiros" />
        <KpiTile value={stats.escotistaCount} label="Escotistas" testId="kpi-escotistas" />
        <KpiTile
          tone="gold"
          value={stats.totalPending}
          label="Pendentes"
          testId="kpi-pendentes"
        />
      </KpiGrid>

      <GroupCard
        name={stats.group.name}
        identity={formatGroupIdentity(stats.group.number, stats.group.regiao)}
        password={stats.group.password}
        observedId={observed?._id ?? null}
        sections={stats.observableSections}
      />

      <SegmentedControl
        ariaLabel="Lista"
        value={activeTab}
        onChange={(t) => {
          setActiveTab(t);
          setSearchQuery("");
        }}
        options={[
          { value: "escoteiros", label: "Escoteiros", testId: "painel-tab-escoteiros" },
          { value: "escotistas", label: "Escotistas", testId: "painel-tab-escotistas" },
        ]}
      />

      <div className="space-y-2.5">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={
            activeTab === "escoteiros" ? "Buscar escoteiro..." : "Buscar escotista..."
          }
          testId="painel-search"
        />
        {activeTab === "escoteiros" && (
          <FilterChips ariaLabel="Filtrar escoteiros">
            <FilterChip on={filter === "todos"} onClick={() => setFilter("todos")} testId="chip-todos">
              Todos
            </FilterChip>
            <FilterChip
              on={filter === "favoritos"}
              onClick={() => setFilter(filter === "favoritos" ? "todos" : "favoritos")}
              testId="chip-favoritos"
            >
              <Star className="size-4" strokeWidth={2.5} aria-hidden />
              Favoritos{favCount > 0 ? ` · ${favCount}` : ""}
            </FilterChip>
            <FilterChip
              on={filter === "pendentes"}
              onClick={() => setFilter(filter === "pendentes" ? "todos" : "pendentes")}
              testId="chip-pendentes"
            >
              <Clock className="size-4" strokeWidth={2.5} aria-hidden />
              Com pendências{pendingCount > 0 ? ` · ${pendingCount}` : ""}
            </FilterChip>
          </FilterChips>
        )}
      </div>

      {activeTab === "escoteiros" ? (
        <section>
          <SectionHeading
            className="mt-0"
            label={observed ? `Escoteiros · ${observed.name}` : "Escoteiros"}
            meta={filteredEscoteiros.length}
          />
          {filteredEscoteiros.length === 0 ? (
            <EmptyState>{escoteiroEmpty}</EmptyState>
          ) : (
            <ListBox testId="painel-escoteiros">
              {filteredEscoteiros.map((escoteiro) => (
                <EscoteiroRow
                  key={escoteiro._id}
                  escoteiro={escoteiro}
                  progress={progress.get(escoteiro._id)}
                  // An unplaced escoteiro shows up under every seção; say so,
                  // otherwise they read as members of the observed one.
                  showUnplaced={!!observed && !escoteiro.sectionId}
                  isFavorite={favorites.has(escoteiro._id)}
                  onToggleFavorite={() => toggleFav({ escoteiroId: escoteiro._id })}
                />
              ))}
            </ListBox>
          )}
        </section>
      ) : (
        <section>
          <SectionHeading className="mt-0" label="Escotistas" meta={filteredEscotistas.length} />
          {filteredEscotistas.length === 0 ? (
            <EmptyState>
              {q ? "Nenhum escotista encontrado" : "Nenhum escotista no grupo"}
            </EmptyState>
          ) : (
            <ListBox testId="painel-escotistas">
              {filteredEscotistas.map((e) => (
                <ListRow
                  key={e._id}
                  leading={<PersonAvatar id={e._id} name={e.name} image={e.image} size={40} />}
                  title={e.name ?? "Sem nome"}
                  subtitle="Escotista"
                />
              ))}
            </ListBox>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * Invite code + observed-seção picker. Static card (no shadow): the only
 * raised things are the copy button and the select.
 */
function GroupCard({
  name,
  identity,
  password,
  observedId,
  sections,
}: {
  name: string;
  identity: string | null;
  password: string;
  observedId: Id<"sections"> | null;
  sections: { _id: Id<"sections">; name: string }[];
}) {
  const [copied, setCopied] = useState(false);
  const [observedError, setObservedError] = useState("");
  const setObservedFn = useConvexMutation(api.groups.setObservedSection);
  const { mutate: setObserved } = useMutation({ mutationFn: setObservedFn });

  const handleCopy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card testId="painel-group">
      <h2 className="text-[16px] font-black leading-tight">
        {/* Own element + leading space: the accessible name must read
            "<name> 99999/RS", not "<name>99999/RS" (r7-group-identity). */}
        <span>{name}</span>
        {identity ? (
          <span className="text-[12px] font-bold text-[#8A887F]">{` ${identity}`}</span>
        ) : null}
      </h2>
      <div className="mt-3 flex items-center gap-3 border-t-[1.5px] border-[#D9D5C9] pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A887F]">
            Código de convite
          </p>
          <p className="font-mono text-[20px] font-black tracking-[0.12em]">{password}</p>
        </div>
        <HardButton
          tone="paper"
          size="md"
          onClick={() => void handleCopy()}
          aria-label={copied ? "Código copiado" : "Copiar código de convite"}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copiado!" : "Copiar"}
        </HardButton>
      </div>

      {sections.length > 0 && (
        <div className="mt-3 border-t-[1.5px] border-[#D9D5C9] pt-3">
          <label
            htmlFor="observed-section"
            className="block text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A887F]"
          >
            Seção
          </label>
          <select
            id="observed-section"
            value={observedId ?? ""}
            onChange={(e) => {
              setObservedError("");
              setObserved(
                { sectionId: (e.target.value || null) as Id<"sections"> | null },
                // Without this the select would just snap back to the
                // server's value with no word of why (a seção removed in
                // another tab, ramos changed since this page loaded).
                { onError: (err) => setObservedError(err.message) },
              );
            }}
            className="mt-1 min-h-11 w-full rounded-md border-2 border-[#141414] bg-white px-3 text-[15px] font-bold text-[#141414] outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B4E]/40"
          >
            <option value="">Todas as seções</option>
            {sections.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          {observedError && (
            <p className="mt-1 text-[12px] font-bold text-[#C62828]">{observedError}</p>
          )}
        </div>
      )}
    </Card>
  );
}

function EscoteiroRow({
  escoteiro,
  progress,
  showUnplaced,
  isFavorite,
  onToggleFavorite,
}: {
  escoteiro: {
    _id: Id<"users">;
    name?: string | null;
    image?: string | null;
    approvedActions: number;
    pendingActions: number;
  };
  progress: ScoutProgress | undefined;
  showUnplaced: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const name = escoteiro.name ?? "Sem nome";
  const base =
    progressLabel(progress) ??
    `${escoteiro.approvedActions} ${escoteiro.approvedActions === 1 ? "ação aprovada" : "ações aprovadas"}`;
  const subtitle = showUnplaced ? `${base} · sem seção` : base;
  return (
    // Row = the link (whole row opens the escoteiro) + a sibling 44px star, so
    // no button is nested inside the anchor.
    <div className="flex items-stretch border-t-[1.5px] border-[#D9D5C9] first:border-t-0">
      <ListRow
        className="min-w-0 flex-1 border-t-0 pr-1"
        tall={!!progress}
        leading={
          <PersonAvatar id={escoteiro._id} name={escoteiro.name} image={escoteiro.image} size={40} />
        }
        title={<span className="block truncate">{name}</span>}
        subtitle={subtitle}
        extra={
          progress ? (
            <MiniBar
              pct={(Math.min(progress.completedBlockCount, TOTAL_BLOCOS) / TOTAL_BLOCOS) * 100}
              color={EMERALD}
              width={96}
            />
          ) : undefined
        }
        trailing={
          escoteiro.pendingActions > 0 ? (
            <StatusPill state="pending" testId="painel-pending-pill">
              <span className="sr-only">Aguardando: </span>
              {escoteiro.pendingActions}
            </StatusPill>
          ) : undefined
        }
        chevron
        link={
          <Link
            to="/escotista/escoteiro/$escoteiroId"
            params={{ escoteiroId: escoteiro._id }}
            aria-label={`Ver progressão de ${name}`}
          />
        }
      />
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Remover favorito" : "Favoritar"}
        className="mr-1 grid w-11 shrink-0 place-items-center self-center rounded-md min-h-11 hover:bg-black/[0.04]"
      >
        <Star
          className="size-[22px]"
          strokeWidth={2.25}
          style={
            isFavorite
              ? { fill: GOLD, color: INK }
              : { color: "#8A887F" }
          }
          aria-hidden
        />
      </button>
    </div>
  );
}

const FIELD_LABEL =
  "block text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#4A4A44]";

function NoGroupState() {
  const [mode, setMode] = useState<"choice" | "create" | "join">("choice");
  const [groupName, setGroupName] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [groupRegiao, setGroupRegiao] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [error, setError] = useState("");

  const createGroupFn = useConvexMutation(api.groups.createGroup);
  const { mutate: createGroup, isPending: creating } = useMutation({
    mutationFn: createGroupFn,
  });

  const joinGroupFn = useConvexMutation(api.groups.joinGroup);
  const { mutate: joinGroup, isPending: joining } = useMutation({
    mutationFn: joinGroupFn,
  });

  const handleCreate = () => {
    const name = groupName.trim();
    const number = groupNumber.trim();
    const regiao = groupRegiao.trim();
    if (!name || !number || !regiao) return;
    setError("");
    createGroup(
      { name, number, regiao },
      { onError: (err) => setError(err.message) },
    );
  };

  const handleJoin = () => {
    const pw = joinPassword.trim();
    if (!pw) return;
    setError("");
    joinGroup({ password: pw }, { onError: (err) => setError(err.message) });
  };

  const back = (
    <HardButton
      tone="ghost"
      size="md"
      full
      onClick={() => {
        setMode("choice");
        setError("");
      }}
    >
      <ChevronLeft aria-hidden />
      Voltar
    </HardButton>
  );

  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-1">
        <h2 className="text-[22px] font-black leading-tight">Sem grupo</h2>
        <p className="text-[15px] text-[#4A4A44]">
          Crie ou entre em um grupo para acompanhar escoteiros.
        </p>
      </div>

      {mode === "choice" && (
        <div className="space-y-2.5">
          <HardButton tone="primary" size="lg" full onClick={() => setMode("create")}>
            <Plus aria-hidden />
            Criar novo grupo
          </HardButton>
          <HardButton tone="paper" size="md" full onClick={() => setMode("join")}>
            <Users aria-hidden />
            Entrar em grupo existente
          </HardButton>
        </div>
      )}

      {mode === "create" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="no-group-number" className={FIELD_LABEL}>
              Número do grupo
            </label>
            <Input
              id="no-group-number"
              placeholder="Ex: 123"
              inputMode="numeric"
              value={groupNumber}
              onChange={(e) => {
                setGroupNumber(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              maxLength={6}
              autoFocus
              className="h-12"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="no-group-regiao" className={FIELD_LABEL}>
              Região escoteira (UF)
            </label>
            <RegiaoInput
              id="no-group-regiao"
              value={groupRegiao}
              onChange={(next) => {
                setGroupRegiao(next);
                setError("");
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="no-group-name" className={FIELD_LABEL}>
              Nome do grupo
            </label>
            <Input
              id="no-group-name"
              placeholder="Ex: Potiguara"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="h-12"
            />
          </div>
          <HardButton
            tone="primary"
            size="lg"
            full
            onClick={handleCreate}
            disabled={
              !groupName.trim() || !groupNumber.trim() || !groupRegiao.trim() || creating
            }
          >
            {creating ? "Criando..." : "Criar grupo"}
          </HardButton>
          {back}
        </div>
      )}

      {mode === "join" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="no-group-password" className={FIELD_LABEL}>
              Senha do grupo
            </label>
            <Input
              id="no-group-password"
              placeholder="Ex: A3K9X2"
              value={joinPassword}
              onChange={(e) => {
                setJoinPassword(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="h-12 text-center font-mono tracking-widest"
              maxLength={6}
              autoFocus
            />
          </div>
          <HardButton
            tone="primary"
            size="lg"
            full
            onClick={handleJoin}
            disabled={!joinPassword.trim() || joining}
          >
            {joining ? "Entrando..." : "Entrar no grupo"}
          </HardButton>
          {back}
        </div>
      )}

      {error && (
        <p className="text-center text-[13px] font-bold text-[#C62828]">{error}</p>
      )}
    </Card>
  );
}
