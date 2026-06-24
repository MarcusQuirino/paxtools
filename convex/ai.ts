"use node";

import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ramoValidator } from "./schema";
import {
  buildSuggestionPrompt,
  suggestionSchema,
  assertNoPII,
  type SuggestionResult,
} from "./lib/aiPrompt";

/**
 * On-demand AI helper: load the ramo's coverage server-side (via the V8-runtime
 * internal query — a "use node" file has no ctx.db of its own), build a prompt
 * from activity TEXTS + counts only (never scout names/PII), ask Claude for one
 * idea per eixo + an overview, then cache the result. The button on the stats
 * page calls this; the page renders the cached row reactively.
 */
export const suggestActivities = action({
  args: { ramo: v.optional(ramoValidator) },
  handler: async (ctx, args): Promise<SuggestionResult> => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ConvexError(
        "ANTHROPIC_API_KEY não configurado — configure-o no deployment Convex para usar as sugestões da IA.",
      );
    }

    // Authz + rate-limit + coverage happen in the V8 query (force regen).
    const { groupId, ramo, coverage } = await ctx.runQuery(
      internal.aiHelpers.prepareSuggestion,
      { ramo: args.ramo, force: true },
    );

    const { system, prompt } = buildSuggestionPrompt(coverage);
    // Defence-in-depth: the coverage type carries no names, but assert anyway.
    assertNoPII(`${system}\n${prompt}`, []);

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: suggestionSchema,
      system,
      prompt,
    });

    await ctx.runMutation(internal.aiHelpers.saveSuggestion, {
      groupId,
      ramo,
      perEixoIdeas: object.perEixoIdeas,
      overview: object.overview,
    });

    return object;
  },
});
