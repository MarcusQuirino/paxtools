import { describe, it, expect } from "bun:test";
import {
  beginUndo,
  settleUndo,
  startSession,
  swipe,
  summarize,
  type RevisaoSession,
} from "@/lib/revisao-session";

/** An undo the server confirmed. */
function undoConfirmed<R>(s: RevisaoSession<R>) {
  const step = beginUndo(s);
  return { session: settleUndo(step.session, true), undone: step.undone };
}

describe("Revisão rápida session", () => {
  it("each swipe moves to the next card and is counted in the summary", () => {
    let s = startSession<string>(5);
    s = swipe(s, "done", "r0");
    s = swipe(s, "plan", "r1");
    s = swipe(s, "skip", "r2");
    s = swipe(s, "done", "r3");

    expect(s.index).toBe(4);
    expect(summarize(s)).toEqual({
      done: 2,
      plan: 1,
      skip: 1,
      unseen: 1,
      finished: false,
    });
  });

  it("undo walks back card by card, handing back what each card did", () => {
    let s = startSession<string>(3);
    s = swipe(s, "done", "mark-a");
    s = swipe(s, "plan", "plan-b");

    const first = undoConfirmed(s);
    expect(first.undone).toEqual({ index: 1, kind: "plan", receipt: "plan-b" });
    expect(first.session.index).toBe(1);

    const second = undoConfirmed(first.session);
    expect(second.undone).toEqual({ index: 0, kind: "done", receipt: "mark-a" });
    expect(second.session.index).toBe(0);
    expect(summarize(second.session)).toEqual({
      done: 0,
      plan: 0,
      skip: 0,
      unseen: 3,
      finished: false,
    });

    const none = beginUndo(second.session);
    expect(none.undone).toBeNull();
    expect(none.session).toEqual(second.session);
  });

  it("an undo the server refuses keeps the card counted as marked", () => {
    let s = startSession<string>(3);
    s = swipe(s, "done", "mark-a");

    const step = beginUndo(s);
    expect(step.undone?.receipt).toBe("mark-a");
    const refused = settleUndo(step.session, false);

    expect(refused.index).toBe(1);
    expect(summarize(refused)).toMatchObject({ done: 1, unseen: 2 });
    // …and it can still be tried again.
    expect(beginUndo(refused).undone?.receipt).toBe("mark-a");
  });

  it("while an undo awaits the server, the card stays counted and swipes or further undos are ignored", () => {
    let s = startSession<string>(3);
    s = swipe(s, "skip", "a");
    s = swipe(s, "done", "b");

    const { session: waiting } = beginUndo(s);
    expect(summarize(waiting)).toMatchObject({ done: 1, skip: 1, unseen: 1 });
    expect(swipe(waiting, "done", "c")).toEqual(waiting);
    expect(beginUndo(waiting)).toEqual({ session: waiting, undone: null });

    const settled = settleUndo(waiting, true);
    expect(settled.index).toBe(1);
    expect(summarize(settled)).toMatchObject({ done: 0, skip: 1, unseen: 2 });
  });

  it("settling with no undo in flight changes nothing", () => {
    const s = swipe(startSession<string>(2), "done", "a");
    expect(settleUndo(s, true)).toEqual(s);
  });

  it("a run that swiped every card is finished, and further swipes are ignored", () => {
    let s = startSession<string>(2);
    s = swipe(s, "skip", "a");
    s = swipe(s, "done", "b");
    const after = swipe(s, "done", "c");

    expect(after).toEqual(s);
    expect(summarize(after)).toEqual({
      done: 1,
      plan: 0,
      skip: 1,
      unseen: 0,
      finished: true,
    });
  });

  it("an empty deck is finished from the start", () => {
    expect(summarize(startSession(0))).toEqual({
      done: 0,
      plan: 0,
      skip: 0,
      unseen: 0,
      finished: true,
    });
  });

  it("undo from the end of the deck puts the last card back", () => {
    let s = startSession<string>(1);
    s = swipe(s, "done", "a");
    const { session, undone } = undoConfirmed(s);
    expect(undone?.receipt).toBe("a");
    expect(summarize(session).finished).toBe(false);
    expect(session.index).toBe(0);
  });

  it("keeps undoing back to the first card", () => {
    let s = startSession<string>(4);
    for (const r of ["a", "b", "c"]) s = swipe(s, "skip", r);
    const receipts: string[] = [];
    for (;;) {
      const step = undoConfirmed(s);
      if (!step.undone) break;
      receipts.push(step.undone.receipt);
      s = step.session;
    }
    expect(receipts).toEqual(["c", "b", "a"]);
    expect(s.index).toBe(0);
  });
});
