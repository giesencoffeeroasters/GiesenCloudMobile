import axios from "axios";
import { describe, expect, it } from "@jest/globals";

import { isExpectedAuthCancellation } from "../errors";

describe("isExpectedAuthCancellation", () => {
  it("returns true for the auth token cancellation used by the API client", () => {
    const error = new axios.Cancel("No auth token");

    expect(isExpectedAuthCancellation(error)).toBe(true);
  });

  it("returns false for other cancellations and regular errors", () => {
    expect(isExpectedAuthCancellation(new axios.Cancel("Request aborted"))).toBe(
      false,
    );
    expect(isExpectedAuthCancellation(new Error("No auth token"))).toBe(false);
  });
});
