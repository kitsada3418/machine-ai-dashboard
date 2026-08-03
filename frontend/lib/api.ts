const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

const TOKEN_KEY = "sf_access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

export class ApiClientError extends Error {
  constructor(
    readonly statusCode: number,
    readonly body: ApiError,
  ) {
    super(Array.isArray(body.message) ? body.message.join("; ") : body.message);
    this.name = "ApiClientError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let body: ApiError;
    try {
      body = (await response.json()) as ApiError;
    } catch {
      body = {
        statusCode: response.status,
        message: response.statusText,
        error: "HttpError",
        path,
        timestamp: new Date().toISOString(),
      };
    }
    if (response.status === 401) {
      clearAccessToken();
    }
    throw new ApiClientError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
