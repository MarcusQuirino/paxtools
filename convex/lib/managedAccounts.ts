/**
 * Conta gerenciada (see CONTEXT.md): a member who signs in with their
 * registro escoteiro + a password instead of Google. Pure rules shared by the
 * backend and the UI — no database access.
 */

/** The Convex Auth provider id managed accounts sign in through. */
export const MANAGED_PROVIDER = "managed";

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 64;

/**
 * Normalize a registro escoteiro: a six-digit number. Pasted forms with dots,
 * dashes or spaces are accepted. Returns null for anything else.
 */
export function normalizeScoutId(raw: string): string | null {
  const digits = raw.replace(/[\s.\-/]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

const OBVIOUS_PASSWORDS = new Set([
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "654321",
  "senha1",
  "senha123",
  "escoteiro",
  "escotista",
  "sempre",
  "semprealerta",
  "password",
  "qwerty",
  "abcdef",
  "abc123",
]);

/**
 * Why a password chosen by a member is unacceptable, or null when it is fine.
 * The registro is public-ish and sequential, so the password is the only real
 * protection: reject the trivially guessable ones.
 */
export function explainWeakPassword(
  password: string,
  scoutId: string,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) return "Senha muito longa";
  const lower = password.toLowerCase();
  if (lower.includes(scoutId)) {
    return "A senha não pode conter o seu registro";
  }
  if (/^(.)\1+$/.test(password)) {
    return "A senha não pode ser um caractere repetido";
  }
  if (OBVIOUS_PASSWORDS.has(lower) || isSequential(lower)) {
    return "Senha muito fácil de adivinhar";
  }
  return null;
}

/** Runs like "234567" or "fedcba": each char one step from the last. */
function isSequential(s: string): boolean {
  if (s.length < 2) return false;
  const step = s.charCodeAt(1) - s.charCodeAt(0);
  if (step !== 1 && step !== -1) return false;
  for (let i = 2; i < s.length; i++) {
    if (s.charCodeAt(i) - s.charCodeAt(i - 1) !== step) return false;
  }
  return true;
}

// Short, unambiguous words a child can read back and type on a phone.
const WORDS_A = [
  "lobo", "urso", "puma", "gato", "pato", "sapo", "galo", "boto",
  "foca", "lince", "tatu", "anta", "arara", "coruja", "tucano", "jacare",
  "raposa", "cervo", "falcao", "gaviao", "baleia", "golfinho", "tigre", "leao",
  "zebra", "camelo", "macaco", "esquilo", "castor", "panda", "coala", "polvo",
];
const WORDS_B = [
  "azul", "verde", "roxo", "rosa", "dourado", "prata", "bravo", "calmo",
  "veloz", "forte", "alegre", "sabio", "gentil", "leal", "firme", "livre",
  "ligeiro", "valente", "esperto", "atento", "feliz", "sereno", "audaz", "nobre",
  "astuto", "manso", "ativo", "vivo", "claro", "rubro", "branco", "preto",
];

/**
 * A readable temporary password ("lobo-azul-4821"). Only ever lives until
 * the member's forced change on first sign-in, which the rate limit covers.
 */
export function generateTemporaryPassword(): string {
  const buf = new Uint32Array(3);
  crypto.getRandomValues(buf);
  const a = WORDS_A[buf[0]! % WORDS_A.length];
  const b = WORDS_B[buf[1]! % WORDS_B.length];
  const n = String(buf[2]! % 10000).padStart(4, "0");
  return `${a}-${b}-${n}`;
}
