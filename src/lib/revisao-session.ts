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
  /**
   * The last swipe's undo is awaiting the server. Until it settles the swipe
   * still counts, and further swipes and undos are ignored.
   */
  undoing: boolean;
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
  return { total, index: 0, history: [], undoing: false };
}

export function swipe<R>(
  s: RevisaoSession<R>,
  kind: SwipeKind,
  receipt: R,
): RevisaoSession<R> {
  if (s.undoing || s.index >= s.total) return s;
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
 * Start undoing the most recent swipe. `undone` is that entry (with its
 * receipt, for reverting the server side), or null when there is nothing to
 * undo or an undo is already in flight. The swipe keeps counting until
 * `settleUndo` reports what the server said.
 */
export function beginUndo<R>(s: RevisaoSession<R>): {
  session: RevisaoSession<R>;
  undone: SessionEntry<R> | null;
} {
  const undone = s.undoing ? null : (s.history.at(-1) ?? null);
  if (!undone) return { session: s, undone: null };
  return { session: { ...s, undoing: true }, undone };
}

/**
 * Finish the undo in flight. Confirmed: its card goes back on top. Refused
 * (e.g. an escotista approved the mark meanwhile): the swipe stays as it was.
 */
export function settleUndo<R>(
  s: RevisaoSession<R>,
  confirmed: boolean,
): RevisaoSession<R> {
  if (!s.undoing) return s;
  const undone = s.history.at(-1);
  if (!confirmed || !undone) return { ...s, undoing: false };
  return {
    ...s,
    undoing: false,
    index: undone.index,
    history: s.history.slice(0, -1),
  };
}
