# Paxtools

Progression tracking for a Brazilian scout group: escoteiros record their progression, escotistas review and approve it.

## Language

### People & access

**Grupo**:
A scout group; the top-level community every member belongs to.
_Avoid_: organization, team

**Ramo**:
An age-based section of the movement (lobinho, escoteiro, sênior, pioneiro). Every escoteiro belongs to exactly one ramo; an escotista accompanies one or more ramos.
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
A specialty an escoteiro can complete as a bloco's alternative path.
_Avoid_: badge, skill

**Conclusão**:
An escoteiro's claim that an ação, especialidade, or lis-de-ouro item is done. Starts pending; an escotista approves or rejects it. Recorded by an escotista directly, it is approved from the start.
_Avoid_: completion (in prose), check

**Etapa**:
A progression stage reached by completing blocos: pista → trilha → rumo → travessia.
_Avoid_: trilha (as the generic term — trilha is one specific etapa), stage, level

**Lis de Ouro**:
The top achievement: all blocos plus its own final items.

**Plano**:
An escoteiro's prioritized list of ações, especialidades, and ações personalizadas they intend to do next.
_Avoid_: plan items, to-do list
