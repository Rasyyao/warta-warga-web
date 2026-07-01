import { NextResponse } from "next/server";
import { backendEndpoint } from "@/app/lib/backend";

export async function POST() {
  try {
    const res = await fetch(backendEndpoint("wa/start"), {
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
