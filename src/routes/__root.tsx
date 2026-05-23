/// <reference types="vite/client" />
import { Component, type ErrorInfo, type ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import "../../styles/globals.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error:", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="text-center space-y-4 rounded-md border-2 border-black bg-card p-8 shadow-[4px_4px_0px_0px_#000]">
            <h1 className="text-lg font-black uppercase text-foreground">
              Algo deu errado
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Tente recarregar a página.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border-2 border-black bg-primary px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Paxtools - Progressão Pessoal",
      },
      {
        name: "description",
        content:
          "Rastreador de Progressão Pessoal para escoteiros brasileiros do Ramo Escoteiro",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Scripts />
      </body>
    </html>
  );
}
