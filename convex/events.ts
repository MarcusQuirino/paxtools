import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// A terminal, empty page for viewers who may see nothing. Shaped like a real
// PaginationResult so the client's usePaginatedQuery treats it as "done".
const EMPTY_PAGE = { page: [], isDone: true, continueCursor: "" };

/**
 * Paginated audit timeline for escotistas. Newest-first.
 *
 * Visibility:
 *   - Admin escotistas see every event in their group (ramo-scoped + group).
 *   - Non-admin escotistas see only ramo-scoped events whose subjectRamo is one
 *     of their `escotistaRamos`; group-level membership/admin events are hidden.
 *
 * Uses the [groupId, _creationTime] index and filters per page. For multi-ramo
 * non-admins this can yield mildly under-filled pages (the per-ramo compound
 * index exists for a future strict merged-stream upgrade) — acceptable for an
 * audit log and never scans the whole table.
 */
export const listTimeline = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return EMPTY_PAGE;
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "escotista") return EMPTY_PAGE;
    if (!user.groupId) return EMPTY_PAGE;
    if (user.bannedAt) return EMPTY_PAGE;
    if (user.membershipStatus && user.membershipStatus !== "approved")
      return EMPTY_PAGE;

    const groupId = user.groupId;
    // Legacy group creators may predate the isAdmin flag; queries don't run the
    // backfill, so mirror the createdBy fallback used by the other admin reads.
    let isAdmin = user.isAdmin === true;
    if (!isAdmin) {
      const group = await ctx.db.get(groupId);
      if (group && group.createdBy === user._id) isAdmin = true;
    }
    const ramos = user.escotistaRamos ?? [];
    if (!isAdmin && ramos.length === 0) return EMPTY_PAGE;

    const base = ctx.db
      .query("events")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .order("desc");

    const filtered = isAdmin
      ? base
      : base.filter((q) =>
          q.and(
            q.eq(q.field("scope"), "ramo"),
            q.or(...ramos.map((r) => q.eq(q.field("subjectRamo"), r))),
          ),
        );

    const result = await filtered.paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((e) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        type: e.type,
        scope: e.scope,
        actorName: e.actorName ?? null,
        subjectName: e.subjectName ?? null,
        subjectRamo: e.subjectRamo ?? null,
        summary: e.summary ?? null,
        stageName: e.stageName ?? null,
      })),
    };
  },
});
