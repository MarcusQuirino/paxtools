/**
 * Shared data-testid constants.
 *
 * These three are the contract between the registro sign-in form
 * (`SignInWithScoutId` in `src/components/auth/sign-in.tsx`, the same form real
 * contas gerenciadas use) and the suite's sign-in helper
 * (`tests/utils/signin.ts`). DO NOT RENAME without coordinating both sides.
 */

export const SCOUT_SIGNIN_ID = "scout-signin-id";
export const SCOUT_SIGNIN_PASSWORD = "scout-signin-password";
export const SCOUT_SIGNIN_SUBMIT = "scout-signin-submit";
