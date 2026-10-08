import { describe, it, expect } from "bun:test";
import { dragStamp, resolveDrag } from "@/lib/revisao-gesture";

const escoteiro = { planEnabled: true, canUndo: true };
const escotista = { planEnabled: false, canUndo: true };

describe("resolveDrag — what releasing a dragged card does", () => {
  it("maps a clear swipe on the dominant axis to its action", () => {
    expect(resolveDrag({ dx: 140, dy: 30 }, escoteiro)).toBe("done");
    expect(resolveDrag({ dx: -140, dy: -30 }, escoteiro)).toBe("skip");
    expect(resolveDrag({ dx: 20, dy: -150 }, escoteiro)).toBe("plan");
    expect(resolveDrag({ dx: -20, dy: 150 }, escoteiro)).toBe("undo");
  });

  it("snaps back when the drag is under the ~100px threshold", () => {
    expect(resolveDrag({ dx: 90, dy: 0 }, escoteiro)).toBeNull();
    expect(resolveDrag({ dx: 0, dy: -99 }, escoteiro)).toBeNull();
    expect(resolveDrag({ dx: 0, dy: 0 }, escoteiro)).toBeNull();
  });

  it("uses the dominant axis on diagonals", () => {
    expect(resolveDrag({ dx: 130, dy: -120 }, escoteiro)).toBe("done");
    expect(resolveDrag({ dx: 110, dy: -125 }, escoteiro)).toBe("plan");
  });

  it("never sends to the Plano in escotista mode", () => {
    expect(resolveDrag({ dx: 0, dy: -200 }, escotista)).toBeNull();
  });

  it("does not undo when there is nothing to undo", () => {
    expect(
      resolveDrag({ dx: 0, dy: 200 }, { planEnabled: true, canUndo: false }),
    ).toBeNull();
  });
});

describe("dragStamp — the stamp shown while dragging", () => {
  it("previews the action of the dominant direction, fading in with distance", () => {
    expect(dragStamp({ dx: 55, dy: 0 }, true)).toEqual({ kind: "done", opacity: 0.5 });
    expect(dragStamp({ dx: -220, dy: 10 }, true)).toEqual({ kind: "skip", opacity: 1 });
    expect(dragStamp({ dx: 0, dy: -110 }, true)).toEqual({ kind: "plan", opacity: 1 });
  });

  it("shows no stamp for downward drags, or upward ones without the Plano", () => {
    expect(dragStamp({ dx: 0, dy: 120 }, true)).toBeNull();
    expect(dragStamp({ dx: 0, dy: -120 }, false)).toBeNull();
    expect(dragStamp({ dx: 0, dy: 0 }, true)).toBeNull();
  });
});
