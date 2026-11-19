import type { Locator } from "@playwright/test";

/**
 * `click({ force: true })` on an element scrolled to the viewport CENTER.
 *
 * Specs force-click Radix triggers/checkboxes because Convex live re-renders
 * keep them "unstable" under parallel load. But force skips Playwright's
 * hit-target check, and the default scroll leaves the element at the viewport
 * edge — under the fixed bottom nav — so the click lands on the nav and the
 * element never toggles. Centering first keeps nothing on top of it.
 */
export async function forceClickCentered(target: Locator): Promise<void> {
  await target.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await target.click({ force: true });
}
