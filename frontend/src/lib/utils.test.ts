import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("alpha", "beta")).toBe("alpha beta");
  });

  it("prefers the last conflicting tailwind class", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
