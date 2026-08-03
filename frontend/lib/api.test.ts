import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiFetch,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/api";

describe("api client", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches the bearer token from localStorage", async () => {
    setAccessToken("jwt-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch<{ ok: boolean }>("/machines");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: "Bearer jwt-token",
    });
  });

  it("sends no authorization header without a token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch<{ ok: boolean }>("/machines");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("clears the token on a 401 response", async () => {
    setAccessToken("expired-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({
        statusCode: 401,
        message: "Unauthorized",
        error: "Unauthorized",
        path: "/auth/me",
        timestamp: new Date().toISOString(),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/auth/me")).rejects.toThrow("Unauthorized");
    expect(getAccessToken()).toBeNull();
  });

  it("keeps the token on other errors", async () => {
    setAccessToken("valid-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({
        statusCode: 404,
        message: "Machine not found",
        error: "Not Found",
        path: "/machines/X",
        timestamp: new Date().toISOString(),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/machines/X")).rejects.toThrow(
      "Machine not found",
    );
    expect(getAccessToken()).toBe("valid-token");
  });

  it("clears the token explicitly", () => {
    setAccessToken("token");
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });
});
