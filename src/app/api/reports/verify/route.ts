import { NextRequest, NextResponse } from "next/server";
import { setApprovalLaporan } from "../../../lib/db";

export async function POST(req: NextRequest) {
  try {
    const { id, statusApproval, teksPeringatan } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID laporan wajib dikirim." },
        { status: 400 }
      );
    }

    const updatedReport = await setApprovalLaporan(
      Number(id),
      statusApproval || "disetujui",
      teksPeringatan || null
    );

    return NextResponse.json({
      success: true,
      report: updatedReport,
    });
  } catch (e: any) {
    console.error("Verify report API error:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
