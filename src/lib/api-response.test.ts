import { describe, expect, it } from "vitest";
import { ApiErrorCode, apiError } from "./api-response";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, parsePagination } from "./pagination";

describe("API response envelope", () => {
  it("returns the documented error structure", async () => {
    const response = apiError(ApiErrorCode.validation, "A title is required.", 400, {
      field: "title",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "A title is required.",
        details: { field: "title" },
      },
    });
  });
});

describe("pagination", () => {
  it("uses a bounded default page size", () => {
    expect(parsePagination(new URLSearchParams())).toEqual({ limit: DEFAULT_PAGE_SIZE });
  });

  it("rejects oversized page sizes", () => {
    expect(() => parsePagination(new URLSearchParams(`limit=${MAX_PAGE_SIZE + 1}`))).toThrow();
  });
});
