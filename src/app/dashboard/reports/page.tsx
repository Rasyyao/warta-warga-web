"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import TAG_GPS_JSON from "@/app/lib/indonesia-coordinates.json";

const PAGE_SIZE = 10;

/**
 * Resolve a wilayah_tag string to GPS coords.
 * Edit /src/app/lib/indonesia-coordinates.json to add or update regions.
 */
function lookupCoords(tag: string): { lat: number; lng: number } | null {
  if (!tag) return null;
  const db = TAG_GPS_JSON as unknown as Record<string, { lat: number; lng: number }>;
  const norm = tag.toLowerCase().replace(/\s+/g, '_');
  if (db[norm]) return db[norm];
  const stripped = norm.replace(/^(kabupaten|kota|provinsi)[:/]/, '');
  for (const attempt of [stripped, `kabupaten/${stripped}`, `kota/${stripped}`, `provinsi:${stripped}`]) {
    if (db[attempt]) return db[attempt];
  }
  for (const [key, coords] of Object.entries(db)) {
    const bare = key.replace(/^(kabupaten|kota|provinsi)[:/]/, '');
    if (norm.includes(bare) || bare.includes(stripped)) return coords as { lat: number; lng: number };
  }
  return null;
}

interface Report {
  id: string;
  sender: string;
  category: "HOAKS" | "PENIPUAN" | "MISINFORMASI";
  message: string;
  similarCount: number;
  status: "PENDING" | "VERIFIED" | "DISMISSED";
  timestamp: string;
  rawTimestamp: string;
  wilayahTag: string;
  dasarVerifikasi?: string;
  teksPeringatan?: string;
  modusKey: string | null;
}

interface ClusteredReport extends Report {
  clusterIds: string[];
  totalReporters: number;
}

type SortKey = "newest" | "oldest" | "frequent";
type CategoryFilter = "ALL" | "HOAKS" | "PENIPUAN" | "MISINFORMASI";
type StatusFilter = "ALL" | "PENDING" | "VERIFIED" | "DISMISSED";
type LeafletModule = typeof import("leaflet");
type LeafletMap = ReturnType<LeafletModule["map"]>;
type LeafletLayerGroup = ReturnType<LeafletModule["layerGroup"]>;

interface DashboardReport {
  id: number;
  sender?: string | null;
  status: string;
  status_approval: string | null;
  isi_ringkas: string;
  jumlah_serupa: number | null;
  modus_key: string | null;
  timestamp: string;
  wilayah_tag: string;
  dasar_verifikasi: string | null;
  teks_peringatan: string | null;
}

type DashboardResponse =
  | {
      success: true;
      reports: DashboardReport[];
    }
  | {
      success: false;
      error?: string;
    };

function CategoryBadge({ cat }: { cat: Report["category"] }) {
  const map = {
    HOAKS:        { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
    PENIPUAN:     { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
    MISINFORMASI: { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500" },
  } as const;
  const c = map[cat];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {cat}
    </span>
  );
}

function StatusBadge({ status }: { status: Report["status"] }) {
  const map = {
    PENDING:   { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500" },
    VERIFIED:  { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500" },
    DISMISSED: { bg: "bg-gray-100",   text: "text-gray-500",   dot: "bg-gray-400" },
  } as const;
  const c = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase whitespace-nowrap ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = "text-text-primary",
}: {
  label: string;
  value: number | string;
  helper: string;
  tone?: string;
}) {
  return (
    <div className="rounded-[18px] border border-black/[0.06] bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold leading-none ${tone}`}>{value}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-text-light">{helper}</p>
    </div>
  );
}

/**
 * Pretty-print a raw DB wilayah_tag for display.
 * kabupaten/bekasi        → Bekasi
 * provinsi:jawa_barat     → Jawa Barat
 * kota/jakarta_selatan    → Jakarta Selatan
 */
function formatWilayah(tag: string): string {
  if (!tag) return tag;
  const stripped = tag
    .toLowerCase()
    .replace(/^(kabupaten|kota|provinsi)[:/]/, "")
    .replace(/_/g, " ");
  return stripped.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isWithinLastHours(rawTimestamp: string, hours: number) {
  const time = new Date(rawTimestamp).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= hours * 60 * 60 * 1000;
}

function createVerificationSummary(report: Report) {
  const repeated = report.similarCount > 1 ? `Sudah muncul ${report.similarCount} kali pada laporan serupa.` : "Belum banyak duplikasi laporan.";
  return [
    `Kategori awal: ${report.category}.`,
    `Wilayah terdeteksi: ${formatWilayah(report.wilayahTag)}.`,
    repeated,
    `Isi utama laporan: ${report.message}`,
  ];
}

function createBroadcastMessage(report: Report) {
  return [
    `Info JagaWarga - ${formatWilayah(report.wilayahTag)}`,
    "",
    `Status laporan: ${report.status === "VERIFIED" ? "TERVALIDASI ADMIN" : "BELUM VALID"}`,
    `Kategori: ${report.category}`,
    `Ringkasan: ${report.message}`,
    report.teksPeringatan ? `Arahan: ${report.teksPeringatan}` : "Arahan: tetap waspada dan jangan menyebarkan informasi sebelum terverifikasi.",
  ].join("\n");
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ClusteredReport | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null);
  const [broadcastedIds, setBroadcastedIds] = useState<Set<string>>(() => new Set());
  const [mounted, setMounted] = useState(false);

  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const mapRef = useRef<LeafletMap | null>(null);
  const markerGroupRef = useRef<LeafletLayerGroup | null>(null);

  const renderMarkers = useCallback((L: LeafletModule, counts: Record<string, number>) => {
    const markerGroup = markerGroupRef.current;
    if (!markerGroup) return;
    markerGroup.clearLayers();
    Object.entries(counts).forEach(([region, count]) => {
      const coords = lookupCoords(region);
      if (!coords || count <= 0) return;
      const last24HourCount = reports.filter(
        (report) =>
          report.wilayahTag.toLowerCase() === region.toLowerCase() &&
          isWithinLastHours(report.rawTimestamp, 24)
      ).length;
      const color = count >= 5 ? "#ff9f1c" : "#25d366";
      const icon = L.divIcon({
        html: `<div style="background-color:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:white;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;position:relative;">
          <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.35;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          ${count}
        </div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(markerGroup);
      marker.bindTooltip(
        `<b>${formatWilayah(region)}</b><br/>${count} total laporan<br/>${last24HourCount} laporan dalam 24 jam`,
        {
        direction: "top",
        offset: [0, -10],
        }
      );
      marker.on("click", () => {
        setSelectedRegion(region);
        setRegionFilter(region);
        setCurrentPage(1);
        mapRef.current?.flyTo([coords.lat, coords.lng], Math.max(mapRef.current.getZoom(), 10), {
          animate: true,
          duration: 1.25,
          easeLinearity: 0.25,
        });
      });
    });
  }, [reports]);

  const fetchReportsData = () => {
    setIsLoading(true);
    setDbError(null);
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        const dashboardData = data as DashboardResponse;
        if (dashboardData.success) {
          setReports(
            dashboardData.reports.map((r) => {
              const isIso = typeof r.timestamp === "string" && r.timestamp.includes("T");
              return {
                id: String(r.id),
                sender: r.sender || `Laporan #${r.id}`,
                category:
                  r.status === "jelas_penipuan"
                    ? "PENIPUAN"
                    : r.status === "belum_pasti"
                    ? "MISINFORMASI"
                    : "HOAKS",
                message: r.isi_ringkas,
                similarCount: Number(r.jumlah_serupa ?? 1),
                modusKey: r.modus_key ?? null,
                status:
                  r.status_approval === "disetujui"
                    ? "VERIFIED"
                    : r.status_approval === "ditolak"
                    ? "DISMISSED"
                    : "PENDING",
                timestamp: isIso
                  ? new Date(r.timestamp).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }) +
                    " · " +
                    new Date(r.timestamp).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) +
                    " WIB"
                  : r.timestamp,
                rawTimestamp: r.timestamp,
                wilayahTag: r.wilayah_tag,
                dasarVerifikasi: r.dasar_verifikasi || "",
                teksPeringatan: r.teks_peringatan || "",
              };
            })
          );
        } else {
          setDbError(dashboardData.error || "Koneksi ke database gagal.");
        }
        setIsLoading(false);
      })
      .catch(() => {
        setDbError("Tidak dapat menghubungi server. Periksa koneksi internet.");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchReportsData();
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Derive region counts from actual report data so map markers match filter results
  const regionalCounts = useMemo(
    () =>
      reports.reduce(
        (acc, r) => {
          acc[r.wilayahTag] = (acc[r.wilayahTag] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    [reports]
  );

  // Group reports with same modus_key + wilayah_tag + category into clusters.
  const clusteredReports = useMemo((): ClusteredReport[] => {
    const groups = new Map<string, Report[]>();
    for (const r of reports) {
      const mKey = r.modusKey || `_raw_${r.category}_${r.message.slice(0, 40)}`;
      const key = `${mKey}::${r.wilayahTag}::${r.category}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return Array.from(groups.values()).map((group): ClusteredReport => {
      const rep = group.reduce((best, r) => r.similarCount > best.similarCount ? r : best);
      const totalReporters = group.reduce((sum, r) => sum + r.similarCount, 0);
      // Cluster status: if any PENDING → PENDING; all VERIFIED → VERIFIED; else DISMISSED
      const hasPending = group.some(r => r.status === "PENDING");
      const allVerified = group.every(r => r.status === "VERIFIED");
      const clusterStatus: Report["status"] = hasPending ? "PENDING" : allVerified ? "VERIFIED" : "DISMISSED";
      return {
        ...rep,
        status: clusterStatus,
        similarCount: totalReporters,
        clusterIds: group.map(r => r.id),
        totalReporters,
      };
    });
  }, [reports]);

  useEffect(() => {
    if (isLoading || dbError) return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((L) => {
      if (mapRef.current) return;
      const container = document.getElementById("leaflet-map");
      if (!container) return;
      const map = L.map(container, {
        center: [-2.548926, 118.0148634],
        zoom: 5,
        zoomControl: true,
        minZoom: 4,
        maxZoom: 12,
        scrollWheelZoom: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);
      mapRef.current = map;
      markerGroupRef.current = L.layerGroup().addTo(map);
      renderMarkers(L, regionalCounts);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerGroupRef.current = null;
      }
    };
  }, [isLoading, dbError, regionalCounts, renderMarkers]);

  useEffect(() => {
    if (!mapRef.current || !markerGroupRef.current) return;
    import("leaflet").then((L) => renderMarkers(L, regionalCounts));
  }, [regionalCounts, renderMarkers]);

  const filteredReports = useMemo(() => {
    let result = [...clusteredReports];
    if (regionFilter)
      result = result.filter(
        (r) => r.wilayahTag.toLowerCase() === regionFilter.toLowerCase()
      );
    if (categoryFilter !== "ALL") result = result.filter((r) => r.category === categoryFilter);
    if (statusFilter !== "ALL") result = result.filter((r) => r.status === statusFilter);

    result.sort((a, b) => {
      if (sortKey === "newest")
        return new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime();
      if (sortKey === "oldest")
        return new Date(a.rawTimestamp).getTime() - new Date(b.rawTimestamp).getTime();
      if (sortKey === "frequent") return b.similarCount - a.similarCount;
      return 0;
    });
    return result;
  }, [clusteredReports, regionFilter, categoryFilter, statusFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeFilterCount = [
    regionFilter,
    categoryFilter !== "ALL" ? categoryFilter : null,
    statusFilter !== "ALL" ? statusFilter : null,
  ].filter(Boolean).length;

  const selectedRegionReports = useMemo(
    () =>
      selectedRegion
        ? reports.filter((report) => report.wilayahTag.toLowerCase() === selectedRegion.toLowerCase())
        : [],
    [reports, selectedRegion]
  );

  const selectedRegionLast24Hours = useMemo(
    () =>
      selectedRegionReports
        .filter((report) => isWithinLastHours(report.rawTimestamp, 24))
        .sort((a, b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime()),
    [selectedRegionReports]
  );

  const selectedRegionFrequentReports = useMemo(
    () =>
      [...selectedRegionReports]
        .sort((a, b) => b.similarCount - a.similarCount)
        .slice(0, 5),
    [selectedRegionReports]
  );

  const selectedRegionStatusCounts = useMemo(
    () =>
      selectedRegionReports.reduce(
        (acc, report) => {
          acc[report.status] += 1;
          return acc;
        },
        { PENDING: 0, VERIFIED: 0, DISMISSED: 0 } as Record<Report["status"], number>
      ),
    [selectedRegionReports]
  );

  const reportStats = useMemo(() => {
    const categoryCounts = reports.reduce<Record<Report["category"], number>>(
      (acc, report) => {
        acc[report.category] = (acc[report.category] ?? 0) + 1;
        return acc;
      },
      { HOAKS: 0, PENIPUAN: 0, MISINFORMASI: 0 }
    );

    const statusCounts = reports.reduce<Record<Report["status"], number>>(
      (acc, report) => {
        acc[report.status] += 1;
        return acc;
      },
      { PENDING: 0, VERIFIED: 0, DISMISSED: 0 }
    );

    const topRegion = Object.entries(regionalCounts).sort((a, b) => b[1] - a[1])[0] ?? null;
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] ?? null;
    const repeatedReports = reports.filter((report) => report.similarCount > 1).length;

    return {
      total: reports.length,
      last24Hours: reports.filter((report) => isWithinLastHours(report.rawTimestamp, 24)).length,
      statusCounts,
      activeRegions: Object.keys(regionalCounts).length,
      topRegion,
      topCategory,
      repeatedReports,
    };
  }, [reports, regionalCounts]);

  const handleVerifyWithParams = async (
    clusterIds: string[],
    dasarVerifikasi: string,
    teksPeringatan: string
  ) => {
    const targetReport = reports.find((report) => report.id === clusterIds[0]);
    const resolvedDasar =
      dasarVerifikasi.trim() ||
      (targetReport ? createVerificationSummary(targetReport).map((item) => `- ${item}`).join("\n") : "");
    const resolvedWarning =
      teksPeringatan.trim() ||
      (targetReport
        ? `Laporan ${targetReport.category.toLowerCase()} di ${formatWilayah(targetReport.wilayahTag)} sudah divalidasi admin JagaWarga. Mohon jangan sebarkan tautan atau klaim serupa sebelum ada sumber resmi.`
        : "");

    setReports((prev) =>
      prev.map((r) =>
        clusterIds.includes(r.id) ? { ...r, status: "VERIFIED" as const, dasarVerifikasi: resolvedDasar, teksPeringatan: resolvedWarning } : r
      )
    );
    setSelectedReport((prev) =>
      prev && clusterIds.includes(prev.id) ? { ...prev, status: "VERIFIED", dasarVerifikasi: resolvedDasar, teksPeringatan: resolvedWarning } : prev
    );
    try {
      await Promise.all(
        clusterIds.map((id) =>
          fetch("/api/reports/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: Number(id), statusApproval: "disetujui", teksPeringatan: resolvedWarning }),
          })
        )
      );
      fetchReportsData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBroadcast = async (report: Report) => {
    const message = createBroadcastMessage(report);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(message);
      }
    } catch (error) {
      console.error("Failed to copy broadcast draft:", error);
    }
    setBroadcastedIds((prev) => {
      const next = new Set(prev);
      next.add(report.id);
      return next;
    });
    setBroadcastNotice(`Draft broadcast untuk ${formatWilayah(report.wilayahTag)} sudah dibuat dan disalin.`);
  };

  const handleDismiss = async (clusterIds: string[]) => {
    setReports((prev) =>
      prev.map((r) => (clusterIds.includes(r.id) ? { ...r, status: "DISMISSED" as const } : r))
    );
    setSelectedReport((prev) =>
      prev && clusterIds.includes(prev.id) ? { ...prev, status: "DISMISSED" } : prev
    );
    try {
      await Promise.all(
        clusterIds.map((id) =>
          fetch("/api/reports/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: Number(id), statusApproval: "ditolak" }),
          })
        )
      );
      fetchReportsData();
    } catch (e) {
      console.error(e);
    }
  };

  const paginationItems: (number | "…")[] = useMemo(() => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    const visible = pages.filter(
      (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
    );
    const result: (number | "…")[] = [];
    visible.forEach((p, idx) => {
      if (idx > 0 && p - (visible[idx - 1] as number) > 1) result.push("…");
      result.push(p);
    });
    return result;
  }, [totalPages, currentPage]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-semibold text-text-muted">Menghubungkan ke database...</span>
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
          onClick={fetchReportsData}
          className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-dark transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fade-up_0.4s_ease-out_both]">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Aduan Warga</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-text-primary">Statistik laporan</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-muted">
              Ringkasan volume laporan, validasi admin, wilayah aktif, dan pola laporan serupa.
            </p>
          </div>
          <button
            onClick={fetchReportsData}
            className="inline-flex w-fit items-center justify-center rounded-xl bg-black/[0.04] px-4 py-2 text-xs font-bold text-text-muted transition-all hover:bg-black/[0.08]"
          >
            Muat ulang data
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total laporan"
            value={reportStats.total}
            helper={`${reportStats.repeatedReports} laporan memiliki pola serupa.`}
          />
          <StatCard
            label="Laporan 24 jam"
            value={reportStats.last24Hours}
            helper="Laporan baru dalam rolling 24 jam terakhir."
            tone="text-primary"
          />
          <StatCard
            label="Menunggu admin"
            value={reportStats.statusCounts.PENDING}
            helper={`${reportStats.statusCounts.VERIFIED} valid · ${reportStats.statusCounts.DISMISSED} ditolak`}
            tone="text-amber-600"
          />
          <StatCard
            label="Wilayah aktif"
            value={reportStats.activeRegions}
            helper={
              reportStats.topRegion
                ? `${formatWilayah(reportStats.topRegion[0])} tertinggi (${reportStats.topRegion[1]})`
                : "Belum ada wilayah aktif."
            }
            tone="text-accent-blue"
          />
        </div>

        <div className="rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#fbfcfb] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Kategori terbanyak</p>
              <p className="mt-1 text-sm font-extrabold text-text-primary">
                {reportStats.topCategory ? reportStats.topCategory[0] : "-"}
              </p>
              <p className="mt-1 text-[11px] text-text-light">
                {reportStats.topCategory ? `${reportStats.topCategory[1]} laporan pada kategori ini.` : "Belum ada data kategori."}
              </p>
            </div>
            <div className="rounded-2xl bg-[#fbfcfb] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Rasio validasi</p>
              <p className="mt-1 text-sm font-extrabold text-text-primary">
                {reportStats.total > 0
                  ? `${Math.round((reportStats.statusCounts.VERIFIED / reportStats.total) * 100)}% tervalidasi`
                  : "0% tervalidasi"}
              </p>
              <p className="mt-1 text-[11px] text-text-light">
                Status admin dihitung dari seluruh laporan yang tampil.
              </p>
            </div>
            <div className="rounded-2xl bg-[#fbfcfb] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Fokus hari ini</p>
              <p className="mt-1 text-sm font-extrabold text-text-primary">
                {reportStats.last24Hours > 0 ? "Prioritaskan validasi baru" : "Tidak ada laporan baru"}
              </p>
              <p className="mt-1 text-[11px] text-text-light">
                Gunakan peta untuk zoom ke wilayah dan cek laporan 24 jam terakhir.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Card */}
      <div className="rounded-[24px] border border-black/[0.06] bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Peta Distribusi Laporan</h3>
            <p className="text-xs text-text-muted">
              Klik titik untuk zoom wilayah, lihat laporan 24 jam terakhir, dan validasi cepat.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
                {regionFilter && (
              <button
                onClick={() => {
                  setRegionFilter(null);
                  setSelectedRegion(null);
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
              >
                {formatWilayah(regionFilter)}
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <span className="text-xs text-text-muted font-medium">{reports.length} total laporan</span>
          </div>
        </div>
        <div className="relative w-full h-[340px] overflow-hidden rounded-2xl border border-black/[0.04] bg-[#fbfcfb]">
          <div id="leaflet-map" className="w-full h-full z-0 relative" />
        </div>
        {selectedRegion && (
          <div className="rounded-2xl border border-black/[0.06] bg-[#fbfcfb] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Analisis Wilayah</p>
                <h4 className="mt-1 text-base font-extrabold text-text-primary">{formatWilayah(selectedRegion)}</h4>
                <p className="mt-1 text-xs text-text-muted">
                  {selectedRegionReports.length} total laporan · {selectedRegionLast24Hours.length} laporan dalam 24 jam terakhir
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p className="text-[9px] font-bold uppercase text-text-muted">Pending</p>
                  <p className="text-lg font-extrabold text-amber-600">{selectedRegionStatusCounts.PENDING}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p className="text-[9px] font-bold uppercase text-text-muted">Valid</p>
                  <p className="text-lg font-extrabold text-primary">{selectedRegionStatusCounts.VERIFIED}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p className="text-[9px] font-bold uppercase text-text-muted">Ditolak</p>
                  <p className="text-lg font-extrabold text-text-muted">{selectedRegionStatusCounts.DISMISSED}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h5 className="text-xs font-extrabold text-text-primary">Laporan 24 Jam Terakhir</h5>
                <div className="mt-3 space-y-3">
                  {selectedRegionLast24Hours.slice(0, 4).map((report) => (
                    <div key={report.id} className="rounded-xl border border-black/[0.05] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <CategoryBadge cat={report.category} />
                            <StatusBadge status={report.status} />
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-muted">{report.message}</p>
                          <p className="mt-1 text-[10px] font-semibold text-text-light">{report.timestamp}</p>
                        </div>
                        <button
                          onClick={() => setSelectedReport({ ...report, clusterIds: [report.id], totalReporters: report.similarCount })}
                          className="rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-text-muted hover:bg-black/[0.08]"
                        >
                          Detail
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {report.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleVerifyWithParams((report as ClusteredReport).clusterIds ?? [report.id], report.dasarVerifikasi || "", report.teksPeringatan || "")}
                              className="rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/20"
                            >
                              Checklist Valid
                            </button>
                            <button
                              onClick={() => handleDismiss((report as ClusteredReport).clusterIds ?? [report.id])}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-100"
                            >
                              Tidak Valid
                            </button>
                          </>
                        )}
                        {report.status === "VERIFIED" && (
                          <button
                            onClick={() => handleBroadcast(report)}
                            className="rounded-lg bg-accent-blue/10 px-3 py-1.5 text-[10px] font-bold text-accent-blue hover:bg-accent-blue/20"
                          >
                            {broadcastedIds.has(report.id) ? "Draft Disalin" : "Broadcast"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedRegionLast24Hours.length === 0 && (
                    <p className="rounded-xl bg-black/[0.02] px-3 py-5 text-center text-xs text-text-muted">Belum ada laporan dalam 24 jam terakhir.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <h5 className="text-xs font-extrabold text-text-primary">Laporan yang Sering Dikirim</h5>
                  <div className="mt-3 space-y-2">
                    {selectedRegionFrequentReports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setSelectedReport({ ...report, clusterIds: [report.id], totalReporters: report.similarCount })}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/[0.05] px-3 py-2 text-left hover:bg-black/[0.02]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-text-primary">{report.message}</span>
                          <span className="text-[10px] text-text-muted">{report.category} · {report.timestamp}</span>
                        </span>
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold text-primary">
                          {report.similarCount}x
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <h5 className="text-xs font-extrabold text-text-primary">Bullet Report Otomatis</h5>
                  <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-muted">
                    <li>• Wilayah {formatWilayah(selectedRegion)} memiliki {selectedRegionReports.length} laporan aktif di daftar.</li>
                    <li>• Dalam 24 jam terakhir ada {selectedRegionLast24Hours.length} laporan yang masuk.</li>
                    <li>• Status admin: {selectedRegionStatusCounts.PENDING} pending, {selectedRegionStatusCounts.VERIFIED} valid, {selectedRegionStatusCounts.DISMISSED} ditolak.</li>
                    <li>• Top kategori: {selectedRegionFrequentReports[0]?.category ?? "-"} dengan laporan serupa tertinggi {selectedRegionFrequentReports[0]?.similarCount ?? 0}x.</li>
                  </ul>
                  {broadcastNotice && (
                    <p className="mt-3 rounded-xl bg-accent-blue/10 px-3 py-2 text-[11px] font-semibold text-accent-blue">
                      {broadcastNotice}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter + Table Card */}
      <div className="rounded-[24px] border border-black/[0.06] bg-white shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="px-4 sm:px-6 py-4 border-b border-black/[0.06] space-y-3">
          {/* Row 1: Category pills (scrollable on mobile) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(["ALL", "HOAKS", "PENIPUAN", "MISINFORMASI"] as CategoryFilter[]).map((cat) => {
              const active = categoryFilter === cat;
              const activeStyles =
                cat === "HOAKS"
                  ? "bg-red-600 text-white shadow-sm"
                  : cat === "PENIPUAN"
                  ? "bg-orange-500 text-white shadow-sm"
                  : cat === "MISINFORMASI"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-900 text-white shadow-sm";
              const inactiveStyles =
                cat === "HOAKS"
                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                  : cat === "PENIPUAN"
                  ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                  : cat === "MISINFORMASI"
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  : "bg-black/[0.04] text-text-muted hover:bg-black/[0.08]";
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat);
                    setCurrentPage(1);
                  }}
                  className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                    active ? activeStyles : inactiveStyles
                  }`}
                >
                  {cat === "ALL" ? "Semua" : cat}
                </button>
              );
            })}
          </div>

          {/* Row 2: Status + Sort selects */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
            <select
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value as SortKey);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="frequent">Paling Sering</option>
            </select>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setRegionFilter(null);
                  setSelectedRegion(null);
                  setCategoryFilter("ALL");
                  setStatusFilter("ALL");
                  setSortKey("newest");
                  setCurrentPage(1);
                }}
                className="ml-auto text-xs font-bold text-accent-red hover:underline"
              >
                Reset filter
              </button>
            )}
          </div>

          {/* Summary row */}
          <p className="text-xs text-text-muted">
            Menampilkan{" "}
            <strong className="text-text-primary">{filteredReports.length}</strong> dari{" "}
            <strong className="text-text-primary">{reports.length}</strong> laporan
            {regionFilter && (
              <>
                {" "}· Wilayah: <strong className="text-primary">{regionFilter}</strong>
              </>
            )}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b border-black/[0.06] text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <th className="px-4 sm:px-6 py-3">Sender</th>
                <th className="px-3 py-3">Kategori</th>
                <th className="px-3 py-3 hidden sm:table-cell">Wilayah</th>
                <th className="px-3 py-3">Isi Aduan</th>
                <th className="px-3 py-3 text-center hidden md:table-cell">Serupa</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 hidden lg:table-cell">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {paginatedReports.map((report) => (
                <tr
                  key={report.id}
                  onClick={() => setSelectedReport(report as ClusteredReport)}
                  className="cursor-pointer hover:bg-black/[0.02] transition-colors"
                >
                  <td className="px-4 sm:px-6 py-4 font-bold text-text-primary whitespace-nowrap">
                    {report.sender}
                  </td>
                  <td className="px-3 py-4">
                    <CategoryBadge cat={report.category} />
                  </td>
                  <td className="px-3 py-4 hidden sm:table-cell">
                    <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[9px] font-bold text-text-muted whitespace-nowrap">
                      {formatWilayah(report.wilayahTag)}
                    </span>
                  </td>
                  <td className="px-3 py-4 max-w-[140px] sm:max-w-[200px] truncate text-text-muted">
                    {report.message}
                  </td>
                  <td className="px-3 py-4 text-center hidden md:table-cell">
                    <span className="font-bold text-text-primary">{report.similarCount}x</span>
                    {(report as ClusteredReport).clusterIds?.length > 1 && (
                      <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                        {(report as ClusteredReport).clusterIds.length} laporan
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-3 py-4 text-text-muted whitespace-nowrap text-[10px] hidden lg:table-cell">
                    {report.timestamp}
                  </td>
                </tr>
              ))}
              {paginatedReports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-xs text-text-muted">
                    Tidak ada laporan yang sesuai dengan filter aktif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
                  <span key={`ell-${idx}`} className="px-1.5 text-xs text-text-muted">
                    …
                  </span>
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

      {/* Detail Modal — rendered into document.body via Portal to escape parent layout */}
      {selectedReport && mounted && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedReport(null); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div className="relative w-full max-w-3xl mx-6 bg-white rounded-[28px] shadow-2xl flex flex-col max-h-[92vh] animate-[fade-up_0.2s_ease-out_both]">

            {/* Modal Header */}
            <div className="flex items-start justify-between px-7 py-6 border-b border-black/[0.06] flex-shrink-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryBadge cat={selectedReport.category} />
                  <StatusBadge status={selectedReport.status} />
                  <span className="inline-flex items-center rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-semibold text-text-muted">
                    {formatWilayah(selectedReport.wilayahTag)}
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-text-primary">{selectedReport.sender}</h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {selectedReport.clusterIds?.length > 1
                      ? `${selectedReport.clusterIds.length} laporan dikelompokkan · ${selectedReport.totalReporters} pelapor`
                      : `ID #${selectedReport.id}`}
                    {" "}&nbsp;·&nbsp; {selectedReport.timestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="grid size-8 place-items-center rounded-full hover:bg-black/[0.06] transition-all text-text-muted ml-4 flex-shrink-0 mt-0.5 border border-black/[0.08]"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body — scrollable */}
            <div className="px-7 py-6 space-y-5 overflow-y-auto flex-1">
              {/* Isi Pesan */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Isi Pesan Aduan
                </p>
                <p className="text-sm text-text-muted leading-relaxed rounded-2xl bg-black/[0.02] border border-black/[0.05] p-4">
                  {selectedReport.message}
                </p>
              </div>

              {/* Auto summary */}
              <div className="rounded-2xl border border-black/[0.05] bg-black/[0.02] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Bullet Report Otomatis
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-text-muted">
                  {createVerificationSummary(selectedReport).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              {/* Dasar Verifikasi */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Dasar Verifikasi Admin
                </label>
                <textarea
                  value={selectedReport.dasarVerifikasi || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedReport((prev) =>
                      prev ? { ...prev, dasarVerifikasi: val } : null
                    );
                    setReports((prev) =>
                      prev.map((r) =>
                        r.id === selectedReport.id ? { ...r, dasarVerifikasi: val } : r
                      )
                    );
                  }}
                  className="block w-full rounded-2xl border border-black/10 px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 h-24 resize-none leading-relaxed"
                  placeholder="Kosongkan untuk memakai bullet report otomatis saat checklist valid."
                />
              </div>

              {/* Teks Peringatan */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Teks Peringatan WhatsApp
                </label>
                <textarea
                  value={selectedReport.teksPeringatan || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedReport((prev) =>
                      prev ? { ...prev, teksPeringatan: val } : null
                    );
                    setReports((prev) =>
                      prev.map((r) =>
                        r.id === selectedReport.id ? { ...r, teksPeringatan: val } : r
                      )
                    );
                  }}
                  className="block w-full rounded-2xl border border-black/10 px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 h-28 resize-none leading-relaxed"
                  placeholder="🚨 BAHAYA! Link ini terindikasi PENIPUAN. Jangan klik atau bagikan..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-7 py-5 border-t border-black/[0.06] bg-[#fbfcfb] flex-shrink-0 rounded-b-[28px]">
              {selectedReport.status === "PENDING" && (
                <>
                  <button
                    onClick={() =>
                      handleVerifyWithParams(
                        selectedReport.clusterIds ?? [selectedReport.id],
                        selectedReport.dasarVerifikasi || "",
                        selectedReport.teksPeringatan || ""
                      )
                    }
                    className="flex-1 rounded-2xl bg-primary text-white text-sm font-bold py-3 px-5 hover:bg-primary-dark transition-all shadow-sm cursor-pointer"
                  >
                    {selectedReport.clusterIds?.length > 1
                      ? `Validasi ${selectedReport.clusterIds.length} Laporan`
                      : "Checklist Valid"}
                  </button>
                  <button
                    onClick={() => handleDismiss(selectedReport.clusterIds ?? [selectedReport.id])}
                    className="rounded-2xl bg-red-50 text-red-600 text-sm font-bold py-3 px-5 hover:bg-red-100 transition-all cursor-pointer"
                  >
                    Tidak Valid
                  </button>
                </>
              )}
              {selectedReport.status === "VERIFIED" && (
                <button
                  onClick={() => handleBroadcast(selectedReport)}
                  className="rounded-2xl bg-accent-blue/10 text-accent-blue text-sm font-bold py-3 px-5 hover:bg-accent-blue/20 transition-all cursor-pointer"
                >
                  {broadcastedIds.has(selectedReport.id) ? "Broadcast Disalin" : "Broadcast"}
                </button>
              )}
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-2xl bg-black/[0.04] text-text-muted text-sm font-bold py-3 px-5 hover:bg-black/[0.08] transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
