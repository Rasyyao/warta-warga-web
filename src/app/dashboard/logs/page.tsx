"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import type { ChartConfiguration, Chart as ChartInstance, Plugin } from "chart.js";

const PAGE_SIZE = 15;
const CHART_COLORS = ["#2196f3", "#25d366", "#f59e0b", "#e53935", "#7c5cfc", "#14b8a6"];

interface InteractionLog {
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

type DashboardResponse =
  | {
      success: true;
      logs: InteractionLog[];
    }
  | {
      success: false;
      error?: string;
    };

function isWithinLastHours(rawTimestamp: string, hours: number) {
  const time = new Date(rawTimestamp).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= hours * 60 * 60 * 1000;
}

function getDateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function buildDailyBuckets(logs: InteractionLog[], days = 7) {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = getDateKey(date);
    const value = logs.filter((log) => {
      const parsed = new Date(log.timestamp);
      return !Number.isNaN(parsed.getTime()) && getDateKey(parsed) === key;
    }).length;

    return {
      key,
      value,
      label: date.toLocaleDateString("id-ID", { weekday: "short" }),
    };
  });
}

function getActionCounts(logs: InteractionLog[]) {
  return Object.entries(
    logs.reduce<Record<string, number>>((acc, log) => {
      const key = log.aksi || log.jenis || "pesan";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
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
      ctx.font = "800 28px Arial, sans-serif";
      ctx.fillText(String(value), firstArc.x, firstArc.y - 6);
      ctx.fillStyle = "#888888";
      ctx.font = "600 11px Arial, sans-serif";
      ctx.fillText(label, firstArc.x, firstArc.y + 17);
      ctx.restore();
    },
  };
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

function MetricCard({
  label,
  value,
  tone = "text-text-primary",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="rounded-[18px] border border-black/[0.06] bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-2 truncate text-2xl font-extrabold leading-none ${tone}`} title={String(value)}>{value}</p>
    </div>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<InteractionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogsData = () => {
    setIsLoading(true);
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        const dashboardData = data as DashboardResponse;
        if (dashboardData.success) {
          setLogs(dashboardData.logs);
          setCurrentPage(1);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch logs:", err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchLogsData, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const dailyBuckets = useMemo(() => buildDailyBuckets(logs), [logs]);
  const actionCounts = useMemo(() => getActionCounts(logs), [logs]);
  const last24HourLogs = logs.filter((log) => isWithinLastHours(log.timestamp, 24)).length;
  const activeContexts = new Set(logs.map((log) => log.konteks).filter(Boolean)).size;

  const actionChartItems = useMemo(() => {
    const total = actionCounts.reduce((s, [, v]) => s + v, 0);
    return actionCounts.slice(0, 6).map(([label, value], i) => ({
      label,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
      percent: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
  }, [actionCounts]);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const pagedLogs = useMemo(
    () => logs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [logs, currentPage]
  );
  const paginationItems = useMemo(() => {
    const items: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (currentPage > 3) items.push("…");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) items.push(i);
      if (currentPage < totalPages - 2) items.push("…");
      items.push(totalPages);
    }
    return items;
  }, [currentPage, totalPages]);

  const chartBaseOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false as const },
        tooltip: {
          backgroundColor: "#111111",
          padding: 10,
          titleFont: { size: 12, weight: 700 as const },
          bodyFont: { size: 11, weight: 600 as const },
          displayColors: false,
        },
      },
    }),
    []
  );

  const trafficConfig = useMemo<ChartConfiguration>(
    () => ({
      type: "line",
      data: {
        labels: dailyBuckets.map((bucket) => bucket.label),
        datasets: [
          {
            label: "Traffic WA",
            data: dailyBuckets.map((bucket) => bucket.value),
            borderColor: "#2196f3",
            backgroundColor: "rgba(33,150,243,0.12)",
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#2196f3",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        ...chartBaseOptions,
        plugins: {
          ...chartBaseOptions.plugins,
          legend: {
            display: true,
            labels: { boxWidth: 10, boxHeight: 10, color: "#888888", font: { size: 11, weight: 700 } },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#888888", font: { size: 10, weight: 700 } } },
          y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { precision: 0, color: "#888888", font: { size: 10, weight: 700 } } },
        },
      },
    }),
    [chartBaseOptions, dailyBuckets]
  );

  const actionConfig = useMemo<ChartConfiguration>(
    () => ({
      type: "doughnut",
      data: {
        labels: actionChartItems.length > 0 ? actionChartItems.map((i) => i.label) : ["Belum ada data"],
        datasets: [
          {
            data: actionChartItems.length > 0 ? actionChartItems.map((i) => i.value) : [1],
            backgroundColor: actionChartItems.length > 0 ? actionChartItems.map((i) => i.color) : ["#eef2ef"],
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
      },
      plugins: [createDoughnutCenterTextPlugin(logs.length, "interaksi")],
    }),
    [actionChartItems, chartBaseOptions, logs.length]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-text-muted">
        <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold">Memuat database...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fade-up_0.4s_ease-out_both]">
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">Traffic WhatsApp</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-text-primary">Statistik Log Chatbot</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
          Pantau volume pesan masuk, konteks aktif, dan jenis aksi yang paling sering diproses oleh chatbot WA.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total request" value={logs.length} />
        <MetricCard label="Request 24 jam" value={last24HourLogs} tone="text-accent-blue" />
        <MetricCard label="Konteks aktif" value={activeContexts} />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-sm xl:col-span-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-text-primary">Traffic request WA</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">Grafik request chatbot selama 7 hari terakhir.</p>
            </div>
            <button
              onClick={fetchLogsData}
              className="rounded-xl bg-accent-blue/10 px-3 py-2 text-[10px] font-bold text-accent-blue hover:bg-accent-blue/20 transition-all"
            >
              Refresh
            </button>
          </div>
          <div className="mt-5 h-[300px]">
            <ChartCanvas config={trafficConfig} />
          </div>
        </div>

        <div className="rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-sm xl:col-span-4">
          <h3 className="text-base font-bold text-text-primary">Distribusi aksi</h3>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">Jenis request yang paling sering diproses.</p>
          <div className="mt-5 h-[180px]">
            <ChartCanvas config={actionConfig} />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {actionChartItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="flex-1 truncate text-[11px] text-text-muted">{item.label}</span>
                <span className="text-[11px] font-bold text-text-primary">{item.value}</span>
                <span className="w-8 text-right text-[10px] text-text-light">{item.percent}%</span>
              </div>
            ))}
            {actionChartItems.length === 0 && (
              <p className="py-2 text-center text-[11px] text-text-muted">Belum ada data interaksi.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-black/[0.06] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-black/[0.06]">
          <h3 className="text-base font-bold text-text-primary">Log Interaksi Chat Bot (WhatsApp)</h3>
          <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-bold text-text-muted">{logs.length} entri</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <th className="px-4 sm:px-6 py-3">Konteks/User</th>
                <th className="px-3 py-3">Jenis/Aksi</th>
                <th className="px-3 py-3">Pesan Warga</th>
                <th className="px-3 py-3">Respons Bot</th>
                <th className="px-3 py-3">Label</th>
                <th className="px-3 py-3 text-right">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {pagedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-4 sm:px-6 py-4 font-bold text-text-primary whitespace-nowrap">
                    {log.konteks || "Grup/Warga"}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[9px] font-bold text-text-muted uppercase">
                      {log.aksi || log.jenis || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-4 max-w-[200px] truncate text-text-muted" title={log.ringkas_pesan || ""}>
                    {log.ringkas_pesan || "-"}
                  </td>
                  <td className="px-3 py-4 max-w-[260px] truncate font-medium text-primary" title={log.ringkas_resp || ""}>
                    {log.ringkas_resp || "-"}
                  </td>
                  <td className="px-3 py-4 text-text-muted whitespace-nowrap text-[10px]">{log.label || "-"}</td>
                  <td className="px-3 py-4 text-right text-text-muted whitespace-nowrap text-[10px]">
                    {log.timestamp.includes("T")
                      ? new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
                      : log.timestamp}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-xs text-text-muted">Belum ada log chat interaksi tercatat.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-black/[0.06] flex-wrap gap-2">
            <span className="text-xs text-text-muted">
              Halaman <strong className="text-text-primary">{currentPage}</strong> dari{" "}
              <strong className="text-text-primary">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="rounded-lg px-2 py-1.5 text-xs font-bold text-text-muted hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg px-2 py-1.5 text-xs font-bold text-text-muted hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ‹
              </button>
              {paginationItems.map((p, idx) =>
                p === "…" ? (
                  <span key={`ell-${idx}`} className="px-1.5 text-xs text-text-muted">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    className={`rounded-lg min-w-[30px] px-2.5 py-1.5 text-xs font-bold transition-all ${
                      currentPage === p
                        ? "bg-primary text-white shadow-sm"
                        : "text-text-muted hover:bg-black/[0.04]"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg px-2 py-1.5 text-xs font-bold text-text-muted hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-lg px-2 py-1.5 text-xs font-bold text-text-muted hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
