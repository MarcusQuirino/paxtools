# Paxtools

Progression tracking for a Brazilian scout group: escoteiros record their progression, escotistas review and approve it.

## Language

### People & access

**Grupo**:
A scout group; the top-level community every member belongs to.
_Avoid_: organization, team

**Ramo**:
An age-based section of the movement (lobinho, escoteiro, sênior, pioneiro). An escoteiro belongs to exactly one ramo *at a time*, but moves up through the ramos over the years (lobinho → escoteiro → sênior → pioneiro); each ramo has its own separate progression, and a past ramo's record is retained — never lost or merged — when the escoteiro advances. An escotista accompanies one or more ramos.
_Avoid_: section, unit

**Escoteiro**:
A youth member whose progression is tracked. This is the role name regardless of ramo — a lobinho-aged member is still an escoteiro in the model.
_Avoid_: jovem, scout, member

**Escotista**:
An adult leader who reviews and approves escoteiro progression, scoped to the ramos they accompany.
_Avoid_: leader, monitor, chefe

**Admin**:
An escotista who manages the grupo and sees every ramo. The grupo's creator is an admin even if never explicitly flagged.
_Avoid_: owner, superuser

**Visibilidade de ramo**:
The single rule deciding which escoteiros an escotista can see and act on: both are approved, non-banned members of the same grupo, and the escoteiro's ramo is one the escotista accompanies — unless the escotista is an admin, who sees all ramos. An escoteiro without a ramo is visible to admins only.
_Avoid_: ramo boundary, ramo filter, ramo scope

### Progression

**Eixo**:
A progression axis grouping blocos (e.g. "Habilidades para a Vida").
_Avoid_: pillar, area

**Bloco**:
A learning block within an eixo, completed through its ações (and, where offered, especialidades).
_Avoid_: module, unit

**Ação**:
A single progression activity inside a bloco. Fixed ações are mandatory; variable ações are pick-N alternatives.
_Avoid_: task, activity, item

**Ação personalizada**:
An escoteiro-authored ação standing in for a bloco's variable ação.
_Avoid_: custom action (in prose)

**Especialidade**:
A specialty an escoteiro can complete as a bloco's alternative path. How it is earned differs by ramo group: a **younger** especialidade (lobinho/escoteiro) is earned by completing enough of its checklist items and can reach multiple levels; an **older** especialidade (sênior/pioneiro) is a single three-[[etapa-de-especialidade]] project and is earned *binarily* — all three reports approved, or not earned. Earning one completes any bloco that names it as an alternative completion, regardless of ramo group.
_Avoid_: badge, skill

**Etapa de especialidade**:
One of the three areas of an older especialidade project — **conhecer → fazer → compartilhar**. Each is reported and approved independently, in any order; the ordering is presentational guidance, not a gate. The especialidade is earned only once all three are approved. Distinct from [[etapa]] (a progression stage).
_Avoid_: step, passo, fase, project step

**Conclusão**:
An escoteiro's claim that an ação, especialidade, or lis-de-ouro item is done. Starts pending; an escotista approves or rejects it. Recorded by an escotista directly, it is approved from the start.
_Avoid_: completion (in prose), check

**Etapa**:
A progression stage reached by completing blocos. Each ramo has its own etapas — the count (three or four) and block thresholds differ, not only the names. Escoteiro & lobinho: four etapas at 0/4/8/13 blocos (escoteiro: pista → trilha → rumo → travessia; lobinho: Pata Tenra → Saltador → Rastreador → Caçador). Sênior & pioneiro: three etapas at 0/6/12 blocos (sênior: Escalada → Conquista → Azimute; pioneiro: Descoberta → Destino → Horizonte). Every ramo reaches its [[irr-insignia-de-reconhecimento-de-ramo]] at 18. Do not treat the escoteiro names or the four-stage shape as the generic ones.
_Avoid_: trilha (as the generic term — trilha is one specific etapa), stage, level

**IRR (Insígnia de Reconhecimento de Ramo)**:
The top achievement of a ramo: earned by completing all 18 blocos plus that ramo's own final items. Each ramo has its own IRR with its own name, items, and colours — escoteiro: Lis de Ouro; lobinho: Cruzeiro do Sul; sênior: Escoteiro da Pátria; pioneiro: Insígnia de BP.
_Avoid_: Lis de Ouro (as the generic term — it is only escoteiro's IRR)

**Lis de Ouro**:
Escoteiro's [[irr-insignia-de-reconhecimento-de-ramo]]. Not a generic term for the concept.

**Plano**:
An escoteiro's prioritized list of ações, especialidades, and ações personalizadas they intend to do next.
_Avoid_: plan items, to-do list
