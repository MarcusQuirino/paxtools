import type { Id } from "../../convex/_generated/dataModel";

export type ActionType = "fixed" | "variable";

export type Action = {
  id: string;
  text: string;
  type: ActionType;
};

export type AlternativeCompletion = {
  type: "especialidade" | "insignia";
  items: string[];
};

export type Bloco = {
  id: string;
  name: string;
  objective: string;
  eixoId: string;
  fixedActions: Action[];
  variableActions: Action[];
  variableRequired: number;
  alternativeCompletions: AlternativeCompletion[];
};

export type Eixo = {
  id: string;
  name: string;
  color: string;
  colorLight: string;
  blocos: Bloco[];
};

export type CompletionStatus = "pending" | "approved";

export type CustomAction = {
  _id: Id<"customActions">;
  blocoId: string;
  text: string;
  completed: boolean;
  status?: CompletionStatus;
};

export type UserRole = "escoteiro" | "escotista";
