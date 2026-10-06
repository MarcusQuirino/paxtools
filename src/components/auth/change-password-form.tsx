import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { explainWeakPassword } from "../../../convex/lib/managedAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userErrorMessage } from "@/lib/user-error-message";

/**
 * A conta gerenciada choosing a new password. `forced` is the first sign-in
 * after an escotista issued a temporary password: the current one is not
 * asked for (they just typed it to get here).
 */
export function ChangePasswordForm({
  scoutId,
  forced,
  onDone,
}: {
  scoutId: string;
  forced: boolean;
  onDone?: () => void;
}) {
  const change = useAction(api.managedAccounts.changeOwnPassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setSaved(false);
    const weak = explainWeakPassword(next, scoutId);
    if (weak) return setError(weak);
    if (next !== confirm) return setError("As senhas não conferem");
    if (!forced && !current) return setError("Informe a senha atual");
    setBusy(true);
    setError("");
    try {
      await change({
        newPassword: next,
        ...(forced ? {} : { currentPassword: current }),
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setSaved(true);
      onDone?.();
    } catch (err) {
      setError(userErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-2">
      {!forced && (
        <Input
          type="password"
          placeholder="Senha atual"
          aria-label="Senha atual"
          autoComplete="current-password"
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            setError("");
          }}
        />
      )}
      <Input
        type="password"
        placeholder="Nova senha (mínimo 6 caracteres)"
        aria-label="Nova senha"
        autoComplete="new-password"
        data-testid="new-password"
        value={next}
        onChange={(e) => {
          setNext(e.target.value);
          setError("");
        }}
      />
      <Input
        type="password"
        placeholder="Repita a nova senha"
        aria-label="Repita a nova senha"
        autoComplete="new-password"
        data-testid="confirm-password"
        value={confirm}
        onChange={(e) => {
          setConfirm(e.target.value);
          setError("");
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && !forced && <p className="text-xs text-emerald-700">Senha alterada.</p>}
      <Button type="submit" size="sm" className="w-full" disabled={busy || !next}>
        {busy ? "Salvando..." : forced ? "Criar minha senha" : "Alterar senha"}
      </Button>
    </form>
  );
}
