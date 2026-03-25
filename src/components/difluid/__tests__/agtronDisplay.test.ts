import { describe, expect, it } from "@jest/globals";

import { getAgtronDisplayStat } from "../agtronDisplay";

describe("getAgtronDisplayStat", () => {
  it("prefers agtron color variance when it is available", () => {
    expect(
      getAgtronDisplayStat({
        agtronNumber: 62.4,
        variance: 1.236,
      }),
    ).toEqual({
      label: "Agtron",
      value: "1.24",
      unit: "Color variance",
    });
  });

  it("formats string variance values from the API safely", () => {
    expect(
      getAgtronDisplayStat({
        agtronNumber: 62.4,
        variance: "1.236" as unknown as number,
      }),
    ).toEqual({
      label: "Agtron",
      value: "1.24",
      unit: "Color variance",
    });
  });

  it("falls back to the agtron mean when variance is missing", () => {
    expect(
      getAgtronDisplayStat({
        agtronNumber: 62.4,
      }),
    ).toEqual({
      label: "Agtron",
      value: "62.4",
      unit: "City",
    });
  });

  it("returns null when no agtron data is available", () => {
    expect(getAgtronDisplayStat({})).toBeNull();
  });
});
