import { NextResponse } from "next/server";
import { setApprovalLaporan } from "@/app/lib/db";

const DASHBOARD_PORT = process.env.DASHBOARD_PORT || "3210";
const BOT_DASHBOARD_URL =
  process.env.BOT_DASHBOARD_URL ||
  process.env.WARTA_WARGA_BOT_URL ||
  `http://127.0.0.1:${DASHBOARD_PORT}`;

function botDashboardEndpoint(path: string) {
  return new URL(path, BOT_DASHBOARD_URL.endsWith("/") ? BOT_DASHBOARD_URL : `${BOT_DASHBOARD_URL}/`);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { ids, wilayahTag, teksPeringatan, kategori, total, deskripsi } = body;

  if (!ids?.length || !wilayahTag) {
    return NextResponse.json({ ok: false, error: "ids and wilayahTag required" }, { status: 400 });
  }

  // Simpan teks_peringatan ke DB agar bot membaca teks yang benar saat broadcast.
  const finalTeks = teksPeringatan || deskripsi || "";
  let approved = 0;
  for (const id of ids) {
    const result = await setApprovalLaporan(Number(id), "disetujui", finalTeks || null).catch(() => null);
    if (result) approved++;
  }

  // Forward ke dashboard bot untuk broadcast langsung (generate poster + kirim ke grup WA).
  try {
    const botResp = await fetch(botDashboardEndpoint("broadcast-cluster"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: ids.map(Number),
        wilayahTag,
        teksPeringatan: finalTeks,
        kategori: kategori || "Penipuan",
        total: total || ids.length,
        deskripsi: deskripsi || finalTeks,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (botResp.ok) {
      const data = await botResp.json();
      const sentCount = data.sent || 0;
      return NextResponse.json({
        ok: true,
        approved,
        sent: sentCount,
        grupCount: data.grupCount || 0,
        message:
          sentCount > 0
            ? `✅ ${approved} laporan disetujui & peringatan disebar ke ${sentCount} grup WhatsApp.`
            : `✅ ${approved} laporan disetujui. Broadcast tertunda: ${data.reason || "tidak ada grup terdaftar atau bot tidak terhubung WA"}.`,
      });
    }
  } catch {
    // Bot offline — laporan sudah di-approve, polling berkala akan kirim saat bot hidup lagi.
  }

  return NextResponse.json({
    ok: true,
    approved,
    pending: true,
    message: `${approved} laporan disetujui. Bot akan generate poster & broadcast ke grup dalam ≤5 menit.`,
  });
}
