import { describe, it, expect } from "bun:test";
import { ConvexError } from "convex/values";
import { userErrorMessage } from "@/lib/user-error-message";

describe("userErrorMessage", () => {
  it("returns a ConvexError's string payload as-is", () => {
    expect(userErrorMessage(new ConvexError("Este registro já tem acesso"))).toBe(
      "Este registro já tem acesso",
    );
  });

  it("strips Convex's server wrapper and stack from a plain Error", () => {
    const raw =
      "[CONVEX M(groups:joinGroup)] [Request ID: abc] Server Error\n" +
      "Uncaught Error: Senha do grupo inválida\n    at handler (../convex/groups.ts:200:11)";
    expect(userErrorMessage(new Error(raw))).toBe("Senha do grupo inválida");
  });

  it("also unwraps an `Uncaught ConvexError:` line", () => {
    expect(
      userErrorMessage(new Error("Server Error\nUncaught ConvexError: Você não acompanha esse ramo")),
    ).toBe("Você não acompanha esse ramo");
  });

  it("drops a trailing stack frame kept on the same line", () => {
    expect(userErrorMessage(new Error("Uncaught Error: Não autenticado at handler (x.ts:1:1)"))).toBe(
      "Não autenticado",
    );
  });

  it("passes an unwrapped message through, trimmed", () => {
    expect(userErrorMessage(new Error("  Falha de rede  "))).toBe("Falha de rede");
  });

  it("stringifies a non-Error throw", () => {
    expect(userErrorMessage("boom")).toBe("boom");
    expect(userErrorMessage(42)).toBe("42");
  });

  it("falls back to the message for a ConvexError with a structured payload", () => {
    expect(userErrorMessage(new ConvexError({ code: "X" }))).toBe('{"code":"X"}');
  });
});
