import { NextResponse } from "next/server";
import { backendEndpoint } from "@/app/lib/backend";

export async function GET() {
  try {
    const res = await fetch(backendEndpoint("wa/status"), {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { transport: null, status: "unreachable", error: e.message || "Bot tidak bisa dihubungi." },
      { status: 503 }
    );
  }
}
