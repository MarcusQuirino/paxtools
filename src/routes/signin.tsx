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
              <SignInWithGoogle />
            )}
          </div>

          {TEST_AUTH_ENABLED && !loading ? <TestSignInForm /> : null}
        </div>

        <Footer className="mt-4 text-center text-xs text-muted-foreground" />
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
      <div className="rounded-md border-2 border-dashed border-black/30 bg-muted/50 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
          Test sign-in (dev only)
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            data-testid="test-signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@test.paxtools.local"
            className="rounded-md border-2 border-black bg-white px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
            autoComplete="off"
          />
          <input
            data-testid="test-signin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="rounded-md border-2 border-black bg-white px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
            autoComplete="off"
          />
          <button
            data-testid="test-signin-submit"
            type="submit"
            disabled={submitting}
            className="rounded-md border-2 border-black bg-primary text-white px-2 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:opacity-50 transition-all"
          >
            {submitting ? "Signing in…" : "Sign in (test)"}
          </button>
          {error ? (
            <p className="text-[11px] text-destructive font-medium">{error}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
