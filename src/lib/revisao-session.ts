/**
 * Revisão rápida session — the client-only state of one run through a deck:
 * where we are, and an undo stack of what each card did.
 *
 * Generic over the server receipt `R` each swipe produced (e.g. a pending
 * mark mutation), so undo can hand it back to revert that card. Nothing here
 * is persisted. Pure and browser-free.
 */

/** What a card was swiped as: → já fiz, ← ainda não, ↑ pro Plano. */
export type SwipeKind = "done" | "skip" | "plan";

export type SessionEntry<R> = {
  /** Deck index of the card this entry swiped. */
  index: number;
  kind: SwipeKind;
  receipt: R;
};

export type RevisaoSession<R> = {
  /** Deck size, fixed for the run. */
  total: number;
  /** Deck index of the card on top. */
  index: number;
  /** Swipes, oldest first. */
  history: SessionEntry<R>[];
};

export type SessionSummary = {
  done: number;
  plan: number;
  skip: number;
  /** Cards never reached in this run. */
  unseen: number;
  /** Every card of the deck was swiped. */
  finished: boolean;
};

export function startSession<R>(total: number): RevisaoSession<R> {
  return { total, index: 0, history: [] };
}

export function swipe<R>(
  s: RevisaoSession<R>,
  kind: SwipeKind,
  receipt: R,
): RevisaoSession<R> {
  if (s.index >= s.total) return s;
  return {
    ...s,
    index: s.index + 1,
    history: [...s.history, { index: s.index, kind, receipt }],
  };
}

export function summarize<R>(s: RevisaoSession<R>): SessionSummary {
  const count = (kind: SwipeKind) =>
    s.history.filter((h) => h.kind === kind).length;
  return {
    done: count("done"),
    plan: count("plan"),
    skip: count("skip"),
    unseen: s.total - s.index,
    finished: s.index >= s.total,
  };
}

/**
 * Revert the most recent swipe: its card goes back on top. `undone` is that
 * entry (with its receipt, for reverting the server side), or null when there
 * is nothing left to undo.
 */
export function undo<R>(s: RevisaoSession<R>): {
  session: RevisaoSession<R>;
  undone: SessionEntry<R> | null;
} {
  const undone = s.history.at(-1) ?? null;
  if (!undone) return { session: s, undone: null };
  return {
    session: { ...s, index: undone.index, history: s.history.slice(0, -1) },
    undone,
  };
}
