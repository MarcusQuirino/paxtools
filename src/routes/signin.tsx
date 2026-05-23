import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { SignInWithGoogle } from "@/components/auth/sign-in";
import { Footer } from "@/components/footer";
import { Compass, Map, Award, TrendingUp } from "lucide-react";

const TEST_AUTH_ENABLED = import.meta.env.VITE_TEST_AUTH === "1";

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 my-8">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-sm bg-emerald-700 border-2 border-black shadow-[4px_4px_0_0_#000] mb-4">
            <img
              src="/paxtools-logo.png"
              alt="Paxtools"
              className="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
            Paxtools
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Progressão Pessoal &middot; Ramo Escoteiro
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-sm bg-card border-2 border-black shadow-[4px_4px_0_0_#000]">
          <div className="p-6 pb-0">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground text-center">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground text-sm text-center mt-1">
              Faça login para continuar sua jornada
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3 p-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-sm bg-muted border-2 border-black p-3 hover:bg-secondary transition-colors"
              >
                <feature.icon className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-black uppercase tracking-wide text-foreground">
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
              <div className="h-11 rounded-sm bg-muted border-2 border-black animate-pulse" />
            ) : (
              <SignInWithGoogle />
            )}
          </div>

          {TEST_AUTH_ENABLED && !loading ? <TestSignInForm /> : null}
        </div>

        <Footer className="mt-6 text-center text-xs text-muted-foreground" />
      </div>
    </div>
  );
}

function TestSignInForm() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn("test-password", { email, password, flow: "signIn" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-6 pb-6 pt-0">
      <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-3">
        <p className="text-[10px] uppercase tracking-wider text-green-200/40 mb-2">
          Test sign-in (dev only)
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            data-testid="test-signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@test.paxtools.local"
            className="rounded-md bg-white/[0.06] border border-white/10 px-2 py-1.5 text-xs text-white placeholder:text-green-200/30 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
            autoComplete="off"
          />
          <input
            data-testid="test-signin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="rounded-md bg-white/[0.06] border border-white/10 px-2 py-1.5 text-xs text-white placeholder:text-green-200/30 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
            autoComplete="off"
          />
          <button
            data-testid="test-signin-submit"
            type="submit"
            disabled={submitting}
            className="rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/20 px-2 py-1.5 text-xs font-medium text-emerald-100 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Signing in…" : "Sign in (test)"}
          </button>
          {error ? (
            <p className="text-[11px] text-red-300/80">{error}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
