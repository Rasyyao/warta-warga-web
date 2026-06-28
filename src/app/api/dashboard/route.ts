import { NextResponse } from "next/server";
import {
  getReportsList,
  getInteractionLogs,
  getInfoBansosList,
  getRegionalReportCounts,
} from "../../lib/db";

export async function GET() {
  try {
    const [reports, logs, sources, regionalCounts] = await Promise.all([
      getReportsList(),
      getInteractionLogs(),
      getInfoBansosList(),
      getRegionalReportCounts(),
    ]);

    return NextResponse.json({
      success: true,
      reports,
      logs,
      sources,
      regionalCounts,
    });
  } catch (e: any) {
    console.error("Dashboard API error:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Koneksi ke database gagal." },
      { status: 503 }
    );
  }
}
