// Turns an API route like "api/cards/123" into the URL to call.
// The server's address comes from VITE_API_BASE_URL:
//   .env.development is used by "npm run dev": the API at http://localhost:5000
//   .env.production  is used by "npm run build": empty, meaning "this same
//                    site". On the server, Apache forwards /api to the API,
//                    so the built app just asks for /api/... wherever it runs.
// Vite only exposes environment variables that start with VITE_ to browser code.
export function buildPath(route: string): string {
  // ?? (not ||) so that an empty value stays empty instead of falling back
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanRoute = route.replace(/^\//, "");

  return `${cleanBase}/${cleanRoute}`;
}
