"use client";

import { useState } from "react";

type BaileysStatus = "idle" | "connecting" | "qr_pending" | "connected" | "disconnected" | "logged_out" | "off";

interface WaStatusResponse {
  transport: "baileys" | "kirimi" | null;
  status?: BaileysStatus;
  qr?: string | null;
  connectedAs?: string | null;
  success?: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

const STATUS_LABEL: Record<BaileysStatus, string> = {
  idle: "Belum dimulai",
  connecting: "Menghubungkan...",
  qr_pending: "Menunggu scan QR",
  connected: "Terautentikasi — Terhubung",
  disconnected: "Terputus",
  logged_out: "Belum terautentikasi — perlu scan ulang",
  off: "Bot dimatikan",
};

export default function WhatsAppConnectionPage() {
  const [data, setData] = useState<WaStatusResponse | null>(null);
  const [isUnreachable, setIsUnreachable] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isRelinking, setIsRelinking] = useState(false);
  const [isTogglingPower, setIsTogglingPower] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (isCheckingStatus) return;
    setIsCheckingStatus(true);
    setNotice(null);
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      const json = (await res.json()) as WaStatusResponse;
      setIsUnreachable(res.status === 503);
      setData(json);
      setLastCheckedAt(new Date());
    } catch {
      setIsUnreachable(true);
      setData({ transport: null, status: "unreachable" as BaileysStatus, error: "Bot tidak bisa dihubungi." });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleRelink = async () => {
    if (isRelinking) return;
    if (!confirm("Ini akan memutus sesi WhatsApp saat ini dan meminta scan QR baru. Lanjutkan?")) return;
    setIsRelinking(true);
    setNotice(null);
    try {
      const res = await fetch("/api/whatsapp/relink", { method: "POST" });
      const json = (await res.json().catch(() => null)) as WaStatusResponse | null;
      if (!res.ok) throw new Error(json?.error || "Gagal meminta QR baru.");

      setIsUnreachable(false);
      if (json?.transport || json?.status || json?.qr) {
        setData(json);
      } else {
        setData((current) => ({
          transport: current?.transport === "kirimi" ? "kirimi" : "baileys",
          status: "connecting",
          qr: null,
        }));
      }
      setNotice("Permintaan QR baru sudah dikirim. Klik Cek Status untuk mengambil QR dari bot.");
    } catch (err) {
      console.error("Failed to relink WhatsApp:", err);
      setNotice(err instanceof Error ? err.message : "Gagal meminta QR baru.");
    } finally {
      setIsRelinking(false);
    }
  };

  const handleStop = async () => {
    if (isTogglingPower) return;
    if (!confirm("Ini akan mematikan bot WhatsApp — bot berhenti membalas & menyebar peringatan sampai dinyalakan lagi. Lanjutkan?")) return;
    setIsTogglingPower(true);
    setNotice(null);
    try {
      const res = await fetch("/api/whatsapp/stop", { method: "POST" });
      const json = (await res.json().catch(() => null)) as WaStatusResponse | null;
      if (!res.ok) throw new Error(json?.error || "Gagal mematikan bot.");

      setIsUnreachable(false);
      setData((current) => ({
        transport: current?.transport === "kirimi" ? "kirimi" : "baileys",
        status: "off",
        qr: null,
        connectedAs: current?.connectedAs ?? null,
      }));
      setNotice("Bot dimatikan. Klik Cek Status untuk memastikan status terbaru dari server.");
    } catch (err) {
      console.error("Failed to stop WhatsApp bot:", err);
      setNotice(err instanceof Error ? err.message : "Gagal mematikan bot.");
    } finally {
      setIsTogglingPower(false);
    }
  };

  const handleStart = async () => {
    if (isTogglingPower) return;
    setIsTogglingPower(true);
    setNotice(null);
    try {
      const res = await fetch("/api/whatsapp/start", { method: "POST" });
      const json = (await res.json().catch(() => null)) as WaStatusResponse | null;
      if (!res.ok) throw new Error(json?.error || "Gagal menyalakan bot.");

      setIsUnreachable(false);
      if (json?.transport || json?.status || json?.qr) {
        setData(json);
      } else {
        setData((current) => ({
          transport: current?.transport === "kirimi" ? "kirimi" : "baileys",
          status: "connecting",
          qr: null,
        }));
      }
      setNotice("Bot sedang dinyalakan. Klik Cek Status untuk melihat apakah sudah terhubung atau perlu scan QR.");
    } catch (err) {
      console.error("Failed to start WhatsApp bot:", err);
      setNotice(err instanceof Error ? err.message : "Gagal menyalakan bot.");
    } finally {
      setIsTogglingPower(false);
    }
  };

  const isAuthenticated = data?.transport === "baileys" && data?.status === "connected";
  const showFullscreenQr = data?.transport === "baileys" && data?.status === "qr_pending" && Boolean(data?.qr);
  const canManageBaileys = !isUnreachable && data?.transport !== "kirimi";

  return (
    <>
      {/* QR full screen — supaya gampang dipindai dari HP tanpa harus mepet-mepet lihat card kecil. */}
      {showFullscreenQr && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-6 bg-white p-6 animate-[fade-up_0.3s_ease-out_both]">
          <div className="text-center">
            <h2 className="text-lg font-bold text-text-primary">Scan QR untuk menghubungkan WhatsApp</h2>
            <p className="mt-1 text-sm text-text-muted">
              Buka WhatsApp di HP → Perangkat Tertaut → Tautkan Perangkat, lalu scan QR di bawah ini.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data!.qr!}
            alt="QR WhatsApp"
            className="aspect-square w-[min(80vmin,520px)] rounded-2xl border border-black/[0.08] shadow-lg"
          />
          <p className="text-xs text-text-muted">Jika QR kedaluwarsa, klik Cek Status lagi dari halaman koneksi.</p>
          <button
            onClick={fetchStatus}
            disabled={isCheckingStatus}
            className="rounded-xl bg-black/[0.04] px-4 py-2.5 text-xs font-bold text-text-muted hover:bg-black/[0.08] transition-all disabled:opacity-60"
          >
            {isCheckingStatus ? "Mengecek..." : "Cek Status"}
          </button>
        </div>
      )}

      <div className="max-w-2xl space-y-6 animate-[fade-up_0.4s_ease-out_both]">
      <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-text-primary">Koneksi WhatsApp</h3>
            <p className="mt-1 text-xs text-text-muted leading-relaxed">
              Hubungkan nomor WhatsApp bot dari sini — tidak perlu lagi scan QR lewat terminal server.
            </p>
            {lastCheckedAt && (
              <p className="mt-1 text-[11px] text-text-muted">
                Terakhir dicek: {lastCheckedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            )}
          </div>
          <button
            onClick={fetchStatus}
            disabled={isCheckingStatus}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary/90 transition-all disabled:opacity-60 sm:w-auto"
          >
            {isCheckingStatus ? "Mengecek..." : "Cek Status"}
          </button>
        </div>

        {notice && (
          <div className="rounded-xl border border-black/[0.06] bg-[#fbfcfb] p-4 text-xs text-text-muted">
            {notice}
          </div>
        )}

        {!data && !isCheckingStatus && (
          <div className="rounded-xl border border-black/[0.06] bg-[#fbfcfb] p-4 text-xs text-text-muted">
            Klik Cek Status untuk mengambil status koneksi WhatsApp dari server.
          </div>
        )}

        {isCheckingStatus && !data && (
          <div className="rounded-xl border border-black/[0.06] bg-[#fbfcfb] p-4 text-xs text-text-muted">Memuat status koneksi...</div>
        )}

        {!isUnreachable && data?.transport === "baileys" && (
          <div
            className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${
              isAuthenticated
                ? "border-primary/20 bg-primary/5 text-primary"
                : "border-accent-orange/20 bg-accent-orange/5 text-accent-orange"
            }`}
          >
            {isAuthenticated ? "✅ Terautentikasi" : "⚠️ Belum terautentikasi"}
            {isAuthenticated && data.connectedAs && <span className="font-normal">— {data.connectedAs}</span>}
          </div>
        )}

        {isUnreachable && (
          <div className="rounded-xl border border-accent-red/20 bg-accent-red/5 p-4 text-xs text-accent-red">
            Bot tidak bisa dihubungi. Pastikan proses bot (`npm start` / `npm run bot`) sedang berjalan.
          </div>
        )}

        {!isUnreachable && data?.transport === "kirimi" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-text-primary">
              Transport aktif: <strong>kirimi.id</strong>. Pairing nomor WhatsApp dilakukan di dashboard{" "}
              <a href="https://kirimi.id" target="_blank" rel="noreferrer" className="font-semibold text-primary underline">
                kirimi.id
              </a>{" "}
              (scan QR di sana), bukan di sini — jadi tidak ada QR untuk ditampilkan pada mode ini.
            </div>
            <div className="rounded-xl border border-black/[0.06] bg-[#fbfcfb] p-4 text-xs">
              <p className="font-bold text-text-primary">
                Status device: {data.success ? "Terhubung ✅" : `Bermasalah — ${data.error || data.message || "tidak diketahui"}`}
              </p>
              {Boolean(data.data) && (
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px] text-text-muted">
                  {JSON.stringify(data.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {!isUnreachable && data?.transport === "baileys" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  data.status === "connected" ? "bg-primary animate-pulse" : data.status === "qr_pending" ? "bg-accent-orange" : "bg-text-muted"
                }`}
              />
              <span className="text-xs font-bold text-text-primary">{STATUS_LABEL[data.status || "idle"]}</span>
              {data.status === "connected" && data.connectedAs && (
                <span className="text-xs text-text-muted">— {data.connectedAs}</span>
              )}
            </div>

            {data.status === "qr_pending" && data.qr && (
              <div className="rounded-xl border border-black/[0.06] bg-[#fbfcfb] p-6 text-center text-xs text-text-muted">
                QR ditampilkan full screen supaya gampang dipindai — lihat overlay di layar.
              </div>
            )}

            {data.status === "connecting" && !data.qr && (
              <div className="rounded-xl border border-black/[0.06] bg-[#fbfcfb] p-6 text-center text-xs text-text-muted">
                Menyiapkan koneksi, QR akan muncul di sini sebentar lagi...
              </div>
            )}

            {data.status === "off" && (
              <div className="rounded-xl border border-black/[0.06] bg-[#fbfcfb] p-6 text-center text-xs text-text-muted">
                Bot dimatikan secara manual. Sesi tersimpan tetap ada — nyalakan lagi untuk tersambung tanpa scan ulang.
              </div>
            )}
          </div>
        )}

        {!isUnreachable && data && !data.transport && (
          <div className="rounded-xl border border-black/[0.06] bg-[#fbfcfb] p-4 text-xs text-text-muted">
            Status belum tersedia. Klik Cek Status untuk mengambil data terbaru.
          </div>
        )}

        {canManageBaileys && (
          <div className="flex flex-wrap gap-2">
            {data?.transport === "baileys" && (
              data.status === "off" ? (
                <button
                  onClick={handleStart}
                  disabled={isTogglingPower}
                  className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary/90 transition-all disabled:opacity-60"
                >
                  {isTogglingPower ? "Menyalakan..." : "Nyalakan Bot"}
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  disabled={isTogglingPower}
                  className="rounded-xl bg-accent-red/10 px-4 py-2.5 text-xs font-bold text-accent-red hover:bg-accent-red/20 transition-all disabled:opacity-60"
                >
                  {isTogglingPower ? "Mematikan..." : "Matikan Bot"}
                </button>
              )
            )}

            <button
              onClick={handleRelink}
              disabled={isRelinking}
              className="rounded-xl bg-black/[0.04] px-4 py-2.5 text-xs font-bold text-text-muted hover:bg-black/[0.08] transition-all disabled:opacity-60"
            >
              {isRelinking ? "Memutus & menyiapkan QR baru..." : "Hubungkan Ulang / Scan Nomor Baru"}
            </button>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
