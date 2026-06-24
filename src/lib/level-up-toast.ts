import { toast } from "sonner";

/**
 * Shape returned by the approval mutations (approveAction / bulkAction /
 * toggle* in escotista mode, …). Mirrors `LevelUpToast` on the backend. Kept
 * loose because it arrives through `useConvexMutation` as `unknown`.
 */
export type LevelUpToast = {
  subjectUserId: string;
  subjectName: string | null;
  kind: "levelUp" | "lisDeOuro";
  stageName: string | null;
};

function isLevelUpToastArray(value: unknown): value is LevelUpToast[] {
  return (
    Array.isArray(value) &&
    value.every(
      (x) =>
        !!x &&
        typeof x === "object" &&
        "kind" in x &&
        ((x as LevelUpToast).kind === "levelUp" ||
          (x as LevelUpToast).kind === "lisDeOuro"),
    )
  );
}

/**
 * Surface a celebratory toast for each level-up an approval produced. Safe to
 * pass any mutation result: a non-level-up / empty result is ignored, so this
 * can be dropped into `onSuccess` of every approval mutation uniformly.
 */
export function notifyLevelUps(result: unknown): void {
  if (!isLevelUpToastArray(result)) return;
  for (const up of result) {
    const who = up.subjectName ?? "Escoteiro";
    if (up.kind === "lisDeOuro") {
      toast.success(`🏅 ${who} conquistou a Lis de Ouro!`);
    } else {
      toast.success(`🎉 ${who} alcançou ${up.stageName ?? "um novo nível"}!`);
    }
  }
}
