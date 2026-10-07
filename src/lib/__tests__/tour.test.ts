import { describe, it, expect } from "bun:test";
import {
  ESCOTEIRO_TOUR,
  escotistaTour,
  isTourOpen,
  placeCard,
  shouldAutoStartTour,
  tourStepsFor,
} from "@/lib/tour";

describe("tour scripts", () => {
  it("open with a welcome and close with a farewell, both untargeted", () => {
    for (const steps of [ESCOTEIRO_TOUR, escotistaTour(false), escotistaTour(true)]) {
      expect(steps[0]?.id).toBe("welcome");
      expect(steps[0]?.target).toBeUndefined();
      expect(steps.at(-1)?.id).toBe("done");
      expect(steps.at(-1)?.target).toBeUndefined();
    }
  });

  it("give every step a unique id and some copy", () => {
    for (const steps of [ESCOTEIRO_TOUR, escotistaTour(true)]) {
      expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
      for (const s of steps) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.body.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps each role on its own home", () => {
    expect(ESCOTEIRO_TOUR.every((s) => s.route === "/")).toBe(true);
    expect(escotistaTour(false).every((s) => s.route === "/escotista")).toBe(true);
  });

  it("mentions the Admin area only to admins", () => {
    const mais = (isAdmin: boolean) =>
      escotistaTour(isAdmin).find((s) => s.id === "mais")?.body ?? "";
    expect(mais(true)).toContain("Admin");
    expect(mais(false)).not.toContain("Admin");
  });

  it("picks the script by role", () => {
    expect(tourStepsFor("escoteiro", true)).toBe(ESCOTEIRO_TOUR);
    expect(tourStepsFor("escotista", false)[0]?.title).toContain("escotista");
  });
});

describe("shouldAutoStartTour", () => {
  const escoteiro = {
    role: "escoteiro" as const,
    onboardingComplete: true,
    membershipStatus: "approved" as const,
  };

  it("starts for an onboarded member who has not seen it", () => {
    expect(shouldAutoStartTour(escoteiro, "/")).toBe(true);
    expect(shouldAutoStartTour({ ...escoteiro, role: "escotista" }, "/escotista")).toBe(true);
  });

  it("never starts again once seen", () => {
    expect(shouldAutoStartTour({ ...escoteiro, tourSeenAt: 1 }, "/")).toBe(false);
  });

  it("waits for sign-in and onboarding", () => {
    expect(shouldAutoStartTour(null, "/")).toBe(false);
    expect(shouldAutoStartTour({ ...escoteiro, onboardingComplete: false }, "/")).toBe(false);
    expect(shouldAutoStartTour({ ...escoteiro, role: undefined }, "/")).toBe(false);
  });

  it("waits while an escotista's membership is pending, not an escoteiro's", () => {
    expect(
      shouldAutoStartTour(
        { ...escoteiro, role: "escotista", membershipStatus: "pending" },
        "/escotista",
      ),
    ).toBe(false);
    expect(shouldAutoStartTour({ ...escoteiro, membershipStatus: "pending" }, "/")).toBe(true);
  });

  it("stays off the sign-in, onboarding and password-change screens", () => {
    for (const path of ["/signin", "/onboarding", "/trocar-senha"]) {
      expect(shouldAutoStartTour(escoteiro, path)).toBe(false);
    }
    expect(shouldAutoStartTour(escoteiro, "/settings")).toBe(true);
  });
});

describe("isTourOpen", () => {
  const base = { userId: "a", replayingFor: null, dismissedFor: null, autoStart: true };

  it("opens on a first visit and stays shut once closed", () => {
    expect(isTourOpen(base)).toBe(true);
    expect(isTourOpen({ ...base, dismissedFor: "a" })).toBe(false);
  });

  it("does not let a previous account's close hide it from the next", () => {
    expect(isTourOpen({ ...base, userId: "b", dismissedFor: "a" })).toBe(true);
  });

  it("replays only for the member who asked", () => {
    const replaying = { ...base, autoStart: false, replayingFor: "a" };
    expect(isTourOpen(replaying)).toBe(true);
    expect(isTourOpen({ ...replaying, userId: "b" })).toBe(false);
  });

  it("stays shut while signed out", () => {
    expect(isTourOpen({ ...base, userId: null, replayingFor: "a" })).toBe(false);
  });
});

describe("placeCard", () => {
  const vh = 800;

  it("centres an untargeted card", () => {
    expect(placeCard(null, 200, vh)).toBe(300);
  });

  it("goes below a target near the top", () => {
    expect(placeCard({ top: 100, left: 0, width: 300, height: 80 }, 200, vh)).toBe(192);
  });

  it("goes above a target near the bottom (the tab bar)", () => {
    expect(placeCard({ top: 740, left: 0, width: 90, height: 52 }, 200, vh)).toBe(528);
  });

  it("pins to the bottom when the target leaves room on neither side", () => {
    expect(placeCard({ top: 50, left: 0, width: 300, height: 700 }, 200, vh)).toBe(588);
  });
});
