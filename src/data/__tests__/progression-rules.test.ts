import { describe, it, expect } from "bun:test";
import { STAGES, LIS_DE_OURO_BLOCKS } from "@/data/progression-rules";

describe("STAGES configuration", () => {
  it("has exactly 4 stages", () => {
    expect(STAGES).toHaveLength(4);
  });

  it("stages are in ascending order of blocksRequired", () => {
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i]!.blocksRequired).toBeGreaterThan(
        STAGES[i - 1]!.blocksRequired,
      );
    }
  });

  it("first stage requires 0 blocks", () => {
    expect(STAGES[0]!.blocksRequired).toBe(0);
  });

  it("LIS_DE_OURO_BLOCKS is 18", () => {
    expect(LIS_DE_OURO_BLOCKS).toBe(18);
  });

  it("last stage blocksRequired + blocksToNext equals LIS_DE_OURO_BLOCKS", () => {
    const lastStage = STAGES[STAGES.length - 1]!;
    expect(lastStage.blocksRequired + lastStage.blocksToNext).toBe(
      LIS_DE_OURO_BLOCKS,
    );
  });
});
