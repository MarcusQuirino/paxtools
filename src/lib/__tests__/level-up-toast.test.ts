import { describe, it, expect, spyOn, afterEach } from "bun:test";
import { toast } from "sonner";
import { notifyLevelUps } from "@/lib/level-up-toast";

const success = spyOn(toast, "success").mockImplementation(() => "id");

afterEach(() => success.mockClear());

describe("notifyLevelUps", () => {
  it("toasts each level-up with the scout and stage names", () => {
    notifyLevelUps([
      { subjectUserId: "u1", subjectName: "Ana", kind: "levelUp", stageName: "Rumo" },
      { subjectUserId: "u2", subjectName: "Bia", kind: "levelUp", stageName: "Travessia" },
    ]);
    expect(success.mock.calls.map((c) => c[0])).toEqual([
      "🎉 Ana alcançou Rumo!",
      "🎉 Bia alcançou Travessia!",
    ]);
  });

  it("names the ramo's IRR for a lisDeOuro", () => {
    notifyLevelUps([
      { subjectUserId: "u1", subjectName: "Caio", kind: "lisDeOuro", stageName: "Cruzeiro do Sul" },
    ]);
    expect(success).toHaveBeenCalledWith("🏅 Caio conquistou a Cruzeiro do Sul!");
  });

  it("falls back to generic wording when names are missing", () => {
    notifyLevelUps([
      { subjectUserId: "u1", subjectName: null, kind: "levelUp", stageName: null },
      { subjectUserId: "u1", subjectName: null, kind: "lisDeOuro", stageName: null },
    ]);
    expect(success.mock.calls.map((c) => c[0])).toEqual([
      "🎉 Escoteiro alcançou um novo nível!",
      "🏅 Escoteiro conquistou a Insígnia de Reconhecimento de Ramo!",
    ]);
  });

  it("ignores any result that is not a list of level-ups", () => {
    for (const result of [undefined, null, true, "ok", {}, [{ kind: "other" }], [null]]) {
      notifyLevelUps(result);
    }
    notifyLevelUps([]);
    expect(success).not.toHaveBeenCalled();
  });
});
