import { NextResponse } from "next/server";
import { setApprovalLaporan } from "@/app/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { ids, wilayahTag, teksPeringatan } = body;

  if (!ids?.length || !wilayahTag) {
    return NextResponse.json({ ok: false, error: "ids and wilayahTag required" }, { status: 400 });
  }

  let approved = 0;
  for (const id of ids) {
    const result = await setApprovalLaporan(Number(id), "disetujui", teksPeringatan || null).catch(() => null);
    if (result) approved++;
  }

  return NextResponse.json({
    ok: true,
    approved,
    pending: true,
    message: `${approved} laporan disetujui. Bot akan generate poster & broadcast ke grup dalam ≤5 menit.`,
  });
}
