import { headers } from "next/headers";

export async function requireDesktopApiToken() {
  const expectedToken = String(process.env.ADMIN_API_TOKEN || "").trim();
  if (!expectedToken) {
    const error = new Error("ADMIN_API_TOKEN is not configured.");
    error.status = 500;
    throw error;
  }

  const headerStore = await headers();
  const authorization = String(headerStore.get("authorization") || "");
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token || token.trim() !== expectedToken) {
    const error = new Error("Unauthorized desktop API token.");
    error.status = 401;
    throw error;
  }
}
