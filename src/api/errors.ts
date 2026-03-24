import axios from "axios";

const MISSING_AUTH_TOKEN_MESSAGE = "No auth token";

export function isExpectedAuthCancellation(error: unknown): boolean {
  return (
    axios.isCancel(error) &&
    (error as { message?: string }).message === MISSING_AUTH_TOKEN_MESSAGE
  );
}
