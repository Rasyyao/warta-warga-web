"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import TAG_GPS_JSON from "@/app/lib/indonesia-coordinates.json";

const PAGE_SIZE = 10;
const COSINE_CLUSTER_THRESHOLD = 0.72;
const MIN_BROADCAST_REPORTERS = 5;
const COSINE_CLUSTER_THRESHOLD_PERCENT = Math.round(COSINE_CLUSTER_THRESHOLD * 100);

const INDONESIAN_STOPWORDS = new Set([
  "ada",
  "akan",
  "atau",
  "bagi",
  "bisa",
  "dalam",
  "dan",
  "dari",
  "di",
  "dengan",
  "ini",
  "itu",
  "jadi",
  "jangan",
  "ke",
  "kita",
  "melalui",
  "mohon",
  "pada",
  "untuk",
  "yang",
]);

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
  clusterReason: "modus_key" | "cosine" | "similar_text" | null;
}

interface ClusteredReport extends Report {
  clusterIds: string[];
  totalReporters: number;
  similarityScore: number | null;
}

interface VisualCluster extends ClusteredReport {
  members: Array<Report & { similarityToRepresentative: number | null }>;
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
  cluster_reason: "modus_key" | "cosine" | "similar_text" | null;
  timestamp: string;
  wilayah_tag: string;
  dasar_verifikasi: string | null;
  teks_peringatan: string | null;
}

type DashboardResponse =
  | {
      success: true;
      reports: DashboardReport[];
      broadcastedIds?: number[];
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

function ClusterReasonBadge({
  reason,
  score,
}: {
  reason: Report["clusterReason"];
  score?: number | null;
}) {
  if (!reason || reason === "modus_key") return null;
  if (reason === "cosine" && score != null && score < COSINE_CLUSTER_THRESHOLD_PERCENT) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 whitespace-nowrap">
        Review manual
      </span>
    );
  }
  const map = {
    cosine:       { bg: "bg-violet-100", text: "text-violet-700", label: "Cosine cocok" },
    similar_text: { bg: "bg-sky-100",    text: "text-sky-700",    label: "Teks Mirip" },
  } as const;
  const c = map[reason];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap ${c.bg} ${c.text}`}>
      <svg className="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
      {c.label}
    </span>
  );
}

function SimilarityBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const tone =
    score >= 88
      ? "bg-primary/10 text-primary"
      : score >= COSINE_CLUSTER_THRESHOLD_PERCENT
      ? "bg-violet-100 text-violet-700"
      : "bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap ${tone}`}>
      {score}% kemiripan teks
    </span>
  );
}

function SimilarityLevelBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  if (score >= 88) {
    return (
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
        Kuat
      </span>
    );
  }
  if (score >= COSINE_CLUSTER_THRESHOLD_PERCENT) {
    return (
      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700">
        Masuk batas
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
      Di bawah batas
    </span>
  );
}

function SimilarityMeter({ score }: { score: number | null | undefined }) {
  const value = score ?? 0;
  const width = score == null ? 0 : Math.max(8, Math.min(100, value));
  const bar =
    value >= 88
      ? "bg-primary"
      : value >= COSINE_CLUSTER_THRESHOLD_PERCENT
      ? "bg-accent-purple"
      : "bg-amber-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-10 text-right text-[10px] font-extrabold text-text-muted">
        {score == null ? "-" : `${score}%`}
      </span>
    </div>
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

function tokenizeMessage(text: string) {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " tautan ")
    .replace(/\b\d{3,}\b/g, " angka ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !INDONESIAN_STOPWORDS.has(token));
}

function toTermFrequency(text: string) {
  const terms = tokenizeMessage(text);
  return terms.reduce((acc, term) => {
    acc.set(term, (acc.get(term) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
}

function cosineSimilarity(a: string, b: string) {
  const left = toTermFrequency(a);
  const right = toTermFrequency(b);
  if (left.size === 0 || right.size === 0) return 0;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  left.forEach((value, term) => {
    leftMagnitude += value * value;
    dot += value * (right.get(term) ?? 0);
  });
  right.forEach((value) => {
    rightMagnitude += value * value;
  });

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function getBestSimilarity(report: Report, group: Report[]) {
  return group.reduce((best, candidate) => {
    const score = cosineSimilarity(report.message, candidate.message);
    return score > best ? score : best;
  }, 0);
}

function getAverageClusterSimilarity(group: Report[]) {
  if (group.length < 2) return null;
  let total = 0;
  let comparisons = 0;

  for (let i = 0; i < group.length; i += 1) {
    for (let j = i + 1; j < group.length; j += 1) {
      total += cosineSimilarity(group[i].message, group[j].message);
      comparisons += 1;
    }
  }

  return comparisons > 0 ? Math.round((total / comparisons) * 100) : null;
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

/** Preview teks broadcast yang akan dikirim bot ke grup WA — harus identik dengan formatPeringatan() di broadcast.js */
function formatBroadcastPreview(report: Report | ClusteredReport, totalReporters?: number) {
  const total = totalReporters ?? (report as ClusteredReport).totalReporters ?? report.similarCount;
  const lines = [
    `⚠️ *Peringatan Dini — ${formatWilayah(report.wilayahTag)}*`,
    "",
    report.teksPeringatan || report.message || "Ada laporan modus penipuan di daerah ini.",
  ];
  if (total > 1) {
    lines.push("", `📈 _${total} laporan serupa diterima di daerah ini._`);
  }
  lines.push(
    "",
    "*Tips aman:*",
    "• Bansos resmi *GRATIS* — tidak ada biaya/transfer/pulsa.",
    "• Jangan beri OTP/PIN/NIK/data pribadi ke siapa pun.",
    "• Cek hanya di cekbansos.kemensos.go.id atau tanya RT/pengurus.",
  );
  if (report.dasarVerifikasi) {
    lines.push("", `_Dasar tinjauan: ${report.dasarVerifikasi}_`);
  }
  lines.push("", "_Peringatan Warta Warga — disebar setelah ditinjau pengurus. Identitas pelapor tidak disimpan._");
  return lines.join("\n");
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ClusteredReport | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null);
  const [broadcastedIds, setBroadcastedIds] = useState<Set<string>>(() => new Set());
  const [broadcastingClusterId, setBroadcastingClusterId] = useState<string | null>(null);
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
                clusterReason: r.cluster_reason ?? null,
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
          // Seed broadcasted IDs from DB so button stays disabled after page reload
          if (dashboardData.broadcastedIds?.length) {
            setBroadcastedIds(new Set(dashboardData.broadcastedIds.map(String)));
          }
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

  // Group exact modus matches first, then use local cosine similarity as fallback.
  const clusteredReports = useMemo((): ClusteredReport[] => {
    const groups: Report[][] = [];
    const exactGroups = new Map<string, Report[]>();

    for (const r of reports) {
      const exactKey = r.modusKey ? `${r.modusKey}::${r.wilayahTag}::${r.category}` : null;
      const exactGroup = exactKey ? exactGroups.get(exactKey) : null;
      if (exactGroup) {
        exactGroup.push(r);
        continue;
      }

      let bestGroup: Report[] | null = null;
      let bestScore = 0;

      for (const group of groups) {
        const representative = group[0];
        const hasConflictingModus =
          Boolean(r.modusKey && representative.modusKey && r.modusKey !== representative.modusKey);
        if (
          hasConflictingModus ||
          representative.category !== r.category ||
          representative.wilayahTag.toLowerCase() !== r.wilayahTag.toLowerCase()
        ) {
          continue;
        }

        const score = getBestSimilarity(r, group);
        if (score > bestScore) {
          bestScore = score;
          bestGroup = group;
        }
      }

      if (bestGroup && bestScore >= COSINE_CLUSTER_THRESHOLD) {
        bestGroup.push({ ...r, clusterReason: r.clusterReason ?? "cosine" });
        if (exactKey) exactGroups.set(exactKey, bestGroup);
      } else {
        const newGroup = [r];
        groups.push(newGroup);
        if (exactKey) exactGroups.set(exactKey, newGroup);
      }
    }

    return groups.map((group): ClusteredReport => {
      const rep = group.reduce((best, r) => r.similarCount > best.similarCount ? r : best);
      const totalReporters = group.reduce((sum, r) => sum + r.similarCount, 0);
      // Cluster status: if any PENDING → PENDING; all VERIFIED → VERIFIED; else DISMISSED
      const hasPending = group.some(r => r.status === "PENDING");
      const allVerified = group.every(r => r.status === "VERIFIED");
      const clusterStatus: Report["status"] = hasPending ? "PENDING" : allVerified ? "VERIFIED" : "DISMISSED";
      // Prefer 'cosine' over 'similar_text' over null as the cluster reason label
      const clusterReason =
        group.find(r => r.clusterReason === "cosine")?.clusterReason ??
        group.find(r => r.clusterReason === "similar_text")?.clusterReason ??
        (group.length > 1 && !group.every((r) => r.modusKey && r.modusKey === group[0].modusKey) ? "cosine" : rep.clusterReason);
      return {
        ...rep,
        status: clusterStatus,
        similarCount: totalReporters,
        clusterIds: group.map(r => r.id),
        totalReporters,
        clusterReason,
        similarityScore: getAverageClusterSimilarity(group),
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

  const selectedRegionClusters = useMemo((): VisualCluster[] => {
    if (!selectedRegion) return [];
    return clusteredReports
      .filter((cluster) => cluster.wilayahTag.toLowerCase() === selectedRegion.toLowerCase())
      .map((cluster) => {
        const members = cluster.clusterIds
          .map((id) => reports.find((report) => report.id === id))
          .filter((report): report is Report => Boolean(report))
          .map((report) => ({
            ...report,
            similarityToRepresentative:
              report.id === cluster.id ? 100 : Math.round(cosineSimilarity(cluster.message, report.message) * 100),
          }))
          .sort((a, b) => (b.similarityToRepresentative ?? 0) - (a.similarityToRepresentative ?? 0));

        return {
          ...cluster,
          members,
        };
      })
      .sort((a, b) => {
        const groupedDelta = Number(b.clusterIds.length > 1) - Number(a.clusterIds.length > 1);
        if (groupedDelta !== 0) return groupedDelta;
        if ((b.similarityScore ?? 0) !== (a.similarityScore ?? 0)) {
          return (b.similarityScore ?? 0) - (a.similarityScore ?? 0);
        }
        return b.totalReporters - a.totalReporters;
      });
  }, [clusteredReports, reports, selectedRegion]);

  const selectedRegionClusterStats = useMemo(() => {
    const groupedClusters = selectedRegionClusters.filter((cluster) => cluster.clusterIds.length > 1);
    const cosineClusters = selectedRegionClusters.filter(
      (cluster) =>
        cluster.clusterReason === "cosine" &&
        (cluster.similarityScore ?? 0) >= COSINE_CLUSTER_THRESHOLD_PERCENT
    );
    const reviewClusters = selectedRegionClusters.filter(
      (cluster) => cluster.clusterIds.length > 1 && (cluster.similarityScore ?? 0) < COSINE_CLUSTER_THRESHOLD_PERCENT
    );
    const groupedReports = groupedClusters.reduce((sum, cluster) => sum + cluster.clusterIds.length, 0);
    const strongestScore = selectedRegionClusters.reduce(
      (best, cluster) => Math.max(best, cluster.similarityScore ?? 0),
      0
    );

    return {
      groupedClusters: groupedClusters.length,
      cosineClusters: cosineClusters.length,
      reviewClusters: reviewClusters.length,
      groupedReports,
      strongestScore,
    };
  }, [selectedRegionClusters]);

  const visualRegionClusters = useMemo(() => {
    const grouped = selectedRegionClusters.filter(
      (cluster) => cluster.clusterIds.length > 1 || cluster.clusterReason === "cosine"
    );
    return (grouped.length > 0 ? grouped : selectedRegionClusters).slice(0, 4);
  }, [selectedRegionClusters]);

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
    const cosineClusters = clusteredReports.filter(
      (report) =>
        report.clusterReason === "cosine" &&
        (report.similarityScore ?? 0) >= COSINE_CLUSTER_THRESHOLD_PERCENT
    ).length;

    return {
      total: reports.length,
      last24Hours: reports.filter((report) => isWithinLastHours(report.rawTimestamp, 24)).length,
      statusCounts,
      activeRegions: Object.keys(regionalCounts).length,
      topRegion,
      topCategory,
      repeatedReports,
      cosineClusters,
    };
  }, [clusteredReports, reports, regionalCounts]);

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
    setBroadcastingClusterId(report.id);
    try {
      const clustered = report as ClusteredReport;
      const resp = await fetch("/api/reports/broadcast-cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: (clustered.clusterIds ?? [report.id]).map(Number),
          wilayahTag: report.wilayahTag,
          teksPeringatan: report.teksPeringatan || "",
          kategori: report.category,
          total: clustered.totalReporters ?? report.similarCount,
          deskripsi: report.message,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setBroadcastedIds((prev) => {
          const next = new Set(prev);
          next.add(report.id);
          return next;
        });
        setBroadcastNotice(data.message || `✅ Broadcast untuk ${formatWilayah(report.wilayahTag)} berhasil dikirim.`);
        fetchReportsData();
      } else {
        setBroadcastNotice(`Gagal: ${data.error || "unknown error"}`);
      }
    } catch {
      setBroadcastNotice("Gagal menghubungi server. Coba lagi.");
    } finally {
      setBroadcastingClusterId(null);
    }
  };

  const handleBroadcastCluster = async (cluster: ClusteredReport) => {
    setBroadcastingClusterId(cluster.id);
    try {
      const resp = await fetch("/api/reports/broadcast-cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: cluster.clusterIds.map(Number),
          wilayahTag: cluster.wilayahTag,
          teksPeringatan: cluster.teksPeringatan || "",
          kategori: cluster.category,
          total: cluster.totalReporters,
          deskripsi: cluster.message,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setBroadcastNotice(
          data.message ||
          `✅ ${data.approved ?? cluster.clusterIds.length} laporan disetujui. Bot akan generate poster & broadcast ke grup dalam ≤5 menit.`
        );
        fetchReportsData();
      } else {
        setBroadcastNotice(`Gagal: ${data.error || "unknown error"}`);
      }
    } catch {
      setBroadcastNotice("Gagal menghubungi server. Coba lagi.");
    } finally {
      setBroadcastingClusterId(null);
    }
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
          <StatCard
            label="Klaster cosine"
            value={reportStats.cosineClusters}
            helper={`Batas gabung otomatis ${COSINE_CLUSTER_THRESHOLD_PERCENT}% kemiripan teks.`}
            tone="text-accent-purple"
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
                {reportStats.cosineClusters > 0 ? "Cek klaster cosine" : reportStats.last24Hours > 0 ? "Prioritaskan validasi baru" : "Tidak ada laporan baru"}
              </p>
              <p className="mt-1 text-[11px] text-text-light">
                Gunakan label kemiripan untuk melihat laporan yang digabung dari isi pesan.
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

            <div className="mt-5 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h5 className="text-xs font-extrabold text-text-primary">Visual Klaster Kemiripan</h5>
                  <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-text-muted">
                    Persentase adalah kemiripan teks antar laporan, bukan confidence model. Laporan otomatis digabung oleh cosine hanya jika rata-rata kemiripan mencapai {COSINE_CLUSTER_THRESHOLD_PERCENT}% atau lebih.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-[#fbfcfb] px-3 py-2">
                    <p className="text-[9px] font-bold uppercase text-text-muted">Klaster</p>
                    <p className="text-base font-extrabold text-text-primary">{selectedRegionClusterStats.groupedClusters}</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase text-violet-500">Lolos batas</p>
                    <p className="text-base font-extrabold text-violet-700">{selectedRegionClusterStats.cosineClusters}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase text-amber-600">Review</p>
                    <p className="text-base font-extrabold text-amber-700">
                      {selectedRegionClusterStats.reviewClusters}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {visualRegionClusters.map((cluster, clusterIndex) => (
                  <button
                    key={cluster.id}
                    onClick={() => setSelectedReport(cluster)}
                    className="group flex h-full flex-col rounded-2xl border border-black/[0.06] bg-[#fbfcfb] p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/[0.03] focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="grid size-6 place-items-center rounded-full bg-text-primary text-[10px] font-extrabold text-white">
                            {clusterIndex + 1}
                          </span>
                          <CategoryBadge cat={cluster.category} />
                          <ClusterReasonBadge reason={cluster.clusterReason} score={cluster.similarityScore} />
                          <SimilarityBadge score={cluster.similarityScore} />
                          <SimilarityLevelBadge score={cluster.similarityScore} />
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-extrabold leading-snug text-text-primary">
                          {cluster.message}
                        </p>
                      </div>
                      <div className="flex-shrink-0 rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                        <p className="text-[9px] font-bold uppercase text-text-muted">Pelapor</p>
                        <p className="text-lg font-extrabold text-primary">{cluster.totalReporters}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Rata-rata kemiripan teks
                        </span>
                        <span className="text-[10px] font-semibold text-text-light">
                          Batas gabung otomatis {COSINE_CLUSTER_THRESHOLD_PERCENT}%
                        </span>
                      </div>
                      <SimilarityMeter score={cluster.similarityScore} />
                      {(cluster.similarityScore ?? 0) < COSINE_CLUSTER_THRESHOLD_PERCENT && (
                        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold leading-relaxed text-amber-700">
                          Skor ini belum cukup untuk digabung otomatis oleh cosine. Cocokkan manual sebelum broadcast.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      {cluster.members.slice(0, 4).map((member, memberIndex) => (
                        <div key={member.id} className="flex gap-3 rounded-xl border border-black/[0.04] bg-white px-3 py-2">
                          <div className="flex flex-col items-center">
                            <span
                              className={`mt-1 size-2.5 rounded-full ${
                                memberIndex === 0 ? "bg-text-primary" : "bg-accent-purple"
                              }`}
                            />
                            {memberIndex < Math.min(cluster.members.length, 4) - 1 && (
                              <span className="mt-1 h-full min-h-5 w-px bg-black/[0.08]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-[10px] font-bold text-text-primary">
                                {memberIndex === 0 ? "Laporan acuan" : `Laporan serupa #${memberIndex}`}
                              </span>
                              {member.similarityToRepresentative != null && (
                                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-extrabold text-violet-700">
                                  {member.similarityToRepresentative}%
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-muted">
                              {member.message}
                            </p>
                          </div>
                        </div>
                      ))}
                      {cluster.members.length > 4 && (
                        <p className="text-[10px] font-semibold text-text-light">
                          +{cluster.members.length - 4} laporan lain dalam klaster ini.
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {visualRegionClusters.length === 0 && (
                <p className="mt-4 rounded-xl bg-black/[0.02] px-3 py-5 text-center text-xs text-text-muted">
                  Belum ada klaster kemiripan untuk wilayah ini.
                </p>
              )}
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

        {/* Mobile Cards */}
        <div className="divide-y divide-black/[0.04] md:hidden">
          {paginatedReports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="block w-full px-4 py-4 text-left transition-colors hover:bg-black/[0.02] focus:bg-black/[0.02] focus:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-text-primary">{report.sender}</p>
                  <p className="mt-1 text-[10px] font-semibold text-text-light">{report.timestamp}</p>
                </div>
                <StatusBadge status={report.status} />
              </div>
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-text-muted">{report.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CategoryBadge cat={report.category} />
                <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[9px] font-bold text-text-muted">
                  {formatWilayah(report.wilayahTag)}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                  {report.similarCount} pelapor
                </span>
                <ClusterReasonBadge reason={report.clusterReason} score={report.similarityScore} />
                <SimilarityBadge score={report.similarityScore} />
              </div>
            </button>
          ))}
          {paginatedReports.length === 0 && (
            <div className="px-6 py-14 text-center text-xs text-text-muted">
              Tidak ada laporan yang sesuai dengan filter aktif.
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <th className="px-4 sm:px-6 py-3">Sender</th>
                <th className="px-3 py-3">Kategori</th>
                <th className="px-3 py-3">Wilayah</th>
                <th className="px-3 py-3">Isi Aduan</th>
                <th className="px-3 py-3 text-center">Kemiripan</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Tanggal</th>
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
                  <td className="px-3 py-4">
                    <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[9px] font-bold text-text-muted whitespace-nowrap">
                      {formatWilayah(report.wilayahTag)}
                    </span>
                  </td>
                  <td className="px-3 py-4 max-w-[260px] truncate text-text-muted">
                    {report.message}
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span className="font-bold text-text-primary">{report.similarCount}x</span>
                    {(report as ClusteredReport).clusterIds?.length > 1 && (
                      <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                        {(report as ClusteredReport).clusterIds.length} laporan
                      </span>
                    )}
                    <div className="mt-1 flex justify-center gap-1">
                      <ClusterReasonBadge reason={report.clusterReason} score={report.similarityScore} />
                      <SimilarityBadge score={report.similarityScore} />
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-3 py-4 text-text-muted whitespace-nowrap text-[10px]">
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
          <div className="relative mx-3 flex max-h-[92vh] w-full max-w-3xl flex-col rounded-[28px] bg-white shadow-2xl animate-[fade-up_0.2s_ease-out_both] sm:mx-6">

            {/* Modal Header */}
            <div className="flex flex-shrink-0 items-start justify-between border-b border-black/[0.06] px-4 py-5 sm:px-7 sm:py-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryBadge cat={selectedReport.category} />
                  <StatusBadge status={selectedReport.status} />
                  <span className="inline-flex items-center rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-semibold text-text-muted">
                    {formatWilayah(selectedReport.wilayahTag)}
                  </span>
                  {selectedReport.similarCount > 1 && (
                    <ClusterReasonBadge reason={selectedReport.clusterReason} score={selectedReport.similarityScore} />
                  )}
                  <SimilarityBadge score={selectedReport.similarityScore} />
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
            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
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

              {broadcastNotice && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-semibold text-amber-800">
                  {broadcastNotice}
                </div>
              )}

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
                  placeholder="Bahaya: link ini terindikasi penipuan. Jangan klik atau bagikan."
                />
              </div>

              {/* Preview broadcast untuk PENIPUAN/MISINFORMASI */}
              {(selectedReport.category === "PENIPUAN" || selectedReport.category === "MISINFORMASI") && (
                <details className="rounded-2xl border border-black/[0.06] overflow-hidden">
                  <summary className="cursor-pointer select-none px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:bg-black/[0.02] transition-colors">
                    Pratinjau teks broadcast ke WhatsApp
                  </summary>
                  <div className="border-t border-black/[0.06] bg-black/[0.01] px-4 pb-4 pt-3">
                    <p className="mb-2 text-[10px] text-text-light">Ini persis isi pesan yang akan dikirim bot ke grup WhatsApp wilayah terkait:</p>
                    <pre className="whitespace-pre-wrap rounded-xl bg-white border border-black/[0.06] p-3 text-[11px] leading-relaxed text-text-muted font-sans">
                      {formatBroadcastPreview(selectedReport, selectedReport.totalReporters)}
                    </pre>
                  </div>
                </details>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-shrink-0 flex-col gap-3 rounded-b-[28px] border-t border-black/[0.06] bg-[#fbfcfb] px-4 py-4 sm:flex-row sm:px-7 sm:py-5">
              {selectedReport.status === "PENDING" && (
                <>
                  {(selectedReport.category === "PENIPUAN" || selectedReport.category === "MISINFORMASI") && (() => {
                    const alreadyBroadcasted = selectedReport.clusterIds?.some((cid) => broadcastedIds.has(cid)) ?? broadcastedIds.has(selectedReport.id);
                    if (alreadyBroadcasted) {
                      return (
                        <button disabled className="flex-1 rounded-2xl bg-gray-100 text-gray-400 text-sm font-bold py-3 px-5 cursor-not-allowed">
                          ✅ Sudah Disiarkan
                        </button>
                      );
                    }
                    return selectedReport.totalReporters >= MIN_BROADCAST_REPORTERS ? (
                      <button
                        onClick={() => handleBroadcastCluster(selectedReport)}
                        disabled={broadcastingClusterId === selectedReport.id}
                        className="flex-1 rounded-2xl bg-amber-500 text-white text-sm font-bold py-3 px-5 hover:bg-amber-600 transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {broadcastingClusterId === selectedReport.id
                          ? "Mengirim broadcast..."
                          : `Validasi & broadcast (${selectedReport.totalReporters} pelapor)`}
                      </button>
                    ) : (
                      <div className="flex-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                        <span className="font-bold">Belum cukup pelapor.</span>{" "}
                        Kategori {selectedReport.category} butuh minimal {MIN_BROADCAST_REPORTERS} pelapor sebelum dapat dibroadcast.{" "}
                        Saat ini <strong>{selectedReport.totalReporters}</strong> pelapor
                        {" "}({MIN_BROADCAST_REPORTERS - selectedReport.totalReporters} lagi dibutuhkan).
                      </div>
                    );
                  })()}
                  <button
                    onClick={() =>
                      handleVerifyWithParams(
                        selectedReport.clusterIds ?? [selectedReport.id],
                        selectedReport.dasarVerifikasi || "",
                        selectedReport.teksPeringatan || ""
                      )
                    }
                    className="rounded-2xl bg-primary text-white text-sm font-bold py-3 px-5 hover:bg-primary-dark transition-all shadow-sm cursor-pointer"
                  >
                    {selectedReport.clusterIds?.length > 1
                      ? `Validasi ${selectedReport.clusterIds.length} laporan`
                      : "Tandai valid"}
                  </button>
                  <button
                    onClick={() => handleDismiss(selectedReport.clusterIds ?? [selectedReport.id])}
                    className="rounded-2xl bg-red-50 text-red-600 text-sm font-bold py-3 px-5 hover:bg-red-100 transition-all cursor-pointer"
                  >
                    Tolak laporan
                  </button>
                </>
              )}
              {selectedReport.status === "VERIFIED" && (() => {
                const alreadyBroadcasted = broadcastedIds.has(selectedReport.id);
                return (
                  <button
                    onClick={() => !alreadyBroadcasted && handleBroadcast(selectedReport)}
                    disabled={alreadyBroadcasted || broadcastingClusterId === selectedReport.id}
                    className={`rounded-2xl text-sm font-bold py-3 px-5 transition-all ${
                      alreadyBroadcasted
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    }`}
                  >
                    {broadcastingClusterId === selectedReport.id
                      ? "Mengirim broadcast..."
                      : alreadyBroadcasted
                      ? "✅ Sudah Disiarkan"
                      : "Kirim Broadcast"}
                  </button>
                );
              })()}
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
