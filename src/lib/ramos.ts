export type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

export const RAMOS: Ramo[] = ["lobinho", "escoteiro", "senior", "pioneiro"];

export const RAMO_LABELS: Record<Ramo, string> = {
  lobinho: "Lobinho",
  escoteiro: "Escoteiro",
  senior: "Sênior",
  pioneiro: "Pioneiro",
};

export const RAMO_AGE: Record<Ramo, string> = {
  lobinho: "6,5 a 10 anos",
  escoteiro: "11 a 14 anos",
  senior: "15 a 17 anos",
  pioneiro: "18 a 21 anos",
};

// Prefix used to name the unit within a group.
// e.g. "Alcateia Potiguara" / "Tropa Índio Velho" / "Clã Highlander".
export const RAMO_UNIT_PREFIX: Record<Ramo, string> = {
  lobinho: "Alcateia",
  escoteiro: "Tropa",
  senior: "Tropa",
  pioneiro: "Clã",
};

export function unitLabel(ramo: Ramo, groupName: string): string {
  return `${RAMO_UNIT_PREFIX[ramo]} ${groupName}`;
}
