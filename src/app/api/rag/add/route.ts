import { NextRequest, NextResponse } from "next/server";
import { insertInfoBansos } from "../../../lib/db";

export async function POST(req: NextRequest) {
  try {
    const { program, ringkasan, wilayah_tag, sumber_url } = await req.json();

    if (!program || !sumber_url) {
      return NextResponse.json(
        { success: false, error: "Nama program dan URL sumber wajib diisi." },
        { status: 400 }
      );
    }

    const insertedId = await insertInfoBansos({
      program,
      ringkasan: ringkasan || "",
      syarat: [],
      tanggal_penting: null,
      batas_daftar: null,
      cara_daftar: null,
      wilayah_tag: wilayah_tag || "nasional",
      sumber_url,
      tanggal_ambil: new Date().toISOString(),
      image_path: null,
    });

    return NextResponse.json({
      success: true,
      id: insertedId,
    });
  } catch (e: any) {
    console.error("RAG source insertion API error:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
