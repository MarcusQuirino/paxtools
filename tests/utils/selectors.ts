/**
 * Shared data-testid constants.
 *
 * These three are the contract between the test-only signin form (mounted in
 * `src/routes/signin.tsx` when `import.meta.env.VITE_TEST_AUTH === "1"`) and
 * the Playwright `global.setup.ts`. DO NOT RENAME without coordinating both
 * sides.
 */

export const TEST_SIGNIN_EMAIL = "test-signin-email";
export const TEST_SIGNIN_PASSWORD = "test-signin-password";
export const TEST_SIGNIN_SUBMIT = "test-signin-submit";
