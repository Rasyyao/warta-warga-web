import { NextResponse } from "next/server";

const DASHBOARD_PORT = process.env.DASHBOARD_PORT || "3210";
const BOT_DASHBOARD_URL =
  process.env.BOT_DASHBOARD_URL ||
  process.env.WARTA_WARGA_BOT_URL ||
  `http://127.0.0.1:${DASHBOARD_PORT}`;

function botDashboardEndpoint(path: string) {
  return new URL(path, BOT_DASHBOARD_URL.endsWith("/") ? BOT_DASHBOARD_URL : `${BOT_DASHBOARD_URL}/`);
}

export async function POST() {
  try {
    const res = await fetch(botDashboardEndpoint("wa/relink"), {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "Bot tidak bisa dihubungi." },
      { status: 503 }
    );
  }
}
