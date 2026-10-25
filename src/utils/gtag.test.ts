import { expect, it } from "vitest";
import { isValidGaId } from "./gtag";

it("accepts GA4 measurement IDs only", () => {
  expect(isValidGaId("G-XNE0W4ZLNF")).toBe(true);
  for (const bad of [undefined, "", "UA-12345-1", "G-", "G-abc", "G-XNE0W4ZLNF'); alert(1);//", "g-XNE0W4ZLNF"]) {
    expect(isValidGaId(bad)).toBe(false);
  }
});
