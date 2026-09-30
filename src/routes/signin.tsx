import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { SignInWithGoogle } from "@/components/auth/sign-in";
import { Footer } from "@/components/footer";
import { HardButton } from "@/components/ui/hard-button";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { Card, ListBox, SectionHeading } from "@/components/ui/section";
import { EMERALD_INK, EMERALD_TINT } from "@/lib/design-tokens";
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
    title: "Trilha pessoal",
    description: "Acompanhe cada passo da sua progressão",
  },
  {
    icon: Map,
    title: "Eixos de desenvolvimento",
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
    <div className="min-h-screen bg-background px-4 text-[#141414]">
      <div className="mx-auto w-full max-w-md space-y-4 py-8">
        {/* Brand (fine here — this is a landing, not a top bar). No shadow:
            the one heavy element on this screen is the Google CTA. */}
        <div className="pb-2 text-center">
          <div className="mb-3 inline-flex size-16 items-center justify-center rounded-[10px] border-2 border-[#141414] bg-primary">
            <img
              src="/paxtools-logo.png"
              alt="Paxtools"
              className="size-10 object-contain"
            />
          </div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A887F]">
            Progressão pessoal escoteira
          </p>
          <h1 className="text-[28px] font-black leading-[1.05] tracking-[-0.02em]">
            Paxtools
          </h1>
        </div>

        <Card className="space-y-4 p-5">
          <div className="text-center">
            <h2 className="text-[22px] font-black leading-[1.1] tracking-[-0.02em]">
              Bem-vindo de volta
            </h2>
            <p className="mt-1 text-[15px] text-[#4A4A44]">
              Faça login para continuar sua jornada
            </p>
          </div>

          {loading ? (
            <div className="h-[52px] animate-pulse rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC]" />
          ) : (
            <SignInWithGoogle />
          )}

          {TEST_AUTH_ENABLED && !loading ? <TestSignInForm /> : null}
        </Card>

        <section>
          <SectionHeading label="Recursos" />
          <ListBox>
            {features.map((feature) => (
              <ListRow
                key={feature.title}
                leading={
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-[#141414]"
                    style={{ background: EMERALD_TINT, color: EMERALD_INK }}
                    aria-hidden
                  >
                    <feature.icon className="size-5" strokeWidth={2.5} />
                  </span>
                }
                title={feature.title}
                subtitle={feature.description}
              />
            ))}
          </ListBox>
        </section>

        <Footer />
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
    <div className="rounded-[10px] border-2 border-dashed border-[#8A887F] p-3">
      <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A887F]">
        Test sign-in (dev only)
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Input
          data-testid="test-signin-email"
          type="email"
          aria-label="Test email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@test.paxtools.local"
          autoComplete="off"
        />
        <Input
          data-testid="test-signin-password"
          type="password"
          aria-label="Test password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete="off"
        />
        <HardButton
          data-testid="test-signin-submit"
          type="submit"
          tone="paper"
          full
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Sign in (test)"}
        </HardButton>
        {error ? (
          <p role="alert" className="text-[12px] font-bold text-[#C62828]">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
