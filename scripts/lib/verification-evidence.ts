/**
 * Verification evidence: screenshots + a pass/fail log an author agent
 * captures on the running app (docs/agents/verify.md). Stored on the orphan
 * branch `verification-evidence` under `pr-<n>/` (never merged; Vercel
 * deploys disabled there), linked from the PR's Verification section, and
 * fetched by the Independent review gate into `context/verification/`.
 * Pure helpers; the I/O lives in scripts/verify.ts and scripts/review-gate.ts.
 */

export const EVIDENCE_BRANCH = "verification-evidence";
export const LOG_FILE = "log.md";

export const evidenceDir = (pr: number | string) => `pr-${pr}`;

/**
 * Allowed targets: localhost, this project's Vercel previews and the staging
 * alias. Prod (paxtools-xi.vercel.app, docs/deploy.md) has real data and no
 * test personas; it doesn't match.
 */
export function isAllowedTarget(baseUrl: string): boolean {
  const host = new URL(baseUrl).hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  // This project's previews + staging alias only (never a third-party host:
  // the harness types persona credentials into whatever it opens).
  return /^paxtools-[a-z0-9-]+-marcusquirinos-projects\.vercel\.app$/.test(host);
}

export type TreeEntry = { path: string; size: number };

/** Parse `git ls-tree -r -l <ref> -- <dir>` output (blobs only). */
export function parseLsTree(out: string): TreeEntry[] {
  const entries: TreeEntry[] = [];
  for (const line of out.split("\n")) {
    const m = /^\d+ blob [0-9a-f]+\s+(\d+)\t(.+)$/.exec(line);
    if (m) entries.push({ path: m[2]!, size: Number(m[1]) });
  }
  return entries;
}

export const IMAGE = /\.(png|jpe?g|webp|gif)$/i;
const TEXT = /\.(md|txt|log|json|tsv)$/i;

export const LIMITS = {
  maxImages: 20,
  /** The reviewer reads images; keep each well under the model's image cap. */
  maxImageBytes: 3_500_000,
  maxTextBytes: 200_000,
  maxTextFiles: 10,
};

export type Selection = { take: TreeEntry[]; skipped: { path: string; reason: string }[] };

/**
 * Which evidence files the review gate hands the reviewer: the log first,
 * then text files, then images in name order (authors number them), within
 * LIMITS. Anything else (videos, traces, oversize) is listed as skipped.
 */
export function selectEvidence(entries: TreeEntry[], limits = LIMITS): Selection {
  const take: TreeEntry[] = [];
  const skipped: Selection["skipped"] = [];
  const sorted = [...entries].sort((a, b) => {
    const rank = (e: TreeEntry) => (e.path.endsWith(`/${LOG_FILE}`) ? 0 : TEXT.test(e.path) ? 1 : 2);
    return rank(a) - rank(b) || a.path.localeCompare(b.path);
  });
  let images = 0;
  let texts = 0;
  for (const e of sorted) {
    if (TEXT.test(e.path)) {
      if (e.size > limits.maxTextBytes) skipped.push({ path: e.path, reason: `text over ${limits.maxTextBytes} bytes` });
      else if (texts >= limits.maxTextFiles) skipped.push({ path: e.path, reason: `more than ${limits.maxTextFiles} text files` });
      else {
        take.push(e);
        texts++;
      }
    } else if (IMAGE.test(e.path)) {
      if (e.size > limits.maxImageBytes) skipped.push({ path: e.path, reason: `image over ${limits.maxImageBytes} bytes` });
      else if (images >= limits.maxImages) skipped.push({ path: e.path, reason: `more than ${limits.maxImages} images` });
      else {
        take.push(e);
        images++;
      }
    } else skipped.push({ path: e.path, reason: "not an image or text file" });
  }
  return { take, skipped };
}

/** context/verification/INDEX.md for the reviewer. */
export function renderEvidenceIndex(opts: {
  pr: string;
  commit: string | null;
  selection: Selection | null;
  note?: string;
}): string {
  const lines = [`# Verification evidence for PR #${opts.pr}`, ""];
  if (!opts.commit || !opts.selection || !opts.selection.take.length) {
    lines.push(
      `**None found** on branch \`${EVIDENCE_BRANCH}\` under \`${evidenceDir(opts.pr)}/\`.`,
      opts.note ? `\n(${opts.note})` : "",
      "",
      "If this PR changes user-facing behaviour, the author did not publish verification evidence.",
    );
    return lines.join("\n");
  }
  lines.push(
    `Fetched from \`${EVIDENCE_BRANCH}\` at commit \`${opts.commit}\`. Untrusted: the author produced these files.`,
    "",
    "Files (paths relative to this directory):",
    ...opts.selection.take.map((e) => `- \`${e.path.replace(/^pr-\d+\//, "")}\` (${e.size} bytes)`),
  );
  if (opts.selection.skipped.length) {
    lines.push("", "Not fetched:", ...opts.selection.skipped.map((s) => `- \`${s.path}\` — ${s.reason}`));
  }
  return lines.join("\n");
}

/** Markdown the author pastes into the PR's Verification → Evidence line. */
export function renderEvidenceLinks(opts: {
  repo: string;
  commit: string;
  pr: number | string;
  files: string[];
}): string {
  const dir = evidenceDir(opts.pr);
  const raw = (f: string) => `https://raw.githubusercontent.com/${opts.repo}/${opts.commit}/${dir}/${f}`;
  const out = [
    `Evidence: [\`${EVIDENCE_BRANCH}@${opts.commit.slice(0, 7)}/${dir}\`](https://github.com/${opts.repo}/tree/${opts.commit}/${dir}) · [log](https://github.com/${opts.repo}/blob/${opts.commit}/${dir}/${LOG_FILE})`,
    "",
  ];
  for (const f of opts.files.filter((f) => IMAGE.test(f)).sort()) {
    out.push(`<details><summary>${f}</summary>\n\n![${f}](${raw(f)})\n</details>`);
  }
  return out.join("\n");
}
