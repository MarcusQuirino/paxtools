import { useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Search,
  Eye,
  Clock,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/escotista/")({
  component: EscotistaDashboard,
});

function EscotistaDashboard() {
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const { data: stats } = useSuspenseQuery(
    convexQuery(api.approvals.getGroupStats, {}),
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const toggleFavFn = useConvexMutation(api.users.toggleFavoriteEscoteiro);
  const { mutate: toggleFav } = useMutation({ mutationFn: toggleFavFn });

  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-5 text-center space-y-3">
          <AlertCircle className="size-10 text-muted-foreground mx-auto" />
          <h2 className="font-semibold">Sem grupo</h2>
          <p className="text-sm text-muted-foreground">
            Crie ou entre em um grupo para começar a acompanhar escoteiros.
          </p>
          <Link to="/settings">
            <Button size="sm">Configurações</Button>
          </Link>
        </div>
      </div>
    );
  }

  const favorites = new Set(user?.favoriteEscoteiroIds ?? []);

  const filteredEscoteiros = stats.escoteiroStats.filter((e) => {
    if (showFavorites && !favorites.has(e._id)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (e.name?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  const handleCopyPassword = async () => {
    if (!stats.group.password) return;
    await navigator.clipboard.writeText(stats.group.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Group stats */}
      <div className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-3 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-lg">{stats.group.name}</h2>
          <button
            type="button"
            onClick={handleCopyPassword}
            className="flex items-center gap-1 text-xs bg-white/20 rounded-md px-2 py-1 hover:bg-white/30 transition-colors"
          >
            {copiedPassword ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
            {copiedPassword ? "Copiado!" : stats.group.password}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/15 rounded-lg p-2 text-center">
            <p className="text-xl font-bold">{stats.escoteiroCount}</p>
            <p className="text-[10px] opacity-80">Escoteiros</p>
          </div>
          <div className="bg-white/15 rounded-lg p-2 text-center">
            <p className="text-xl font-bold">{stats.escotistaCount}</p>
            <p className="text-[10px] opacity-80">Escotistas</p>
          </div>
          <div className="bg-white/15 rounded-lg p-2 text-center">
            <p className="text-xl font-bold">{stats.totalPending}</p>
            <p className="text-[10px] opacity-80">Pendentes</p>
          </div>
        </div>
      </div>

      {/* Search and filter */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar escoteiro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant={showFavorites ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavorites(!showFavorites)}
            className="h-9 px-3"
          >
            <Star
              className={`size-4 ${showFavorites ? "fill-current" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Escoteiro list */}
      <div className="space-y-2">
        {filteredEscoteiros.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {showFavorites
              ? "Nenhum favorito encontrado"
              : searchQuery
                ? "Nenhum escoteiro encontrado"
                : "Nenhum escoteiro no grupo"}
          </p>
        ) : (
          filteredEscoteiros.map((escoteiro) => (
            <EscoteiroCard
              key={escoteiro._id}
              escoteiro={escoteiro}
              isFavorite={favorites.has(escoteiro._id)}
              onToggleFavorite={() =>
                toggleFav({ escoteiroId: escoteiro._id })
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function EscoteiroCard({
  escoteiro,
  isFavorite,
  onToggleFavorite,
}: {
  escoteiro: {
    _id: Id<"users">;
    name?: string | null;
    image?: string | null;
    approvedActions: number;
    pendingActions: number;
    totalActions: number;
  };
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
      <Avatar className="size-10">
        <AvatarImage src={escoteiro.image ?? undefined} />
        <AvatarFallback className="text-xs">
          {escoteiro.name?.charAt(0)?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {escoteiro.name ?? "Sem nome"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground">
            {escoteiro.approvedActions} aprovadas
          </span>
          {escoteiro.pendingActions > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 text-amber-600 border-amber-300"
            >
              <Clock className="size-2.5 mr-0.5" />
              {escoteiro.pendingActions}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleFavorite}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label={isFavorite ? "Remover favorito" : "Favoritar"}
        >
          <Star
            className={`size-4 ${isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
          />
        </button>
        <Link
          to="/escotista/escoteiro/$escoteiroId"
          params={{ escoteiroId: escoteiro._id }}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Ver progressão"
        >
          <Eye className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
