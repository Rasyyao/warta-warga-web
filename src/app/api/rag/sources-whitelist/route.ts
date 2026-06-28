import { NextRequest, NextResponse } from "next/server";
import { getSourcesWhitelistList, insertSourcesWhitelist } from "../../../lib/db";

export async function GET() {
  const rows = await getSourcesWhitelistList();
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(req: NextRequest) {
  try {
    const { pattern } = await req.json();
    if (!pattern?.trim()) {
      return NextResponse.json({ success: false, error: "Pattern wajib diisi." }, { status: 400 });
    }
    const id = await insertSourcesWhitelist(pattern.trim());
    if (!id) return NextResponse.json({ success: false, error: "Gagal menyimpan." }, { status: 500 });
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
