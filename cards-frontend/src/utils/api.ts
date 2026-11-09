import { buildPath } from "./buildPath";
import { clearSession, getSession } from "./session";

// What the API sends back: the parsed JSON body, plus whether it succeeded
export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

// The user object the API returns from login and registration
export interface ApiUser {
  _id: string;
  firstName: string;
  lastName: string;
  login: string;
}

// The body returned by POST /api/auth/login and POST /api/users
export interface AuthResponse {
  token: string;
  user: ApiUser;
}

// Sends a request to the API.
// - Sends and receives JSON
// - Adds the login token (if there is one) as "Authorization: Bearer <token>"
// - If the API says the token is no longer valid (401), logs the user out
export async function apiFetch<T>(
  route: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  const session = getSession();

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (session) headers["Authorization"] = `Bearer ${session.token}`;

  const response = await fetch(buildPath(route), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  // 204 No Content (for example, after a delete) has no body to parse
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (response.status === 401 && session) {
    // The saved token expired or was rejected: start over at the login page
    clearSession();
    window.location.href = "/";
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    error: response.ok ? undefined : data?.error ?? `Request failed (${response.status})`,
  };
}
