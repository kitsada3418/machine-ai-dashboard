import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/lib/auth";

vi.mock("@/lib/socket", () => ({
  getSocket: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
  disconnectSocket: vi.fn(),
  SOCKET_EVENTS: {},
}));

function Probe() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.email ?? "none"}</span>
      <button onClick={() => void login("a@b.c", "pw")}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

const ME = {
  id: "u1",
  email: "admin@smartfactory.local",
  name: "Admin",
  role: "ADMIN",
};

describe("AuthProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading while no token is stored", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("restores the session from /auth/me when a token exists", async () => {
    window.localStorage.setItem("sf_access_token", "stored-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ME,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent(
        "admin@smartfactory.local",
      ),
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("clears an invalid stored token on a 401", async () => {
    window.localStorage.setItem("sf_access_token", "bad-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ message: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("none"),
    );
    expect(window.localStorage.getItem("sf_access_token")).toBeNull();
  });

  it("logs in, stores the token and resolves the profile", async () => {
    const loginRes = {
      accessToken: "new-token",
      refreshToken: "refresh",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => loginRes,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ME,
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByText("login").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent(
        "admin@smartfactory.local",
      ),
    );
    expect(window.localStorage.getItem("sf_access_token")).toBe("new-token");
  });
});
