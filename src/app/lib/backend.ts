// Base URL for the Warta-Warga bot/callback backend (api.warta-warga.com in production).
// PUBLIC_API_URL is the patokan (source of truth); older env names are kept as fallbacks
// for local dev where the bot runs on 127.0.0.1.
const DASHBOARD_PORT = process.env.DASHBOARD_PORT || "3210";

export const PUBLIC_API_URL =
  process.env.PUBLIC_API_URL ||
  process.env.BOT_DASHBOARD_URL ||
  process.env.WARTA_WARGA_BOT_URL ||
  `http://127.0.0.1:${DASHBOARD_PORT}`;

export function backendEndpoint(path: string) {
  return new URL(path, PUBLIC_API_URL.endsWith("/") ? PUBLIC_API_URL : `${PUBLIC_API_URL}/`);
}
