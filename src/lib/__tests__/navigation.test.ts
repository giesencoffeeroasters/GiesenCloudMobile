import { describe, expect, it, jest } from "@jest/globals";

import { goBackOrReplace } from "../navigation";

describe("goBackOrReplace", () => {
  it("goes back when the router has navigation history", () => {
    const router = {
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
      replace: jest.fn(),
    };

    goBackOrReplace(router, "/(tabs)/quality");

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("replaces to the fallback route when there is no history", () => {
    const router = {
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
      replace: jest.fn(),
    };

    goBackOrReplace(router, "/(tabs)/quality");

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/quality");
  });
});
