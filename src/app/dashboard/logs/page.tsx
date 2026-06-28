"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import type { ChartConfiguration, Chart as ChartInstance } from "chart.js";

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

  const fetchLogsData = () => {
    setIsLoading(true);
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        const dashboardData = data as DashboardResponse;
        if (dashboardData.success) {
          setLogs(dashboardData.logs);
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
  const topAction = actionCounts[0]?.[0] ?? "-";
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
        labels: actionCounts.length > 0 ? actionCounts.map(([label]) => label) : ["Belum ada data"],
        datasets: [
          {
            data: actionCounts.length > 0 ? actionCounts.map(([, value]) => value) : [1],
            backgroundColor: actionCounts.length > 0 ? ["#2196f3", "#25d366", "#f59e0b", "#e53935", "#7c5cfc"] : ["#eef2ef"],
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        ...chartBaseOptions,
        cutout: "66%",
      },
    }),
    [actionCounts, chartBaseOptions]
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total request" value={logs.length} />
        <MetricCard label="Request 24 jam" value={last24HourLogs} tone="text-accent-blue" />
        <MetricCard label="Konteks aktif" value={activeContexts} />
        <MetricCard label="Top aksi" value={topAction} tone="text-primary" />
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
          <div className="mt-5 h-[300px]">
            <ChartCanvas config={actionConfig} />
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-text-primary mb-4">Log Interaksi Chat Bot (WhatsApp)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/[0.06] text-text-muted font-bold text-[10px] uppercase tracking-wider">
                <th className="pb-3">Konteks/User</th>
                <th className="pb-3">Jenis/Aksi</th>
                <th className="pb-3">Pesan Warga</th>
                <th className="pb-3">Respons Bot</th>
                <th className="pb-3">Label</th>
                <th className="pb-3 text-right">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-text-muted">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-black/[0.01]">
                  <td className="py-3.5 font-bold text-text-primary pr-2">{log.konteks || "Grup/Warga"}</td>
                  <td className="py-3.5 pr-2">
                    <span className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[9px] font-semibold uppercase">
                      {log.aksi || log.jenis || "-"}
                    </span>
                  </td>
                  <td className="py-3.5 max-w-[180px] truncate pr-2" title={log.ringkas_pesan || ""}>
                    {log.ringkas_pesan || "-"}
                  </td>
                  <td className="py-3.5 max-w-[240px] truncate pr-2 text-primary font-medium" title={log.ringkas_resp || ""}>
                    {log.ringkas_resp || "-"}
                  </td>
                  <td className="py-3.5 pr-2 text-text-light">{log.label || "-"}</td>
                  <td className="py-3.5 text-right text-text-light whitespace-nowrap">
                    {log.timestamp.includes("T")
                      ? new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
                      : log.timestamp}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs">Belum ada log chat interaksi tercatat.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
