import { NextRequest, NextResponse } from "next/server";
import { getSumberCrawlList, insertSumberCrawl } from "../../../lib/db";

export async function GET() {
  const rows = await getSumberCrawlList();
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(req: NextRequest) {
  try {
    const { url, wilayah } = await req.json();
    if (!url?.trim()) {
      return NextResponse.json({ success: false, error: "URL wajib diisi." }, { status: 400 });
    }
    const id = await insertSumberCrawl(url.trim(), wilayah?.trim() || null);
    if (!id) return NextResponse.json({ success: false, error: "Gagal menyimpan." }, { status: 500 });
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
