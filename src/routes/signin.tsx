import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { SignInWithGoogle, SignInWithScoutId } from "@/components/auth/sign-in";
import { Footer } from "@/components/footer";
import { Compass, Map, Award, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});

function SignInPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate({ to: "/" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  return <LoginPage loading={isLoading} />;
}

const features = [
  {
    icon: Compass,
    title: "Trilha Pessoal",
    description: "Acompanhe cada passo da sua progressão",
  },
  {
    icon: Map,
    title: "Eixos de Desenvolvimento",
    description: "Visualize seu progresso por eixo",
  },
  {
    icon: Award,
    title: "Especialidades",
    description: "Registre suas conquistas e especialidades",
  },
  {
    icon: TrendingUp,
    title: "Etapas",
    description: "Veja sua evolução rumo à próxima etapa",
  },
];

function LoginPage({ loading = false }: { loading?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md my-8 space-y-4">
        {/* Logo & Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-md bg-primary border-2 border-black mb-4 shadow-[4px_4px_0px_0px_#000]">
            <img
              src="/paxtools-logo.png"
              alt="Paxtools"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-4xl font-black text-foreground uppercase tracking-tight">
            Paxtools
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-bold uppercase tracking-wider">
            Progressão Pessoal &middot; Ramo Escoteiro
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-md border-2 border-black bg-card shadow-[6px_6px_0px_0px_#065f46]">
          <div className="p-6 pb-0">
            <h2 className="text-xl font-black text-foreground text-center uppercase">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground text-sm font-medium text-center mt-1">
              Faça login para continuar sua jornada
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3 p-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-md border-2 border-black bg-accent/30 p-3 hover:bg-accent/50 transition-colors shadow-[2px_2px_0px_0px_#000]"
              >
                <feature.icon className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-bold text-foreground">
                  {feature.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Sign-in section */}
          <div className="p-6 pt-2">
            {loading ? (
              <div className="h-11 rounded-md border-2 border-black bg-muted animate-pulse" />
            ) : (
              <div className="space-y-4">
                <SignInWithGoogle />
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <div className="flex-1 border-t-2 border-black/20" />
                  <span>ou</span>
                  <div className="flex-1 border-t-2 border-black/20" />
                </div>
                <SignInWithScoutId />
              </div>
            )}
          </div>
        </div>

        <Footer className="mt-4 text-center text-xs text-muted-foreground" />
      </div>
    </div>
  );
}
