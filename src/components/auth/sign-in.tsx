import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  MANAGED_PROVIDER,
  normalizeScoutId,
} from "../../../convex/lib/managedAccounts";

export function SignInWithGoogle() {
  const { signIn } = useAuthActions();

  return (
    <button
      onClick={() => void signIn("google")}
      className="w-full flex items-center justify-center gap-3 rounded-md bg-white border-2 border-black px-4 py-3 text-sm font-bold text-foreground shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      Continuar com Google
    </button>
  );
}

/**
 * Sign-in for a conta gerenciada: registro escoteiro + password. Every
 * failure reads the same so the form does not reveal which registros exist.
 */
export function SignInWithScoutId() {
  const { signIn } = useAuthActions();
  const [scoutId, setScoutId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const id = normalizeScoutId(scoutId);
    if (!id) {
      setError("O registro tem 6 dígitos");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await signIn(MANAGED_PROVIDER, { email: id, password, flow: "signIn" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("TooManyFailedAttempts")
          ? "Muitas tentativas. Tente de novo mais tarde ou peça uma nova senha ao seu escotista."
          : "Registro ou senha incorretos",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-2">
      <input
        data-testid="scout-signin-id"
        inputMode="numeric"
        autoComplete="username"
        aria-label="Registro escoteiro"
        placeholder="Registro escoteiro (6 dígitos)"
        maxLength={9}
        value={scoutId}
        onChange={(e) => {
          setScoutId(e.target.value);
          setError("");
        }}
        className="rounded-md border-2 border-black bg-white px-3 py-2.5 text-sm font-mono tracking-widest text-foreground placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
      />
      <input
        data-testid="scout-signin-password"
        type="password"
        autoComplete="current-password"
        aria-label="Senha"
        placeholder="Senha"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError("");
        }}
        className="rounded-md border-2 border-black bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
      />
      <button
        data-testid="scout-signin-submit"
        type="submit"
        disabled={submitting || !scoutId || !password}
        className="rounded-md border-2 border-black bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] disabled:opacity-50 transition-all cursor-pointer"
      >
        {submitting ? "Entrando..." : "Entrar com registro"}
      </button>
      {error ? (
        <p className="text-xs text-destructive font-medium">{error}</p>
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        Sem conta Google? Peça ao seu escotista para criar seu acesso.
      </p>
    </form>
  );
}
