import { Progress } from "paxtools";
import { COLOR, COLOR_LIGHT } from "./_fixtures";

export const Niveis = () => (
  <div className="flex flex-col gap-4 max-w-md">
    <Progress value={0} />
    <Progress value={35} />
    <Progress value={72} />
    <Progress value={100} />
  </div>
);

/**
 * Each eixo tints its own bar via `indicatorColor` — the bloco header uses the
 * eixo's catalog colour rather than the primary token.
 */
export const CorDoEixo = () => (
  <div className="flex flex-col gap-4 max-w-md">
    <Progress value={60} indicatorColor="#E91E63" />
    <Progress value={45} indicatorColor="#2E7D32" />
    <Progress value={80} indicatorColor="#1565C0" />
    <Progress value={25} indicatorColor="#F9A825" />
  </div>
);

/**
 * `pendingValue` paints a lighter segment past the approved one — actions the
 * escoteiro marked but the escotista has not approved yet.
 */
export const ComPendentes = () => (
  <div className="flex flex-col gap-4 max-w-md">
    <Progress
      value={40}
      pendingValue={75}
      indicatorColor={COLOR}
      pendingColor={COLOR_LIGHT}
    />
    <Progress
      value={16}
      pendingValue={50}
      indicatorColor={COLOR}
      pendingColor={COLOR_LIGHT}
    />
  </div>
);
