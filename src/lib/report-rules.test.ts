import { describe, expect, it } from "vitest";
import { reportProblem } from "./report-rules";

describe("listing reports", () => {
  it("needs a reason from the list", () => {
    expect(reportProblem({ reason: "", details: "" })).toBe("reason");
    expect(reportProblem({ reason: "spam-bot", details: "" })).toBe("reason");
  });

  it("accepts a listed reason without details", () => {
    expect(reportProblem({ reason: "fraud", details: "" })).toBeNull();
  });

  it("asks for an explanation when the reason is 'other'", () => {
    expect(reportProblem({ reason: "other", details: "  ok " })).toBe("details_required");
    expect(reportProblem({ reason: "other", details: "Numéro faux" })).toBeNull();
  });

  it("refuses details longer than 1000 characters", () => {
    expect(reportProblem({ reason: "sold", details: "x".repeat(1001) })).toBe("details_too_long");
  });
});
