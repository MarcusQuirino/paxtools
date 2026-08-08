import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getAuthenticatedUser,
  assertAdmin,
  maybeBackfillUser,
} from "./lib/authHelpers";
import { logGroupEvent } from "./lib/events";
import {
  filterVisibleEscoteiros,
  resolveRamoViewer,
  tryResolveRamoViewer,
} from "./lib/ramoVisibility";
import {
  createSectionsFromRamoNames,
  listSectionsOfGroup,
  sanitizeSectionName,
} from "./lib/sections";
import { ramoValidator } from "./schema";

/**
 * Guard the last-admin invariant when a user is about to abandon their current
 * group (by leaving, joining another, or creating another). A sole admin must
 * promote another escotista first, otherwise the original group is orphaned
 * with no one able to approve members, manage roles, or delete it.
 */
async function assertNotSoleAdminOfCurrentGroup(
  ctx: MutationCtx,
  user: Doc<"users">,
) {
  if (!user.groupId || !user.isAdmin) return;
  const otherAdmin = await ctx.db
    .query("users")
    .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId))
    .filter((q) =>
      q.and(q.neq(q.field("_id"), user._id), q.eq(q.field("isAdmin"), true)),
    )
    .first();
  if (!otherAdmin) {
    throw new Error(
      "Você é o único administrador do seu grupo atual. Promova outro escotista antes de sair dele.",
    );
  }
}

/**
 * For an admin action targeting another member: assert the caller is an admin,
 * load the target user, and verify the target belongs to the caller's group.
 * Throws "Usuário não pertence ao seu grupo" if the target is missing or in a
 * different group. Returns both the admin (caller) and the loaded target.
 */
async function loadGroupMember(ctx: MutationCtx, targetUserId: Id<"users">) {
  const admin = await assertAdmin(ctx);
  const target = await ctx.db.get(targetUserId);
  if (!target || target.groupId !== admin.groupId) {
    throw new Error("Usuário não pertence ao seu grupo");
  }
  return { admin, target };
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function normalizeNumber(raw: string): string {
  return raw.trim().replace(/^0+(?=\d)/, "");
}

// Regiões escoteiras are named after the UF they cover, plus the DF.
const REGIOES = new Set([
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS",
  "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC",
  "SE", "SP", "TO",
]);

/**
 * Normalize a região to its uppercase UF. Returns undefined for a blank value
 * — a grupo may legitimately have no região, and is then identified by its
 * numeral alone. Throws in Portuguese for anything that is not a UF.
 */
function normalizeRegiao(raw: string): string | undefined {
  const regiao = raw.trim().toUpperCase();
  if (!regiao) return undefined;
  if (!REGIOES.has(regiao)) {
    throw new Error("Região escoteira inválida");
  }
  return regiao;
}

const ramoNamesValidator = v.object({
  lobinho: v.optional(v.string()),
  escoteiro: v.optional(v.string()),
  senior: v.optional(v.string()),
  pioneiro: v.optional(v.string()),
});

function sanitizeRamoNames(
  raw:
    | {
        lobinho?: string;
        escoteiro?: string;
        senior?: string;
        pioneiro?: string;
      }
    | undefined,
): {
  lobinho?: string;
  escoteiro?: string;
  senior?: string;
  pioneiro?: string;
} {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const key of ["lobinho", "escoteiro", "senior", "pioneiro"] as const) {
    const trimmed = raw[key]?.trim();
    if (!trimmed) continue;
    if (trimmed.length > 60) throw new Error("Nome do ramo muito longo");
    out[key] = trimmed;
  }
  return out;
}

export const createGroup = mutation({
  args: {
    name: v.string(),
    number: v.string(),
    regiao: v.optional(v.string()),
    ramoNames: v.optional(ramoNamesValidator),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "escotista") {
      throw new Error("Apenas escotistas podem criar grupos");
    }
    if (!user.escotistaRamos || user.escotistaRamos.length === 0) {
      throw new Error("Escolha pelo menos um ramo antes de criar um grupo");
    }
    // Creating a new group reassigns groupId; don't strand the current one.
    await assertNotSoleAdminOfCurrentGroup(ctx, user);

    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw new Error("Nome do grupo inválido");
    }

    const number = normalizeNumber(args.number);
    if (!number || !/^\d{1,6}$/.test(number)) {
      throw new Error("Número do grupo inválido");
    }

    const regiao = normalizeRegiao(args.regiao ?? "");

    const ramoNames = sanitizeRamoNames(args.ramoNames);

    const existingByNumber = await ctx.db
      .query("groups")
      .withIndex("by_number", (q) => q.eq("number", number))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
    if (existingByNumber) {
      throw new Error("Já existe um grupo com este número");
    }

    let password = generatePassword();
    let existing = await ctx.db
      .query("groups")
      .withIndex("by_password", (q) => q.eq("password", password))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
    while (existing) {
      password = generatePassword();
      existing = await ctx.db
        .query("groups")
        .withIndex("by_password", (q) => q.eq("password", password))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .unique();
    }

    const groupId = await ctx.db.insert("groups", {
      name,
      number,
      regiao,
      password,
      createdBy: user._id,
      createdAt: Date.now(),
      ramoNames,
    });

    // The creation forms still collect one unit name per ramo; turn them into
    // seções right away so a brand-new grupo starts out like a migrated one.
    await createSectionsFromRamoNames(ctx, groupId, ramoNames);

    await ctx.db.patch(user._id, {
      groupId,
      isAdmin: true,
      membershipStatus: "approved",
      // Moving grupo: a seção of the old one must not follow them here.
      sectionId: undefined,
      observedSectionId: undefined,
    });

    return { groupId, password };
  },
});

export const joinGroup = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const password = args.password.trim().toUpperCase();
    if (!password) throw new Error("Senha do grupo é obrigatória");

    const group = await ctx.db
      .query("groups")
      .withIndex("by_password", (q) => q.eq("password", password))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    if (!group) throw new Error("Grupo não encontrado");

    if (user.role === "escoteiro" && !user.ramo) {
      throw new Error("Escolha seu ramo antes de entrar em um grupo");
    }
    if (
      user.role === "escotista" &&
      (!user.escotistaRamos || user.escotistaRamos.length === 0)
    ) {
      throw new Error("Escolha pelo menos um ramo antes de entrar em um grupo");
    }
    // Joining another group reassigns groupId; don't strand the current one.
    await assertNotSoleAdminOfCurrentGroup(ctx, user);

    await ctx.db.patch(user._id, {
      groupId: group._id,
      membershipStatus: "pending",
      isAdmin: false,
      // Moving grupo: a seção of the old one must not follow them here.
      sectionId: undefined,
      observedSectionId: undefined,
    });
    return { groupId: group._id, groupName: group.name };
  },
});

export const leaveGroup = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.groupId) throw new Error("Você não está em nenhum grupo");

    if (user.isAdmin) {
      const otherAdmins = await ctx.db
        .query("users")
        .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId))
        .filter((q) =>
          q.and(
            q.neq(q.field("_id"), user._id),
            q.eq(q.field("isAdmin"), true),
          ),
        )
        .first();
      if (!otherAdmins) {
        throw new Error(
          "Você é o único administrador. Promova outro escotista antes de sair.",
        );
      }
    }

    await ctx.db.patch(user._id, {
      groupId: undefined,
      isAdmin: false,
      membershipStatus: undefined,
      sectionId: undefined,
      observedSectionId: undefined,
    });
  },
});

export const getMyGroup = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user || !user.groupId) return null;
    const group = await ctx.db.get(user.groupId);
    if (!group || group.deletedAt) return null;
    const isCreator = group.createdBy === user._id;
    // Fallback: a legacy group creator is admin even if the field
    // has not been backfilled yet.
    const computedAdmin = user.isAdmin === true || isCreator;
    return {
      _id: group._id,
      name: group.name,
      number: group.number ?? null,
      regiao: group.regiao ?? null,
      password:
        user.role === "escotista" && user.membershipStatus !== "pending"
          ? group.password
          : null,
      ramoNames: group.ramoNames ?? {},
      isCreator,
      isAdmin: computedAdmin,
      membershipStatus: user.membershipStatus ?? "approved",
    };
  },
});

export const getGroupMembers = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await tryResolveRamoViewer(ctx);
    if (!viewer) return [];

    const members = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", viewer.groupId))
      .take(500);

    return filterVisibleEscoteiros(viewer, members).map((m) => ({
      _id: m._id,
      name: m.name,
      image: m.image,
      email: m.email,
      role: m.role,
      ramo: m.ramo,
      escotistaRamos: m.escotistaRamos,
      isAdmin: m.isAdmin === true,
      sectionId: m.sectionId ?? null,
    }));
  },
});

export const getPendingMemberships = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user || !user.groupId) return [];
    if (!user.isAdmin) {
      const group = await ctx.db.get(user.groupId);
      if (!group || group.createdBy !== user._id) return [];
    }

    const pending = await ctx.db
      .query("users")
      .withIndex("by_groupId_and_status", (q) =>
        q.eq("groupId", user.groupId).eq("membershipStatus", "pending"),
      )
      .take(200);

    return pending.map((m) => ({
      _id: m._id,
      name: m.name,
      image: m.image,
      email: m.email,
      role: m.role,
      ramo: m.ramo,
      escotistaRamos: m.escotistaRamos,
    }));
  },
});

export const approveMembership = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target.membershipStatus !== "pending") {
      throw new Error("Usuário não está pendente");
    }
    await ctx.db.patch(target._id, { membershipStatus: "approved" });
    await logGroupEvent(ctx, {
      type: "memberJoin",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary: "Entrou no grupo",
    });
  },
});

export const rejectMembership = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { target } = await loadGroupMember(ctx, args.userId);
    if (target.membershipStatus !== "pending") {
      throw new Error("Usuário não está pendente");
    }
    await ctx.db.patch(target._id, {
      groupId: undefined,
      membershipStatus: undefined,
      isAdmin: false,
      sectionId: undefined,
      observedSectionId: undefined,
    });
  },
});

export const banMember = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target._id === admin._id) {
      throw new Error("Você não pode banir a si mesmo");
    }
    if (target.isAdmin) {
      const otherAdmins = await ctx.db
        .query("users")
        .withIndex("by_groupId", (q) => q.eq("groupId", admin.groupId))
        .filter((q) =>
          q.and(
            q.neq(q.field("_id"), target._id),
            q.eq(q.field("isAdmin"), true),
          ),
        )
        .first();
      if (!otherAdmins) {
        throw new Error(
          "Não é possível banir o único administrador. Promova outro antes.",
        );
      }
    }
    await ctx.db.patch(target._id, {
      groupId: undefined,
      isAdmin: false,
      membershipStatus: undefined,
      sectionId: undefined,
      observedSectionId: undefined,
      bannedAt: Date.now(),
      bannedBy: admin._id,
    });
    await logGroupEvent(ctx, {
      type: "memberBan",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary: "Foi removido do grupo",
    });
  },
});

export const changeMemberRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("escoteiro"), v.literal("escotista")),
  },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target._id === admin._id) {
      throw new Error("Use a tela de configurações para mudar seu próprio papel");
    }
    if (target.role === args.role) return;

    const patch: Record<string, unknown> = { role: args.role };
    if (args.role === "escoteiro") {
      patch.isAdmin = false;
      patch.escotistaRamos = undefined;
      // Only escotistas observe a seção.
      patch.observedSectionId = undefined;
    } else {
      patch.ramo = undefined;
      // Seções hold escoteiros; an escotista has no place in one.
      patch.sectionId = undefined;
    }
    await ctx.db.patch(target._id, patch);
    await logGroupEvent(ctx, {
      type: "accessChange",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary:
        args.role === "escotista" ? "Tornou-se escotista" : "Tornou-se escoteiro",
    });
  },
});

export const setMemberAdmin = mutation({
  args: { userId: v.id("users"), isAdmin: v.boolean() },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target.role !== "escotista") {
      throw new Error("Apenas escotistas podem ser administradores");
    }
    if (!args.isAdmin && target._id === admin._id) {
      const otherAdmins = await ctx.db
        .query("users")
        .withIndex("by_groupId", (q) => q.eq("groupId", admin.groupId))
        .filter((q) =>
          q.and(
            q.neq(q.field("_id"), admin._id),
            q.eq(q.field("isAdmin"), true),
          ),
        )
        .first();
      if (!otherAdmins) {
        throw new Error(
          "Você é o único administrador. Promova outro antes de se remover.",
        );
      }
    }
    await ctx.db.patch(target._id, { isAdmin: args.isAdmin });
    await logGroupEvent(ctx, {
      type: "accessChange",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary: args.isAdmin
        ? "Promovido a administrador"
        : "Removido de administrador",
    });
  },
});

export const setMemberRamos = mutation({
  args: { userId: v.id("users"), ramos: v.array(ramoValidator) },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target.role !== "escotista") {
      throw new Error("Apenas escotistas têm múltiplos ramos");
    }
    const dedup = Array.from(new Set(args.ramos));
    if (dedup.length === 0) throw new Error("Selecione pelo menos um ramo");
    // Skip no-op saves so the audit timeline isn't littered with phantom changes.
    const sortedNew = [...dedup].sort();
    const sortedCur = [...(target.escotistaRamos ?? [])].sort();
    if (
      sortedCur.length === sortedNew.length &&
      sortedCur.every((r, i) => r === sortedNew[i])
    ) {
      return;
    }
    await ctx.db.patch(target._id, { escotistaRamos: dedup });
    await logGroupEvent(ctx, {
      type: "ramoChange",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary: `Ramos atualizados: ${dedup.join(", ")}`,
    });
  },
});

export const setMemberRamo = mutation({
  args: { userId: v.id("users"), ramo: ramoValidator },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target.role !== "escoteiro") {
      throw new Error("Apenas escoteiros têm um ramo único");
    }
    if (target.ramo === args.ramo) return; // no-op: don't log a phantom change
    // A seção belongs to exactly one ramo and `setMemberSection` refuses a
    // mismatch, so the seção an escoteiro is in is always of the ramo they are
    // leaving: advancing (lobinho → escoteiro) leaves it behind rather than
    // dragging the escoteiro into a unit of a ramo they no longer belong to.
    await ctx.db.patch(target._id, { ramo: args.ramo, sectionId: undefined });
    await logGroupEvent(ctx, {
      type: "ramoChange",
      actor: admin,
      subject: target,
      groupId: admin.groupId!,
      summary: `Ramo alterado para ${args.ramo}`,
    });
  },
});

export const updateGroup = mutation({
  args: {
    name: v.optional(v.string()),
    regiao: v.optional(v.string()),
    ramoNames: v.optional(ramoNamesValidator),
  },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    if (!admin.groupId) throw new Error("Você não está em nenhum grupo");
    const group = await ctx.db.get(admin.groupId);
    if (!group || group.deletedAt) throw new Error("Grupo não encontrado");

    const patch: Record<string, unknown> = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name || name.length > 100) {
        throw new Error("Nome do grupo inválido");
      }
      patch.name = name;
    }

    if (args.regiao !== undefined) {
      patch.regiao = normalizeRegiao(args.regiao);
    }

    if (args.ramoNames !== undefined) {
      patch.ramoNames = sanitizeRamoNames(args.ramoNames);
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(group._id, patch);
  },
});

/**
 * Load a seção the calling admin is allowed to manage: admin of a grupo, and
 * the seção belongs to that same grupo.
 */
async function loadOwnSection(ctx: MutationCtx, sectionId: Id<"sections">) {
  const admin = await assertAdmin(ctx);
  const section = await ctx.db.get(sectionId);
  if (!section || section.groupId !== admin.groupId) {
    throw new Error("Seção não pertence ao seu grupo");
  }
  return { admin, section };
}

/** The seções of the caller's grupo, oldest first. Empty when they have none. */
export const listSections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    const groupId = user?.groupId;
    if (!groupId) return [];
    const sections = await listSectionsOfGroup(ctx, groupId);
    return sections.map((s) => ({ _id: s._id, name: s.name, ramo: s.ramo }));
  },
});

export const addSection = mutation({
  args: { name: v.string(), ramo: ramoValidator },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    const name = sanitizeSectionName(args.name);
    // Two seções may share a ramo (a grupo can run two alcateias), so there is
    // nothing to deduplicate here.
    return await ctx.db.insert("sections", {
      groupId: admin.groupId!,
      name,
      ramo: args.ramo,
    });
  },
});

export const renameSection = mutation({
  args: { sectionId: v.id("sections"), name: v.string() },
  handler: async (ctx, args) => {
    const { section } = await loadOwnSection(ctx, args.sectionId);
    const name = sanitizeSectionName(args.name);
    if (name === section.name) return;
    await ctx.db.patch(section._id, { name });
  },
});

export const removeSection = mutation({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    const { section } = await loadOwnSection(ctx, args.sectionId);
    // Refuse rather than silently unassign: an escoteiro losing their seção is
    // the admin's call to make explicitly. Only current members count — a row
    // written before leaving/being banned cleared `sectionId` may still point
    // here, and must not block the admin.
    const assigned = await ctx.db
      .query("users")
      .withIndex("by_sectionId", (q) => q.eq("sectionId", section._id))
      .filter((q) => q.eq(q.field("groupId"), section.groupId))
      .first();
    if (assigned) {
      throw new Error(
        "Esta seção ainda tem escoteiros. Mova-os para outra seção antes de removê-la.",
      );
    }
    // Nobody is in it, so anything still pointing here is such a leftover:
    // clear it, or deleting the row would leave a dangling reference that
    // resurfaces if that person ever rejoins the grupo.
    const stale = await ctx.db
      .query("users")
      .withIndex("by_sectionId", (q) => q.eq("sectionId", section._id))
      .take(500);
    for (const user of stale) {
      await ctx.db.patch(user._id, { sectionId: undefined });
    }
    await ctx.db.delete(section._id);
  },
});

/**
 * Place an escoteiro in one of the grupo's seções, or take them out of it
 * (`sectionId: null`). Managed from the same admin surface as ramo and papel.
 */
export const setMemberSection = mutation({
  args: {
    userId: v.id("users"),
    sectionId: v.union(v.id("sections"), v.null()),
  },
  handler: async (ctx, args) => {
    const { admin, target } = await loadGroupMember(ctx, args.userId);
    if (target.role !== "escoteiro") {
      throw new Error("Apenas escoteiros pertencem a uma seção");
    }
    if (args.sectionId === null) {
      await ctx.db.patch(target._id, { sectionId: undefined });
      return;
    }
    const section = await ctx.db.get(args.sectionId);
    if (!section || section.groupId !== admin.groupId) {
      throw new Error("Seção não pertence ao seu grupo");
    }
    // A ramo mismatch is PREVENTED, not reconciled: a seção belongs to exactly
    // one ramo, and progression stays keyed to the escoteiro's own ramo, so an
    // escoteiro sitting in another ramo's seção would be listed to escotistas
    // who do not accompany them. Change the ramo first, then the seção.
    if (!target.ramo) {
      throw new Error("Defina o ramo do escoteiro antes de escolher a seção");
    }
    if (section.ramo !== target.ramo) {
      throw new Error("Esta seção é de outro ramo");
    }
    await ctx.db.patch(target._id, { sectionId: section._id });
  },
});

/**
 * The seção the calling escotista is currently observing; `null` observes the
 * whole grupo. Stored on their own row, so the choice survives a reload.
 */
export const setObservedSection = mutation({
  args: { sectionId: v.union(v.id("sections"), v.null()) },
  handler: async (ctx, args) => {
    const viewer = await resolveRamoViewer(ctx);
    if (args.sectionId === null) {
      await ctx.db.patch(viewer.user._id, { observedSectionId: undefined });
      return;
    }
    const section = await ctx.db.get(args.sectionId);
    if (!section || section.groupId !== viewer.groupId) {
      throw new Error("Seção não pertence ao seu grupo");
    }
    // Observing narrows what an escotista sees; it is never a way around
    // visibilidade de ramo.
    if (!viewer.isAdmin && !viewer.ramos.includes(section.ramo)) {
      throw new Error("Você não acompanha esse ramo");
    }
    await ctx.db.patch(viewer.user._id, { observedSectionId: section._id });
  },
});

export const deleteGroup = mutation({
  args: { confirmName: v.string() },
  handler: async (ctx, args) => {
    const admin = await assertAdmin(ctx);
    if (!admin.groupId) throw new Error("Você não está em nenhum grupo");
    const group = await ctx.db.get(admin.groupId);
    if (!group || group.deletedAt) throw new Error("Grupo não encontrado");
    if (args.confirmName.trim() !== group.name) {
      throw new Error("Confirmação inválida");
    }
    await ctx.db.patch(group._id, { deletedAt: Date.now() });
  },
});

// Make sure backfill runs whenever the viewer is touched via this module
export const ensureBackfill = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    await maybeBackfillUser(ctx, user);
    return null;
  },
});
