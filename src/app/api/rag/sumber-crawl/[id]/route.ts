import { NextRequest, NextResponse } from "next/server";
import { updateSumberCrawl, deleteSumberCrawl } from "../../../../lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { url, wilayah, aktif } = await req.json();
    if (!url?.trim()) {
      return NextResponse.json({ success: false, error: "URL wajib diisi." }, { status: 400 });
    }
    const ok = await updateSumberCrawl(Number(id), url.trim(), wilayah?.trim() || null, aktif ?? 1);
    return NextResponse.json({ success: ok });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await deleteSumberCrawl(Number(id));
    return NextResponse.json({ success: ok });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
