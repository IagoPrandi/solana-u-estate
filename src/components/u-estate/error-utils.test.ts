import { describe, expect, it } from "vitest";
import { getErrorMessage, summarizeProgramLogs } from "./error-utils";

describe("transaction error helpers", () => {
  it("uses nested wallet adapter errors instead of generic wrapper messages", () => {
    const error = new Error("Unexpected error") as Error & { error: Error };
    error.error = new Error("Simulation failed: Property is not mock verified.");

    expect(getErrorMessage(error, "Fallback")).toBe(
      "Simulation failed: Property is not mock verified.",
    );
  });

  it("summarizes the actionable Anchor log line", () => {
    expect(
      summarizeProgramLogs([
        "Program log: Instruction: TokenizeProperty",
        "Program log: AnchorError thrown. Error Code: PropertyNotMockVerified. Error Message: Property is not mock verified.",
      ]),
    ).toBe(
      "AnchorError thrown. Error Code: PropertyNotMockVerified. Error Message: Property is not mock verified.",
    );
  });
});
