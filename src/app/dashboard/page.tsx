"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import type { ChartConfiguration, Chart as ChartInstance, Plugin } from "chart.js";

interface Report {
  id: string;
  sender: string;
  category: "HOAKS" | "PENIPUAN" | "MISINFORMASI";
  message: string;
  status: "PENDING" | "VERIFIED" | "DISMISSED";
  timestamp: string;
  rawTimestamp: string;
  wilayahTag: string;
}

interface RagSource {
  id: string;
  title: string;
  url: string;
  type: "PEMERINTAH" | "MAFINDO" | "KOMINFO";
  dateAdded: string;
}

interface DashboardReport {
  id: number;
  sender?: string | null;
  status: string;
  status_approval: string;
  isi_ringkas: string;
  jumlah_serupa: number;
  timestamp: string;
  wilayah_tag: string;
}

interface DashboardSource {
  id: number;
  program: string;
  sumber_url: string;
  wilayah_tag: string;
  tanggal_ambil: string | null;
}

type DashboardResponse =
  | {
      success: true;
      reports: DashboardReport[];
      sources: DashboardSource[];
      regionalCounts: Record<string, number>;
      broadcastedIds?: number[];
    }
  | {
      success: false;
      error?: string;
    };

type ChartItem = {
  label: string;
  value: number;
  color: string;
  percent: number;
};

const CHART_COLORS = ["#25d366", "#2196f3", "#f59e0b", "#e53935", "#7c5cfc", "#14b8a6"];

function isWithinLastHours(rawTimestamp: string, hours: number) {
  const time = new Date(rawTimestamp).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= hours * 60 * 60 * 1000;
}

function formatRegionName(region: string) {
  return region
    .toLowerCase()
    .replace(/^(kabupaten|kota|provinsi)[:/]/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildChartItems(counts: Record<string, number>, maxItems = 5): ChartItem[] {
  const sorted = Object.entries(counts)
    .map(([label, value]) => ({ label: formatRegionName(label), value: Number(value) || 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const visible = sorted.slice(0, maxItems);
  const remaining = sorted.slice(maxItems).reduce((sum, item) => sum + item.value, 0);
  const merged = remaining > 0 ? [...visible, { label: "Wilayah Lain", value: remaining }] : visible;
  const total = merged.reduce((sum, item) => sum + item.value, 0);

  return merged.map((item, index) => ({
    ...item,
    color: CHART_COLORS[index % CHART_COLORS.length],
    percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));
}

function createDoughnutCenterTextPlugin(value: number | string, label: string): Plugin<"doughnut"> {
  return {
    id: "doughnutCenterText",
    afterDatasetsDraw(chart) {
      const firstArc = chart.getDatasetMeta(0).data[0] as unknown as { x: number; y: number } | undefined;
      if (!firstArc) return;

      const { ctx } = chart;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#171717";
      ctx.font = "800 30px Arial, sans-serif";
      ctx.fillText(String(value), firstArc.x, firstArc.y - 6);
      ctx.fillStyle = "#888888";
      ctx.font = "600 11px Arial, sans-serif";
      ctx.fillText(label, firstArc.x, firstArc.y + 19);
      ctx.restore();
    },
  };
}

function getDateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function buildDailyBuckets<T>(
  items: T[],
  getTimestamp: (item: T) => string,
  days = 7
) {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = getDateKey(date);
    const value = items.filter((item) => {
      const parsed = new Date(getTimestamp(item));
      return !Number.isNaN(parsed.getTime()) && getDateKey(parsed) === key;
    }).length;

    return {
      key,
      value,
      label: date.toLocaleDateString("id-ID", { weekday: "short" }),
      dateLabel: date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
    };
  });
}

function ChartCanvas({ config }: { config: ChartConfiguration }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartInstance | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, config);
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [config]);

  return <canvas ref={canvasRef} />;
}

function ChartPanel({
  title,
  description,
  actionLabel,
  onAction,
  config,
  chartHeight = "h-[260px]",
  className = "",
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  config: ChartConfiguration;
  chartHeight?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-text-primary">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex-shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-[10px] font-bold text-primary hover:bg-primary/20 transition-all"
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div className={`relative mt-5 ${chartHeight}`}>
        <ChartCanvas config={config} />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "text-text-primary",
  helper,
}: {
  label: string;
  value: number | string;
  tone?: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[18px] border border-black/[0.06] bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold leading-none ${tone}`}>{value}</p>
      {helper && <p className="mt-2 text-[11px] leading-relaxed text-text-light">{helper}</p>}
    </div>
  );
}

export default function OverviewPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [ragSources, setRagSources] = useState<RagSource[]>([]);
  const [regionalCounts, setRegionalCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSystemActive, setIsSystemActive] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const fetchOverviewData = () => {
    setIsLoading(true);
    setDbError(null);
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        const dashboardData = data as DashboardResponse;
        if (dashboardData.success) {
          setReports(
            dashboardData.reports.map((r) => ({
              id: String(r.id),
              sender: r.sender || `Laporan #${r.id}`,
              category: r.status === "jelas_penipuan" ? "PENIPUAN" : r.status === "belum_pasti" ? "MISINFORMASI" : "HOAKS",
              message: r.isi_ringkas,
              status: r.status_approval === "disetujui" ? "VERIFIED" : r.status_approval === "ditolak" ? "DISMISSED" : "PENDING",
              timestamp: r.timestamp.includes("T")
                ? new Date(r.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
                : r.timestamp,
              rawTimestamp: r.timestamp,
              wilayahTag: r.wilayah_tag,
            }))
          );
          setRagSources(
            dashboardData.sources.map((s) => ({
              id: String(s.id),
              title: s.program,
              url: s.sumber_url,
              type: s.wilayah_tag === "nasional" ? "KOMINFO" : "PEMERINTAH",
              dateAdded: s.tanggal_ambil ? s.tanggal_ambil.split("T")[0] : new Date().toISOString().split("T")[0],
            }))
          );
          setRegionalCounts(dashboardData.regionalCounts ?? {});
        } else {
          setDbError(dashboardData.error || "Koneksi ke database gagal.");
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load overview data:", err);
        setDbError("Tidak dapat menghubungi server. Periksa koneksi internet.");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchOverviewData, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleVerify = async (id: string) => {
    setReports(reports.map((r) => (r.id === id ? { ...r, status: "VERIFIED" } : r)));
    try {
      await fetch("/api/reports/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(id),
          statusApproval: "disetujui",
          teksPeringatan: "🚨 BAHAYA! Link terverifikasi PENIPUAN oleh Admin JagaWarga.",
        }),
      });
      fetchOverviewData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismiss = async (id: string) => {
    setReports(reports.map((r) => (r.id === id ? { ...r, status: "DISMISSED" } : r)));
    try {
      await fetch("/api/reports/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(id),
          statusApproval: "ditolak",
        }),
      });
      fetchOverviewData();
    } catch (e) {
      console.error(e);
    }
  };

  const totalReports = reports.length;
  const reportsLast24Hours = reports.filter((report) => isWithinLastHours(report.rawTimestamp, 24)).length;
  const pendingReports = reports.filter((r) => r.status === "PENDING").length;
  const verifiedReports = reports.filter((r) => r.status === "VERIFIED").length;
  const reportBuckets = useMemo(() => buildDailyBuckets(reports, (report) => report.rawTimestamp), [reports]);
  const regionalChartItems = useMemo(() => {
    const fallbackCounts = reports.reduce<Record<string, number>>((acc, report) => {
      if (report.wilayahTag) acc[report.wilayahTag] = (acc[report.wilayahTag] ?? 0) + 1;
      return acc;
    }, {});
    const counts = Object.keys(regionalCounts).length > 0 ? regionalCounts : fallbackCounts;
    return buildChartItems(counts);
  }, [regionalCounts, reports]);
  const totalRegionalReports = regionalChartItems.reduce((sum, item) => sum + item.value, 0);
  const chartBaseOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            color: "#888888",
            font: { size: 11, weight: 700 },
          },
        },
        tooltip: {
          backgroundColor: "#111111",
          padding: 10,
          titleFont: { size: 12, weight: 800 },
          bodyFont: { size: 11, weight: 600 },
          displayColors: false,
        },
      },
    }),
    []
  );
  const regionChartConfig = useMemo<ChartConfiguration>(
    () => ({
      type: "doughnut",
      data: {
        labels: regionalChartItems.length > 0 ? regionalChartItems.map((item) => item.label) : ["Belum ada data"],
        datasets: [
          {
            data: regionalChartItems.length > 0 ? regionalChartItems.map((item) => item.value) : [1],
            backgroundColor: regionalChartItems.length > 0 ? regionalChartItems.map((item) => item.color) : ["#eef2ef"],
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        ...chartBaseOptions,
        cutout: "66%",
        layout: { padding: { top: 4 } },
        plugins: {
          ...chartBaseOptions.plugins,
          legend: { display: false },
        },
      },
      plugins: [createDoughnutCenterTextPlugin(totalRegionalReports, "total laporan")],
    }),
    [chartBaseOptions, regionalChartItems, totalRegionalReports]
  );
  const reportTrendConfig = useMemo<ChartConfiguration>(
    () => ({
      type: "bar",
      data: {
        labels: reportBuckets.map((bucket) => bucket.label),
        datasets: [
          {
            label: "Laporan",
            data: reportBuckets.map((bucket) => bucket.value),
            backgroundColor: "#25d366",
            borderRadius: 10,
            barThickness: 22,
          },
        ],
      },
      options: {
        ...chartBaseOptions,
        scales: {
          x: { grid: { display: false }, ticks: { color: "#888888", font: { size: 10, weight: 700 } } },
          y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { precision: 0, color: "#888888", font: { size: 10, weight: 700 } } },
        },
      },
    }),
    [chartBaseOptions, reportBuckets]
  );
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-text-muted">
        <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold">Menghubungkan ke database...</span>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <svg className="h-7 w-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">Gagal terhubung ke database</p>
          <p className="mt-1 text-xs text-text-muted max-w-xs">{dbError}</p>
        </div>
        <button
          onClick={fetchOverviewData}
          className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-dark transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fade-up_0.4s_ease-out_both]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Dashboard Ringkasan</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-text-primary">Pantau laporan warga dan sebaran wilayah</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Fokus pada laporan baru 24 jam terakhir, wilayah paling aktif, dan antrean validasi admin.
          </p>
        </div>/
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total laporan" value={totalReports} helper="Semua aduan yang masuk ke sistem." />
        <MetricCard label="Laporan 24 jam" value={reportsLast24Hours} tone="text-primary" helper="Rolling 24 jam terakhir." />
        <MetricCard label="Pending review" value={pendingReports} tone="text-accent-orange" helper="Butuh keputusan admin." />
        <MetricCard label="Terverifikasi" value={verifiedReports} tone="text-primary" helper="Sudah divalidasi admin." />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <ChartPanel
          title="Statistik Laporan"
          description="Grafik laporan warga yang masuk selama 7 hari terakhir."
          actionLabel="Kelola Aduan"
          onAction={() => { window.location.href = "/dashboard/reports"; }}
          config={reportTrendConfig}
          chartHeight="h-[300px]"
          className="xl:col-span-8"
        />
        <div className="rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-sm xl:col-span-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-primary">Persebaran Wilayah</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">{totalRegionalReports} laporan terpetakan berdasarkan wilayah.</p>
            </div>
            <button
              onClick={() => { window.location.href = "/dashboard/reports"; }}
              className="flex-shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-[10px] font-bold text-primary hover:bg-primary/20 transition-all"
            >
              Buka Peta
            </button>
          </div>
          <div className="relative mt-5 h-[180px]">
            <ChartCanvas config={regionChartConfig} />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {regionalChartItems.map((item) => (
              <div key={item.label} className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="flex-1 truncate text-[11px] text-text-muted">{item.label}</span>
                <span className="text-[11px] font-bold text-text-primary">{item.value}</span>
                <span className="w-8 text-right text-[10px] text-text-light">{item.percent}%</span>
              </div>
            ))}
            {regionalChartItems.length === 0 && (
              <p className="py-2 text-center text-[11px] text-text-muted">Belum ada data wilayah.</p>
            )}
          </div>
        </div>
        <div className="rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-sm xl:col-span-12">
          <div>
            <h3 className="text-base font-bold text-text-primary">Ringkasan Operasional</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              Dalam 24 jam terakhir ada <strong className="text-text-primary">{reportsLast24Hours}</strong> laporan baru. Prioritaskan wilayah dengan volume tinggi dan status pending.
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-primary/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Terverifikasi</p>
              <p className="mt-1 text-2xl font-extrabold text-primary">{verifiedReports}</p>
            </div>
            <div className="rounded-2xl bg-black/[0.025] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Wilayah aktif</p>
              <p className="mt-1 text-2xl font-extrabold text-text-primary">{regionalChartItems.length}</p>
            </div>
            <div className="rounded-2xl bg-accent-orange/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent-orange">Pending</p>
              <p className="mt-1 text-2xl font-extrabold text-accent-orange">{pendingReports}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="/dashboard/reports" className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-dark transition-all">
              Tinjau Laporan
            </a>
          </div>
        </div>
      </div>

      {/* Overview Layout Split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending reports */}
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary">Aduan Warga yang Perlu Dicek</h3>
          </div>
          <div className="divide-y divide-black/[0.06]">
            {reports.filter((r) => r.status === "PENDING").slice(0, 3).map((report) => (
              <div key={report.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-primary">{report.sender}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${report.category === "HOAKS" ? "bg-accent-red/10 text-accent-red" : report.category === "PENIPUAN" ? "bg-accent-orange/10 text-accent-orange" : "bg-accent-blue/10 text-accent-blue"}`}>
                      {report.category}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-1">{report.message}</p>
                  <p className="text-[10px] text-text-light">{report.timestamp}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerify(report.id)}
                    className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 transition-all"
                  >
                    Verifikasi
                  </button>
                  <button
                    onClick={() => handleDismiss(report.id)}
                    className="rounded-lg bg-black/[0.04] px-3 py-1.5 text-[11px] font-bold text-text-muted hover:bg-black/[0.08] transition-all"
                  >
                    Abaikan
                  </button>
                </div>
              </div>
            ))}
            {reports.filter((r) => r.status === "PENDING").length === 0 && (
              <p className="py-6 text-center text-xs text-text-muted">Semua aduan warga telah diverifikasi. Pekerjaan yang bagus!</p>
            )}
          </div>
        </div>

        {/* Sources status */}
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary">Source Terhubung</h3>
          </div>
          <div className="space-y-3">
            {ragSources.slice(0, 3).map((source) => (
              <div key={source.id} className="rounded-xl border border-black/[0.04] bg-[#fbfcfb] p-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-text-primary truncate">{source.title}</p>
                  <p className="text-[10px] text-text-light truncate">{source.url}</p>
                </div>
                <span className="rounded bg-black/[0.04] px-2 py-0.5 text-[9px] font-semibold text-text-muted uppercase">
                  {source.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
