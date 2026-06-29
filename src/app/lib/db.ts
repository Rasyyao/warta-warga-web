import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

export interface DatabaseReport {
  id: number;
  isi_ringkas: string;
  modus_key: string | null;
  wilayah_tag: string;
  status: string;
  status_approval: string;
  dasar_verifikasi: string | null;
  teks_peringatan: string | null;
  jumlah_serupa: number;
  cluster_reason: "modus_key" | "cosine" | "similar_text" | null;
  timestamp: string;
  updated_ts: string;
}

export interface InteractionLog {
  id: number;
  konteks: string | null;
  jenis: string | null;
  aksi: string | null;
  label: string | null;
  wilayah_tag: string | null;
  ringkas_pesan: string | null;
  ringkas_resp: string | null;
  timestamp: string;
}

export interface InfoBansos {
  id: number;
  program: string;
  ringkasan: string;
  syarat: any;
  tanggal_penting: string | null;
  batas_daftar: string | null;
  cara_daftar: string | null;
  wilayah_tag: string;
  sumber_url: string;
  tanggal_ambil: string;
  image_path: string | null;
}

export interface SumberCrawl {
  id: number;
  url: string;
  wilayah: string | null;
  crawl: number;
  aktif: number;
}

export interface SourcesWhitelist {
  id: number;
  pattern: string;
  aktif: number;
}

// ── laporan ──────────────────────────────────────────────────────────────────

export async function getReportsList(): Promise<DatabaseReport[]> {
  const { data, error } = await getSupabase()
    .from("laporan")
    .select("*")
    .order("id", { ascending: false });
  if (error) { console.error("getReportsList:", error.message); return []; }
  return (data ?? []).map((r) => ({
    id: r.id,
    isi_ringkas: r.isi_ringkas,
    modus_key: r.modus_key,
    wilayah_tag: r.wilayah_tag,
    status: r.status,
    status_approval: r.status_approval ?? "menunggu",
    dasar_verifikasi: r.dasar_verifikasi,
    teks_peringatan: r.teks_peringatan,
    jumlah_serupa: Number(r.jumlah_serupa ?? 1),
    cluster_reason: r.cluster_reason ?? null,
    timestamp: r.timestamp ?? r.updated_ts,
    updated_ts: r.updated_ts,
  }));
}

export async function setApprovalLaporan(
  id: number,
  statusApproval: string,
  teksPeringatan: string | null
): Promise<DatabaseReport | null> {
  const now = new Date().toISOString();
  const update: any = { status_approval: statusApproval, updated_ts: now };
  if (teksPeringatan !== null) update.teks_peringatan = teksPeringatan;

  const { data, error } = await getSupabase()
    .from("laporan")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("setApprovalLaporan:", error.message); return null; }
  const r = data;
  return {
    id: r.id,
    isi_ringkas: r.isi_ringkas,
    modus_key: r.modus_key,
    wilayah_tag: r.wilayah_tag,
    status: r.status,
    status_approval: r.status_approval,
    dasar_verifikasi: r.dasar_verifikasi,
    teks_peringatan: r.teks_peringatan,
    jumlah_serupa: Number(r.jumlah_serupa ?? 1),
    cluster_reason: r.cluster_reason ?? null,
    timestamp: r.timestamp ?? r.updated_ts,
    updated_ts: r.updated_ts,
  };
}

// ── log_interaksi ─────────────────────────────────────────────────────────────

export async function getInteractionLogs(): Promise<InteractionLog[]> {
  const { data, error } = await getSupabase()
    .from("log_interaksi")
    .select("*")
    .order("id", { ascending: false })
    .limit(50);
  if (error) { console.error("getInteractionLogs:", error.message); return []; }
  return (data ?? []).map((r) => ({
    id: r.id,
    konteks: r.konteks,
    jenis: r.jenis,
    aksi: r.aksi,
    label: r.label,
    wilayah_tag: r.wilayah_tag,
    ringkas_pesan: r.ringkas_pesan,
    ringkas_resp: r.ringkas_resp,
    timestamp: r.timestamp,
  }));
}

// ── info_bansos ───────────────────────────────────────────────────────────────

export async function getInfoBansosList(): Promise<InfoBansos[]> {
  const { data, error } = await getSupabase()
    .from("info_bansos")
    .select("*")
    .order("id", { ascending: false });
  if (error) { console.error("getInfoBansosList:", error.message); return []; }
  return data ?? [];
}

export async function insertInfoBansos(info: Omit<InfoBansos, "id">): Promise<number | null> {
  const { data, error } = await getSupabase()
    .from("info_bansos")
    .insert({
      program: info.program,
      ringkasan: info.ringkasan,
      syarat: info.syarat ?? [],
      tanggal_penting: info.tanggal_penting ?? null,
      batas_daftar: info.batas_daftar ?? null,
      cara_daftar: info.cara_daftar ?? null,
      wilayah_tag: info.wilayah_tag,
      sumber_url: info.sumber_url,
      tanggal_ambil: new Date().toISOString(),
      image_path: info.image_path ?? null,
    })
    .select("id")
    .single();
  if (error) { console.error("insertInfoBansos:", error.message); return null; }
  return data?.id ?? null;
}

// ── regional counts ───────────────────────────────────────────────────────────

export async function getRegionalReportCounts(): Promise<Record<string, number>> {
  const { data, error } = await getSupabase()
    .from("laporan")
    .select("wilayah_tag, jumlah_serupa");
  if (error) { console.error("getRegionalReportCounts:", error.message); return {}; }
  const counts: Record<string, number> = {};
  for (const r of data ?? []) {
    if (r.wilayah_tag) counts[r.wilayah_tag] = (counts[r.wilayah_tag] ?? 0) + Number(r.jumlah_serupa ?? 1);
  }
  return counts;
}

// ── sumber_crawl CRUD ─────────────────────────────────────────────────────────

export async function getSumberCrawlList(): Promise<SumberCrawl[]> {
  const { data, error } = await getSupabase()
    .from("sumber_crawl")
    .select("*")
    .order("id", { ascending: false });
  if (error) { console.error("getSumberCrawlList:", error.message); return []; }
  return (data ?? []).map((r) => ({ id: r.id, url: r.url, wilayah: r.wilayah, crawl: Number(r.crawl), aktif: Number(r.aktif) }));
}

export async function insertSumberCrawl(url: string, wilayah: string | null): Promise<number | null> {
  const { data, error } = await getSupabase()
    .from("sumber_crawl")
    .insert({ url, wilayah: wilayah ?? null })
    .select("id")
    .single();
  if (error) { console.error("insertSumberCrawl:", error.message); return null; }
  return data?.id ?? null;
}

export async function updateSumberCrawl(id: number, url: string, wilayah: string | null, aktif: number): Promise<boolean> {
  const { error } = await getSupabase()
    .from("sumber_crawl")
    .update({ url, wilayah: wilayah ?? null, aktif })
    .eq("id", id);
  if (error) { console.error("updateSumberCrawl:", error.message); return false; }
  return true;
}

export async function deleteSumberCrawl(id: number): Promise<boolean> {
  const { error } = await getSupabase()
    .from("sumber_crawl")
    .delete()
    .eq("id", id);
  if (error) { console.error("deleteSumberCrawl:", error.message); return false; }
  return true;
}

// ── sources_whitelist CRUD ────────────────────────────────────────────────────

export async function getSourcesWhitelistList(): Promise<SourcesWhitelist[]> {
  const { data, error } = await getSupabase()
    .from("sources_whitelist")
    .select("*")
    .order("id", { ascending: false });
  if (error) { console.error("getSourcesWhitelistList:", error.message); return []; }
  return (data ?? []).map((r) => ({ id: r.id, pattern: r.pattern, aktif: Number(r.aktif) }));
}

export async function insertSourcesWhitelist(pattern: string): Promise<number | null> {
  const { data, error } = await getSupabase()
    .from("sources_whitelist")
    .insert({ pattern })
    .select("id")
    .single();
  if (error) { console.error("insertSourcesWhitelist:", error.message); return null; }
  return data?.id ?? null;
}

export async function updateSourcesWhitelist(id: number, pattern: string, aktif: number): Promise<boolean> {
  const { error } = await getSupabase()
    .from("sources_whitelist")
    .update({ pattern, aktif })
    .eq("id", id);
  if (error) { console.error("updateSourcesWhitelist:", error.message); return false; }
  return true;
}

export async function deleteSourcesWhitelist(id: number): Promise<boolean> {
  const { error } = await getSupabase()
    .from("sources_whitelist")
    .delete()
    .eq("id", id);
  if (error) { console.error("deleteSourcesWhitelist:", error.message); return false; }
  return true;
}
