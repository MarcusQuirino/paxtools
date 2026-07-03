/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import type { Id } from "../_generated/dataModel";
import {
  isEscoteiroVisible,
  filterVisibleEscoteiros,
  type ViewerAccess,
  type VisibilityTarget,
} from "./ramoVisibility";

const G1 = "group_1" as Id<"groups">;
const G2 = "group_2" as Id<"groups">;

const escotista: ViewerAccess = {
  groupId: G1,
  isAdmin: false,
  ramos: ["escoteiro", "senior"],
};
const admin: ViewerAccess = { groupId: G1, isAdmin: true, ramos: [] };

function target(overrides: Partial<VisibilityTarget> = {}): VisibilityTarget {
  return {
    role: "escoteiro",
    groupId: G1,
    membershipStatus: "approved",
    ramo: "escoteiro",
    ...overrides,
  };
}

describe("isEscoteiroVisible: grupo boundary", () => {
  test("target in another grupo is invisible to everyone", () => {
    expect(isEscoteiroVisible(escotista, target({ groupId: G2 }))).toBe(false);
    expect(isEscoteiroVisible(admin, target({ groupId: G2 }))).toBe(false);
  });

  test("target without a grupo is invisible to everyone", () => {
    expect(isEscoteiroVisible(escotista, target({ groupId: undefined }))).toBe(false);
    expect(isEscoteiroVisible(admin, target({ groupId: undefined }))).toBe(false);
  });
});

describe("isEscoteiroVisible: banned targets are invisible to everyone", () => {
  test("banned escoteiro, in-ramo and admin alike", () => {
    expect(isEscoteiroVisible(escotista, target({ bannedAt: 123 }))).toBe(false);
    expect(isEscoteiroVisible(admin, target({ bannedAt: 123 }))).toBe(false);
  });

  test("banned escotista target", () => {
    expect(
      isEscoteiroVisible(admin, target({ role: "escotista", ramo: undefined, bannedAt: 1 })),
    ).toBe(false);
  });
});

describe("isEscoteiroVisible: target membership", () => {
  test("pending membership is invisible to everyone", () => {
    expect(isEscoteiroVisible(escotista, target({ membershipStatus: "pending" }))).toBe(false);
    expect(isEscoteiroVisible(admin, target({ membershipStatus: "pending" }))).toBe(false);
  });

  test("unstamped (undefined) membership counts as approved", () => {
    expect(isEscoteiroVisible(escotista, target({ membershipStatus: undefined }))).toBe(true);
    expect(isEscoteiroVisible(admin, target({ membershipStatus: undefined }))).toBe(true);
  });
});

describe("isEscoteiroVisible: ramo boundary (escoteiro targets only)", () => {
  test("non-admin sees only accompanied ramos", () => {
    expect(isEscoteiroVisible(escotista, target({ ramo: "escoteiro" }))).toBe(true);
    expect(isEscoteiroVisible(escotista, target({ ramo: "senior" }))).toBe(true);
    expect(isEscoteiroVisible(escotista, target({ ramo: "lobinho" }))).toBe(false);
    expect(isEscoteiroVisible(escotista, target({ ramo: "pioneiro" }))).toBe(false);
  });

  test("admin sees every ramo", () => {
    for (const ramo of ["lobinho", "escoteiro", "senior", "pioneiro"] as const) {
      expect(isEscoteiroVisible(admin, target({ ramo }))).toBe(true);
    }
  });

  test("ramo-less escoteiro is visible to admins only", () => {
    expect(isEscoteiroVisible(escotista, target({ ramo: undefined }))).toBe(false);
    expect(isEscoteiroVisible(admin, target({ ramo: undefined }))).toBe(true);
  });

  test("viewer with no accompanied ramos sees no escoteiros unless admin", () => {
    const ramoless: ViewerAccess = { groupId: G1, isAdmin: false, ramos: [] };
    expect(isEscoteiroVisible(ramoless, target())).toBe(false);
  });

  test("non-escoteiro targets skip the ramo rule", () => {
    const fellow = target({ role: "escotista", ramo: undefined });
    expect(isEscoteiroVisible(escotista, fellow)).toBe(true);
    expect(isEscoteiroVisible(admin, fellow)).toBe(true);
    // A role-less user (mid-onboarding) is likewise not ramo-checked.
    expect(isEscoteiroVisible(escotista, target({ role: undefined, ramo: undefined }))).toBe(true);
  });
});

describe("isEscoteiroVisible: full escoteiro-target matrix", () => {
  const ramos = ["escoteiro", "lobinho", undefined] as const;
  const memberships = ["approved", "pending", undefined] as const;
  const bans = [undefined, 123] as const;
  const admins = [false, true] as const;

  test("matrix agrees with the stated rule", () => {
    for (const isAdmin of admins) {
      for (const ramo of ramos) {
        for (const membershipStatus of memberships) {
          for (const bannedAt of bans) {
            const viewer: ViewerAccess = { groupId: G1, isAdmin, ramos: ["escoteiro"] };
            const t = target({ ramo, membershipStatus, bannedAt });
            const expected =
              !bannedAt &&
              (membershipStatus ?? "approved") === "approved" &&
              (isAdmin || ramo === "escoteiro");
            expect(isEscoteiroVisible(viewer, t)).toBe(expected);
          }
        }
      }
    }
  });
});

describe("filterVisibleEscoteiros", () => {
  test("keeps exactly the visible targets, preserving order", () => {
    const visible1 = target({ ramo: "escoteiro" });
    const banned = target({ bannedAt: 5 });
    const otherRamo = target({ ramo: "lobinho" });
    const visible2 = target({ ramo: "senior", membershipStatus: undefined });
    const pending = target({ membershipStatus: "pending" });
    const result = filterVisibleEscoteiros(escotista, [
      visible1,
      banned,
      otherRamo,
      visible2,
      pending,
    ]);
    expect(result).toEqual([visible1, visible2]);
  });
});
