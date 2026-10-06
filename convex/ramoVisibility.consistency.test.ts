/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { as, newTest, type Ramo, type TestConvex } from "./fixtures.testkit";

// The cross-surface consistency suite (#31): one grupo fixture set is run
// through all seven visibilidade-de-ramo surfaces — pending approvals, group
// members, write/read assert, timeline, stats scoping, AI scoping, the
// escotista especialidades tab — and the
// visible/actionable escoteiro sets must agree surface-to-surface for every
// viewer archetype. A future inline re-statement of the predicate on any one
// surface breaks the agreement and fails here.

const ALL_RAMOS: Ramo[] = ["lobinho", "escoteiro", "senior", "pioneiro"];
const SEEDED_EVENT_RAMOS: Ramo[] = ["escoteiro", "senior", "pioneiro"];

type Fixtures = Awaited<ReturnType<typeof buildGrupo>>;

/**
 * One grupo with every viewer archetype and every escoteiro state from #31:
 * viewers — flagged admin, multi-ramo escotista, single-ramo escotista,
 * legacy-unstamped escotista, legacy grupo-creator (isAdmin never set);
 * escoteiros — approved (three ramos), unstamped-membership, pending-
 * membership, banned, ramo-less. Every escoteiro gets one pending conclusão
 * (so the pending list would show them if visible) and each ramo gets one
 * timeline event, plus one group-scoped event and the AI feature flag on.
 */
async function buildGrupo(t: TestConvex) {
  const insertUser = (
    name: string,
    fields: Partial<{
      role: "escoteiro" | "escotista";
      ramo: Ramo;
      escotistaRamos: Ramo[];
      groupId: Id<"groups">;
      isAdmin: boolean;
      membershipStatus: "pending" | "approved";
      bannedAt: number;
    }>,
  ) => t.run(async (ctx) => ctx.db.insert("users", { name, ...fields }));

  // The grupo creator is deliberately NEVER flagged isAdmin and accompanies no
  // ramos: without the legacy-creator fallback this viewer sees nothing.
  const legacyCreator = await insertUser("Legacy Creator", {
    role: "escotista",
    escotistaRamos: [],
    membershipStatus: "approved",
  });
  const groupId = await t.run(async (ctx) =>
    ctx.db.insert("groups", {
      name: "Grupo Consistência",
      number: "100",
      password: "AAAAAA",
      createdBy: legacyCreator,
      createdAt: 1,
      ramoNames: {},
    }),
  );
  await t.run(async (ctx) => ctx.db.patch(legacyCreator, { groupId }));

  const admin = await insertUser("Admin", {
    role: "escotista",
    groupId,
    isAdmin: true,
    escotistaRamos: ["escoteiro"],
    membershipStatus: "approved",
  });
  const multiRamo = await insertUser("Multi", {
    role: "escotista",
    groupId,
    escotistaRamos: ["escoteiro", "senior"],
    membershipStatus: "approved",
  });
  const singleRamo = await insertUser("Single", {
    role: "escotista",
    groupId,
    escotistaRamos: ["escoteiro"],
    membershipStatus: "approved",
  });
  // Legacy escotista whose membershipStatus was never stamped.
  const unstamped = await insertUser("Unstamped", {
    role: "escotista",
    groupId,
    escotistaRamos: ["escoteiro"],
  });

  const escEscoteiro = await insertUser("Esc Escoteiro", {
    role: "escoteiro",
    groupId,
    ramo: "escoteiro",
    membershipStatus: "approved",
  });
  const escSenior = await insertUser("Esc Senior", {
    role: "escoteiro",
    groupId,
    ramo: "senior",
    membershipStatus: "approved",
  });
  const escPioneiro = await insertUser("Esc Pioneiro", {
    role: "escoteiro",
    groupId,
    ramo: "pioneiro",
    membershipStatus: "approved",
  });
  // Membership never stamped — counts as approved on every surface.
  const escUnstamped = await insertUser("Esc Unstamped", {
    role: "escoteiro",
    groupId,
    ramo: "senior",
  });
  const escPending = await insertUser("Esc Pending", {
    role: "escoteiro",
    groupId,
    ramo: "escoteiro",
    membershipStatus: "pending",
  });
  const escBanned = await insertUser("Esc Banned", {
    role: "escoteiro",
    groupId,
    ramo: "escoteiro",
    membershipStatus: "approved",
    bannedAt: 123,
  });
  const escRamoLess = await insertUser("Esc RamoLess", {
    role: "escoteiro",
    groupId,
    membershipStatus: "approved",
  });

  const escoteiros = [
    escEscoteiro,
    escSenior,
    escPioneiro,
    escUnstamped,
    escPending,
    escBanned,
    escRamoLess,
  ];

  // One pending conclusão each, so every VISIBLE escoteiro shows up on the
  // pending-approvals list (hidden ones must not, even with pending rows).
  await t.run(async (ctx) => {
    for (const userId of escoteiros) {
      await ctx.db.insert("actionCompletions", {
        userId,
        actionId: "escoteiro:bloco1:fixed:0",
        completedAt: 1,
        status: "pending",
      });
    }
    for (const ramo of SEEDED_EVENT_RAMOS) {
      await ctx.db.insert("events", {
        type: "approval",
        scope: "ramo",
        groupId,
        subjectRamo: ramo,
        actorUserId: admin,
        subjectUserId: escEscoteiro,
        summary: `evento ${ramo}`,
      });
    }
    await ctx.db.insert("events", {
      type: "memberJoin",
      scope: "group",
      groupId,
      actorUserId: admin,
      subjectUserId: escEscoteiro,
      summary: "entrou no grupo",
    });
    await ctx.db.insert("featureFlags", { key: "ai_suggestions", enabled: true });

    // One approved especialidade row each (item for the younger ramoGroup,
    // etapa for the older), so the escotista Especialidades surfaces would
    // list every escoteiro they can see — and must not list the rest.
    const older = new Set([escSenior, escPioneiro, escUnstamped]);
    for (const userId of escoteiros) {
      if (older.has(userId)) {
        await ctx.db.insert("specialtyProjectReports", {
          userId,
          ramoGroup: "older",
          specialtyId: "comunicacoes",
          step: "conhecer",
          text: "relato",
          completedAt: 1,
          status: "approved",
        });
      } else {
        await ctx.db.insert("specialtyItemCompletions", {
          userId,
          ramoGroup: "younger",
          specialtyId: "administracao",
          itemIndex: 0,
          completedAt: 1,
          status: "approved",
        });
      }
    }
  });

  return {
    groupId,
    viewers: { admin, multiRamo, singleRamo, unstamped, legacyCreator },
    escoteiros: {
      escEscoteiro,
      escSenior,
      escPioneiro,
      escUnstamped,
      escPending,
      escBanned,
      escRamoLess,
    },
    allEscoteiros: escoteiros,
  };
}

// ---------------------------------------------------------------------------
// Surface probes: each returns the escoteiro-id set (or ramo scope) one
// surface exposes to a viewer. Asserting probe-to-probe equality is the point
// of the suite.
// ---------------------------------------------------------------------------

async function pendingListIds(
  t: TestConvex,
  viewer: Id<"users">,
) {
  const res = await as(t, viewer).query(api.approvals.getPendingForGroup, {});
  return new Set(res.map((r) => r.escoteiro._id as string));
}

async function memberListEscoteiroIds(
  t: TestConvex,
  viewer: Id<"users">,
) {
  const res = await as(t, viewer).query(api.groups.getGroupMembers, {});
  return new Set(
    res.filter((m) => m.role === "escoteiro").map((m) => m._id as string),
  );
}

/** The write/read assert surface: which escoteiros can the viewer act on? */
async function actionableIds(
  t: TestConvex,
  viewer: Id<"users">,
  escoteiros: Id<"users">[],
) {
  const out = new Set<string>();
  for (const target of escoteiros) {
    try {
      await as(t, viewer).query(api.progression.getCompletionsForUser, {
        targetUserId: target,
      });
      out.add(target as string);
    } catch {
      // not actionable for this viewer — that's the datum being collected
    }
  }
  return out;
}

async function timelineView(
  t: TestConvex,
  viewer: Id<"users">,
) {
  const res = await as(t, viewer).query(api.events.listTimeline, {
    paginationOpts: { numItems: 50, cursor: null },
  });
  return {
    ramos: new Set(
      res.page
        .filter((e) => e.scope === "ramo")
        .map((e) => e.subjectRamo as string),
    ),
    seesGroupEvents: res.page.some((e) => e.scope === "group"),
  };
}

/** Which ramos may the viewer request on stats, and whom does each show? */
async function statsScope(
  t: TestConvex,
  viewer: Id<"users">,
) {
  const allowed = new Set<string>();
  const scoutsByRamo = new Map<string, Set<string>>();
  for (const ramo of ALL_RAMOS) {
    try {
      const rows = await as(t, viewer).query(api.stats.getRamoScouts, { ramo });
      allowed.add(ramo);
      scoutsByRamo.set(ramo, new Set(rows.map((r) => r._id as string)));
    } catch {
      // ramo out of scope for this viewer
    }
  }
  return { allowed, scoutsByRamo };
}

/**
 * The escotista Especialidades tab: who the per-specialty roster lists and how
 * many escoteiros the catalog summary counts, across both ramoGroups.
 */
async function especialidadesView(
  t: TestConvex,
  viewer: Id<"users">,
) {
  const ids = new Set<string>();
  let counted = 0;
  for (const [ramoGroup, specialtyId] of [
    ["younger", "administracao"],
    ["older", "comunicacoes"],
  ] as const) {
    const roster = await as(t, viewer).query(api.specialties.getSpecialtyRoster, {
      specialtyId,
      ramoGroup,
    });
    for (const p of roster?.people ?? []) ids.add(p._id as string);
    const summary = await as(t, viewer).query(
      api.specialties.getGroupSpecialtySummary,
      { ramoGroup },
    );
    counted += summary?.escoteiroCount ?? 0;
  }
  return { ids, counted };
}

/** Which ramos may the viewer request on the AI surface? (flag is on) */
async function aiScope(t: TestConvex, viewer: Id<"users">) {
  const allowed = new Set<string>();
  for (const ramo of ALL_RAMOS) {
    try {
      await as(t, viewer).query(api.aiHelpers.getCachedSuggestion, { ramo });
      allowed.add(ramo);
    } catch {
      // ramo out of scope for this viewer
    }
  }
  return allowed;
}

// ---------------------------------------------------------------------------

type Archetype = {
  name: string;
  viewer: (f: Fixtures) => Id<"users">;
  /** Escoteiros this viewer must see/act on, on every user-list surface. */
  expectedVisible: (f: Fixtures) => Id<"users">[];
  /** Ramos this viewer may request on stats/AI. */
  expectedRamoScope: Ramo[];
  /** Group-scoped timeline events are admin-only. */
  isAdminScope: boolean;
};

const ARCHETYPES: Archetype[] = [
  {
    name: "flagged admin",
    viewer: (f) => f.viewers.admin,
    expectedVisible: (f) => [
      f.escoteiros.escEscoteiro,
      f.escoteiros.escSenior,
      f.escoteiros.escPioneiro,
      f.escoteiros.escUnstamped,
      f.escoteiros.escRamoLess,
    ],
    expectedRamoScope: ALL_RAMOS,
    isAdminScope: true,
  },
  {
    name: "legacy grupo-creator (isAdmin never set)",
    viewer: (f) => f.viewers.legacyCreator,
    expectedVisible: (f) => [
      f.escoteiros.escEscoteiro,
      f.escoteiros.escSenior,
      f.escoteiros.escPioneiro,
      f.escoteiros.escUnstamped,
      f.escoteiros.escRamoLess,
    ],
    expectedRamoScope: ALL_RAMOS,
    isAdminScope: true,
  },
  {
    name: "multi-ramo escotista (escoteiro+senior)",
    viewer: (f) => f.viewers.multiRamo,
    expectedVisible: (f) => [
      f.escoteiros.escEscoteiro,
      f.escoteiros.escSenior,
      f.escoteiros.escUnstamped,
    ],
    expectedRamoScope: ["escoteiro", "senior"],
    isAdminScope: false,
  },
  {
    name: "single-ramo escotista (escoteiro)",
    viewer: (f) => f.viewers.singleRamo,
    expectedVisible: (f) => [f.escoteiros.escEscoteiro],
    expectedRamoScope: ["escoteiro"],
    isAdminScope: false,
  },
  {
    name: "legacy-unstamped escotista (escoteiro)",
    viewer: (f) => f.viewers.unstamped,
    expectedVisible: (f) => [f.escoteiros.escEscoteiro],
    expectedRamoScope: ["escoteiro"],
    isAdminScope: false,
  },
];

describe("visibilidade de ramo: all seven surfaces agree", () => {
  for (const arch of ARCHETYPES) {
    test(arch.name, async () => {
      const t = newTest();
      const f = await buildGrupo(t);
      const viewer = arch.viewer(f);
      const expectedIds = new Set(arch.expectedVisible(f).map(String));
      const expectedRamos = new Set<string>(arch.expectedRamoScope);

      // User-list surfaces + the assert surface expose the SAME escoteiros.
      expect(await pendingListIds(t, viewer)).toEqual(expectedIds);
      expect(await memberListEscoteiroIds(t, viewer)).toEqual(expectedIds);
      expect(await actionableIds(t, viewer, f.allEscoteiros)).toEqual(expectedIds);
      const esp = await especialidadesView(t, viewer);
      expect(esp.ids).toEqual(expectedIds);
      expect(esp.counted).toBe(expectedIds.size);

      // Ramo-scoped surfaces agree on which ramos are in scope.
      const stats = await statsScope(t, viewer);
      expect(stats.allowed).toEqual(expectedRamos);
      expect(await aiScope(t, viewer)).toEqual(expectedRamos);

      // Timeline shows exactly the in-scope ramos' events (of those seeded)…
      const timeline = await timelineView(t, viewer);
      expect(timeline.ramos).toEqual(
        new Set(SEEDED_EVENT_RAMOS.filter((r) => expectedRamos.has(r))),
      );
      // …and group-scoped events only for admin-scope viewers.
      expect(timeline.seesGroupEvents).toBe(arch.isAdminScope);

      // Per allowed ramo, the stats scout list is exactly the ramo's slice of
      // the visible set (the ramo-less escoteiro appears in no ramo list).
      const partition: Record<string, Id<"users">[]> = {
        lobinho: [],
        escoteiro: [f.escoteiros.escEscoteiro],
        senior: [f.escoteiros.escSenior, f.escoteiros.escUnstamped],
        pioneiro: [f.escoteiros.escPioneiro],
      };
      for (const ramo of arch.expectedRamoScope) {
        const expectedScouts = new Set(
          partition[ramo]!.map(String).filter((id) => expectedIds.has(id)),
        );
        expect(stats.scoutsByRamo.get(ramo)).toEqual(expectedScouts);
      }
    });
  }
});

describe("visibilidade de ramo: unauthorized callers", () => {
  const cases: Array<{
    name: string;
    caller: (f: Fixtures, t: TestConvex) => Promise<Id<"users">>;
  }> = [
    {
      name: "escoteiro caller",
      caller: async (f) => f.escoteiros.escEscoteiro,
    },
    {
      name: "banned escotista caller",
      caller: async (f, t) =>
        t.run(async (ctx) =>
          ctx.db.insert("users", {
            name: "Banned Escotista",
            role: "escotista",
            groupId: f.groupId,
            escotistaRamos: ["escoteiro"],
            membershipStatus: "approved",
            bannedAt: 5,
          }),
        ),
    },
    {
      name: "grupo-less escotista caller",
      caller: async (_f, t) =>
        t.run(async (ctx) =>
          ctx.db.insert("users", {
            name: "Sem Grupo",
            role: "escotista",
            escotistaRamos: ["escoteiro"],
            membershipStatus: "approved",
          }),
        ),
    },
    {
      name: "pending-membership escotista caller",
      caller: async (f, t) =>
        t.run(async (ctx) =>
          ctx.db.insert("users", {
            name: "Pendente",
            role: "escotista",
            groupId: f.groupId,
            escotistaRamos: ["escoteiro"],
            membershipStatus: "pending",
          }),
        ),
    },
  ];

  for (const c of cases) {
    test(`${c.name}: silent surfaces empty, throwing surfaces throw`, async () => {
      const t = newTest();
      const f = await buildGrupo(t);
      const caller = await c.caller(f, t);

      expect(await pendingListIds(t, caller)).toEqual(new Set());
      expect(await memberListEscoteiroIds(t, caller)).toEqual(new Set());
      expect(await especialidadesView(t, caller)).toEqual({
        ids: new Set(),
        counted: 0,
      });
      const timeline = await timelineView(t, caller);
      expect(timeline.ramos).toEqual(new Set());
      expect(timeline.seesGroupEvents).toBe(false);

      await expect(
        as(t, caller).query(api.stats.getRamoScouts, { ramo: "escoteiro" }),
      ).rejects.toThrow();
      await expect(
        as(t, caller).query(api.aiHelpers.getCachedSuggestion, {
          ramo: "escoteiro",
        }),
      ).rejects.toThrow();
      await expect(
        as(t, caller).query(api.progression.getCompletionsForUser, {
          targetUserId: f.escoteiros.escEscoteiro,
        }),
      ).rejects.toThrow();
    });
  }

  test("unauthenticated caller: silent surfaces empty, throwing surfaces say Não autenticado", async () => {
    const t = newTest();
    const f = await buildGrupo(t);

    expect(await t.query(api.approvals.getPendingForGroup, {})).toEqual([]);
    expect(await t.query(api.groups.getGroupMembers, {})).toEqual([]);
    const page = await t.query(api.events.listTimeline, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toEqual([]);

    await expect(
      t.query(api.stats.getRamoScouts, { ramo: "escoteiro" }),
    ).rejects.toThrow("Não autenticado");
    await expect(
      t.query(api.progression.getCompletionsForUser, {
        targetUserId: f.escoteiros.escEscoteiro,
      }),
    ).rejects.toThrow("Não autenticado");
  });
});
