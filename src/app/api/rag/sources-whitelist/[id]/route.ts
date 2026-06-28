import { NextRequest, NextResponse } from "next/server";
import { updateSourcesWhitelist, deleteSourcesWhitelist } from "../../../../lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { pattern, aktif } = await req.json();
    if (!pattern?.trim()) {
      return NextResponse.json({ success: false, error: "Pattern wajib diisi." }, { status: 400 });
    }
    const ok = await updateSourcesWhitelist(Number(id), pattern.trim(), aktif ?? 1);
    return NextResponse.json({ success: ok });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await deleteSourcesWhitelist(Number(id));
    return NextResponse.json({ success: ok });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
