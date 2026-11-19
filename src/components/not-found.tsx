import { Link } from "@tanstack/react-router";

/**
 * Router-wide 404 (`defaultNotFoundComponent` in src/router.tsx): any URL no
 * route matches. pt-BR, same card style as the root error boundary; "Voltar
 * ao início" goes to `/`, whose auth gate sends each viewer to their home
 * (escoteiro, escotista painel, or /signin when signed out).
 */
export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 rounded-md border-2 border-black bg-card p-8 shadow-[4px_4px_0px_0px_#000]">
        <h1 className="text-lg font-black uppercase text-foreground">
          Página não encontrada
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          O endereço que você abriu não existe ou mudou de lugar.
        </p>
        <Link
          to="/"
          className="inline-block rounded-md border-2 border-black bg-primary px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
