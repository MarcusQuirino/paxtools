import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { normalizeScoutId } from "../../../convex/lib/managedAccounts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RamoPicker } from "@/components/onboarding/ramo-picker";
import type { Ramo } from "@/lib/ramos";
import { userErrorMessage } from "@/lib/user-error-message";
import { copyText } from "@/lib/clipboard";
import { Check, Copy, KeyRound, UserPlus } from "lucide-react";

type Credentials = { name: string; scoutId: string; password: string };

/**
 * The one-time view of a conta gerenciada's temporary password. It is stored
 * hashed, so once this closes it can only be replaced, never shown again.
 */
function CredentialsCard({ credentials }: { credentials: Credentials }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const copy = async (host: HTMLElement) => {
    const ok = await copyText(credentials.password, host);
    setCopyState(ok ? "copied" : "failed");
    setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <div className="space-y-3">
      <div
        data-testid="managed-credentials"
        className="rounded-md border-2 border-black bg-amber-50 p-3 space-y-1 shadow-[2px_2px_0px_0px_#000]"
      >
        <p className="text-xs font-bold uppercase text-muted-foreground">
          Registro
        </p>
        <p className="font-mono text-lg font-black" data-testid="managed-scout-id">
          {credentials.scoutId}
        </p>
        <p className="text-xs font-bold uppercase text-muted-foreground pt-1">
          Senha temporária
        </p>
        <p className="font-mono text-lg font-black" data-testid="managed-password">
          {credentials.password}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Anote ou envie agora — a senha não aparece de novo. No primeiro acesso{" "}
        {credentials.name} vai criar a própria senha.
      </p>
      <Button
        variant="outline"
        size="sm"
        data-testid="copy-managed-password"
        onClick={(e) => void copy(e.currentTarget.parentElement ?? document.body)}
      >
        {copyState === "copied" ? (
          <Check className="size-4" />
        ) : (
          <Copy className="size-4" />
        )}
        {copyState === "copied"
          ? "Senha copiada!"
          : copyState === "failed"
            ? "Não deu para copiar — anote a senha"
            : "Copiar senha"}
      </Button>
    </div>
  );
}

/**
 * "Criar novo usuário": an escotista creates a conta gerenciada for a
 * member who signs in with their registro escoteiro. Escoteiros are limited to
 * the ramos the caller accompanies (admins: any); only admins create
 * escotistas — the server enforces both.
 */
export function CreateManagedMemberButton({
  role,
  ramoOptions,
}: {
  role: "escoteiro" | "escotista";
  /** Ramos the caller may assign; undefined = all (admin). */
  ramoOptions?: Ramo[];
}) {
  const create = useAction(api.managedAccounts.createManagedMember);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scoutId, setScoutId] = useState("");
  const [ramo, setRamo] = useState<Ramo | null>(
    ramoOptions?.length === 1 ? ramoOptions[0]! : null,
  );
  const [ramos, setRamos] = useState<Ramo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Credentials | null>(null);

  const reset = () => {
    setName("");
    setScoutId("");
    setRamo(ramoOptions?.length === 1 ? ramoOptions[0]! : null);
    setRamos([]);
    setError("");
    setCreated(null);
  };

  const validScoutId = normalizeScoutId(scoutId) !== null;
  const canSubmit =
    !!name.trim() &&
    validScoutId &&
    (role === "escotista" ? ramos.length > 0 : !!ramo) &&
    !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const res = await create({
        name: name.trim(),
        scoutId,
        role,
        ...(role === "escotista" ? { escotistaRamos: ramos } : { ramo: ramo! }),
      });
      setCreated({ name: name.trim(), scoutId: res.scoutId, password: res.password });
    } catch (err) {
      setError(userErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // "Escoteiro" is also a ramo name, so youth members are just "usuário".
  const label = role === "escotista" ? "escotista" : "usuário";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        data-testid={`create-managed-${role}`}
      >
        <UserPlus className="size-4" />
        Criar novo {label}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="border-2 border-black shadow-[4px_4px_0px_0px_#000] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">
              {created ? "Acesso criado" : `Novo ${label}`}
            </DialogTitle>
            <DialogDescription>
              {created
                ? `${created.name} já faz parte do grupo.`
                : "Entra com o registro escoteiro e uma senha. Você recebe uma senha temporária para entregar."}
            </DialogDescription>
          </DialogHeader>

          {created ? (
            <CredentialsCard credentials={created} />
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div className="space-y-1">
                <label htmlFor="managed-name" className="text-xs font-medium">
                  Nome
                </label>
                <Input
                  id="managed-name"
                  value={name}
                  maxLength={100}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="managed-scout-id-input" className="text-xs font-medium">
                  Registro escoteiro (7 dígitos)
                </label>
                <Input
                  id="managed-scout-id-input"
                  inputMode="numeric"
                  value={scoutId}
                  maxLength={10}
                  placeholder="0000000"
                  className="font-mono tracking-widest"
                  onChange={(e) => {
                    setScoutId(e.target.value);
                    setError("");
                  }}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">
                  {role === "escotista" ? "Ramos que acompanha" : "Ramo"}
                </p>
                {role === "escotista" ? (
                  <RamoPicker mode="multi" value={ramos} onChange={setRamos} />
                ) : (
                  <RamoPicker
                    mode="single"
                    value={ramo}
                    onChange={setRamo}
                    options={ramoOptions}
                  />
                )}
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={!canSubmit}>
                  {busy ? "Criando..." : "Criar acesso"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * "Gerar nova senha" for a conta gerenciada that forgot its password: issues
 * a temporary one, signs the member out everywhere and forces a change on
 * their next sign-in.
 */
export function ResetManagedPasswordButton({
  userId,
  name,
  compact = false,
}: {
  userId: Id<"users">;
  name: string;
  compact?: boolean;
}) {
  const resetPassword = useAction(api.managedAccounts.resetManagedPassword);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<Credentials | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await resetPassword({ userId });
      setIssued({ name, scoutId: res.scoutId, password: res.password });
    } catch (err) {
      setError(userErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        title="Gerar nova senha"
        data-testid="reset-managed-password"
        onClick={() => {
          setIssued(null);
          setError("");
          setOpen(true);
        }}
      >
        <KeyRound className="size-4" aria-hidden />
        {compact ? null : "Nova senha"}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">
              {issued ? "Nova senha gerada" : "Gerar nova senha"}
            </DialogTitle>
            <DialogDescription>
              {issued
                ? `As sessões de ${name} foram encerradas. No próximo acesso, uma senha nova será criada.`
                : `${name} esqueceu a senha? A senha atual deixa de funcionar e você recebe uma temporária para entregar.`}
            </DialogDescription>
          </DialogHeader>
          {issued ? (
            <CredentialsCard credentials={issued} />
          ) : (
            <>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                >
                  Cancelar
                </Button>
                <Button size="sm" onClick={() => void confirm()} disabled={busy}>
                  {busy ? "..." : "Gerar nova senha"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
