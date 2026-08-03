import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import LoginPage from "@/app/login/page";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: loginMock,
    logout: vi.fn(),
  }),
}));

const loginMock = vi.fn();

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    replaceMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the login form", () => {
    render(<LoginPage />);
    expect(
      screen.getByDisplayValue("admin@smartfactory.local"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("submits credentials and navigates to the dashboard", async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByDisplayValue("admin@smartfactory.local");
    await user.clear(emailInput);
    await user.type(emailInput, "admin@x.local");
    await user.type(screen.getByPlaceholderText("••••••••"), "Secret@123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith(
        "admin@x.local",
        "Secret@123",
      ),
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("shows the API error message on failure", async () => {
    loginMock.mockRejectedValue(
      new ApiClientError(401, {
        statusCode: 401,
        message: "Invalid credentials",
        error: "Unauthorized",
        path: "/auth/login",
        timestamp: new Date().toISOString(),
      }),
    );
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("••••••••"), "Wrong@123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument(),
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows a generic message for unexpected failures", async () => {
    loginMock.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("••••••••"), "Wrong@123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(
        screen.getByText("Login failed. Please try again."),
      ).toBeInTheDocument(),
    );
  });
});
