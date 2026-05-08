import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { SignInWithGoogle } from "@/components/auth/sign-in";
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
      navigate({ to: "/" });
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-900">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-green-800/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-emerald-800/20 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 h-64 w-64 rounded-full bg-teal-900/10 blur-3xl" />
      </div>

      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-4 my-8">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 mb-4 shadow-lg">
            <img
              src="/paxtools-logo.png"
              alt="Paxtools"
              className="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Paxtools
          </h1>
          <p className="text-green-200/70 mt-1 text-sm">
            Progressão Pessoal &middot; Ramo Escoteiro
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 shadow-2xl">
          <div className="p-6 pb-0">
            <h2 className="text-xl font-semibold text-white text-center">
              Bem-vindo de volta
            </h2>
            <p className="text-green-200/60 text-sm text-center mt-1">
              Faça login para continuar sua jornada
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3 p-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl bg-white/[0.05] border border-white/[0.06] p-3 group hover:bg-white/[0.08] transition-colors"
              >
                <feature.icon className="w-5 h-5 text-emerald-300/80 mb-2" />
                <p className="text-sm font-medium text-white/90">
                  {feature.title}
                </p>
                <p className="text-xs text-green-200/50 mt-0.5 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Sign-in section */}
          <div className="p-6 pt-2">
            {loading ? (
              <div className="h-11 rounded-lg bg-white/10 animate-pulse" />
            ) : (
              <SignInWithGoogle />
            )}
          </div>
        </div>

        <Footer className="mt-6 text-center text-xs text-green-200/40" />
      </div>
    </div>
  );
}
