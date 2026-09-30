import { describe, it, expect } from "bun:test";
import type { Bloco, CustomAction, Eixo } from "@/data/types";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  blocoStatusLine,
  eixoMetaLine,
  findBloco,
  pickContinueBloco,
  summarizeAll,
  summarizeBloco,
} from "@/lib/bloco-summary";

const bloco = (id: string, fixed = 2, variable = 4, required = 2): Bloco => ({
  id,
  name: id,
  objective: "",
  eixoId: "meio-ambiente",
  fixedActions: Array.from({ length: fixed }, (_, i) => ({ id: `${id}:f${i}`, text: "", type: "fixed" })),
  variableActions: Array.from({ length: variable }, (_, i) => ({
    id: `${id}:v${i}`,
    text: "",
    type: "variable",
  })),
  variableRequired: required,
  alternativeCompletions: [],
});

const eixo: Eixo = {
  id: "meio-ambiente",
  name: "Meio Ambiente",
  color: "#2E7D32",
  colorLight: "#DFF2E0",
  blocos: [bloco("a"), bloco("b"), bloco("c")],
};

const empty = { approvedActionIds: new Set<string>(), pendingActionIds: new Set<string>(), customActions: [] };

describe("summarizeBloco", () => {
  it("is open and unstarted with nothing marked", () => {
    const s = summarizeBloco(bloco("a"), empty);
    expect(s).toMatchObject({ total: 4, approvedDone: 0, pendingDone: 0, state: "open", started: false });
    expect(blocoStatusLine(s)).toEqual({ text: "0 de 4 ações", tone: "muted" });
  });

  it("counts approved and aguardando separately, capping variables at the requirement", () => {
    const s = summarizeBloco(bloco("a"), {
      ...empty,
      approvedActionIds: new Set(["a:f0", "a:v0", "a:v1", "a:v2"]),
      pendingActionIds: new Set(["a:f1"]),
    });
    expect(s.approvedDone).toBe(3); // f0 + 2 of 2 variables (v2 is surplus)
    expect(s.pendingDone).toBe(1);
    expect(s.state).toBe("pending");
    expect(s.approvedPct).toBe(75);
    expect(s.pendingPct).toBe(100);
    expect(blocoStatusLine(s)).toEqual({ text: "Aguardando aprovação", tone: "pending" });
  });

  it("shows the aguardando count while still open", () => {
    const s = summarizeBloco(bloco("a"), { ...empty, pendingActionIds: new Set(["a:v0"]) });
    expect(s.started).toBe(true);
    expect(blocoStatusLine(s).text).toBe("0 de 4 ações · 1 aguardando");
  });

  it("counts approved custom ações as variables and completes the bloco", () => {
    const custom: CustomAction[] = [
      { _id: "c1" as Id<"customActions">, blocoId: "a", text: "x", completed: true, status: "approved" },
      { _id: "c2" as Id<"customActions">, blocoId: "a", text: "y", completed: true },
    ];
    const s = summarizeBloco(bloco("a"), {
      ...empty,
      approvedActionIds: new Set(["a:f0", "a:f1"]),
      customActions: custom,
    });
    expect(s.state).toBe("full");
    expect(blocoStatusLine(s).text).toBe("Completo");
  });

  it("marks a bloco completed through an especialidade", () => {
    const s = summarizeBloco(bloco("a", 0, 4, 2), {
      ...empty,
      earnedSpecialtyBlocoIds: new Set(["a"]),
    });
    expect(s.viaSpecialty).toBe(true);
    expect(s.state).toBe("full");
    expect(blocoStatusLine(s).text).toBe("Completo · via especialidade");
  });
});

describe("eixoMetaLine", () => {
  it("reads 'N de M blocos · K aguardando'", () => {
    expect(eixoMetaLine(eixo, new Set(["a"]), new Set(["b"]))).toBe("1 de 3 blocos · 1 aguardando");
    expect(eixoMetaLine(eixo, new Set(), new Set())).toBe("0 de 3 blocos");
  });
});

describe("pickContinueBloco", () => {
  const input = {
    ...empty,
    approvedActionIds: new Set(["a:f0", "a:f1", "a:v0", "a:v1", "b:f0", "c:f0", "c:f1"]),
  };
  const summaries = summarizeAll([eixo], input);

  it("prefers the last visited bloco when it isn't complete", () => {
    expect(pickContinueBloco([eixo], summaries, "b")?.bloco.id).toBe("b");
  });

  it("skips a completed last-visited bloco and picks the started one closest to done", () => {
    expect(pickContinueBloco([eixo], summaries, "a")?.bloco.id).toBe("c");
  });

  it("returns null when nothing is in progress", () => {
    expect(pickContinueBloco([eixo], summarizeAll([eixo], empty), null)).toBeNull();
  });
});

describe("findBloco", () => {
  it("returns the bloco with its eixo and index", () => {
    expect(findBloco([eixo], "b")).toMatchObject({ eixo: { id: "meio-ambiente" }, index: 1 });
    expect(findBloco([eixo], "zzz")).toBeNull();
  });
});
