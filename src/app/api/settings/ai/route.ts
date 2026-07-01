import { NextRequest, NextResponse } from "next/server";
import { getAiEnabled, setAiEnabled } from "../../../lib/db";

export async function GET() {
  try {
    const enabled = await getAiEnabled();
    return NextResponse.json({ success: true, enabled });
  } catch (e: any) {
    console.error("AI settings GET error:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { enabled } = await req.json();
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "'enabled' wajib boolean." },
        { status: 400 }
      );
    }

    const ok = await setAiEnabled(enabled);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Gagal menyimpan pengaturan ke database." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, enabled });
  } catch (e: any) {
    console.error("AI settings POST error:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
