"use client";

import { useState, useEffect, useCallback } from "react";

interface SumberCrawl {
  id: number;
  url: string;
  wilayah: string | null;
  crawl: number;
  aktif: number;
}

interface SourcesWhitelist {
  id: number;
  pattern: string;
  aktif: number;
}

type Tab = "crawl" | "whitelist";

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

function StatusBadge({ aktif }: { aktif: number }) {
  return aktif === 1 ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      Nonaktif
    </span>
  );
}

function CrawlBadge({ crawl }: { crawl: number }) {
  return crawl === 1 ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      Sudah
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Belum
    </span>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl animate-[fade-up_0.2s_ease-out_both]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-text-primary">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
          </div>
          <button onClick={onClose} className="grid size-8 flex-shrink-0 place-items-center rounded-full border border-black/[0.08] text-text-muted hover:bg-black/[0.05] transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Edit modal for SumberCrawl ───────────────────────────────────────────────
function EditCrawlModal({
  item,
  onClose,
  onSaved,
}: {
  item: SumberCrawl;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState(item.url);
  const [wilayah, setWilayah] = useState(item.wilayah ?? "");
  const [aktif, setAktif] = useState(item.aktif);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/rag/sumber-crawl/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), wilayah: wilayah.trim() || null, aktif }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
        onClose();
      } else {
        setError(data.error ?? "Gagal menyimpan.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">Edit Sumber Crawl</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-text-muted hover:bg-black/[0.05] transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">URL Sumber</label>
            <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
              className="block w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Wilayah <span className="normal-case font-normal">(opsional)</span></label>
            <input type="text" value={wilayah} onChange={(e) => setWilayah(e.target.value)}
              placeholder="Contoh: jawa_barat, nasional"
              className="block w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Status</label>
            <select value={aktif} onChange={(e) => setAktif(Number(e.target.value))}
              className="block w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20">
              <option value={1}>Aktif</option>
              <option value={0}>Nonaktif</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-black/10 py-2.5 text-xs font-semibold text-text-muted hover:bg-black/[0.03] transition-colors">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-60">
              {saving && <Spinner />}
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit modal for SourcesWhitelist ─────────────────────────────────────────
function EditWhitelistModal({
  item,
  onClose,
  onSaved,
}: {
  item: SourcesWhitelist;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pattern, setPattern] = useState(item.pattern);
  const [aktif, setAktif] = useState(item.aktif);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/rag/sources-whitelist/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: pattern.trim(), aktif }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
        onClose();
      } else {
        setError(data.error ?? "Gagal menyimpan.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">Edit Whitelist Sumber</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-text-muted hover:bg-black/[0.05] transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Pattern URL / Domain</label>
            <input type="text" required value={pattern} onChange={(e) => setPattern(e.target.value)}
              placeholder="Contoh: *.go.id, kominfo.go.id"
              className="block w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Status</label>
            <select value={aktif} onChange={(e) => setAktif(Number(e.target.value))}
              className="block w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20">
              <option value={1}>Aktif</option>
              <option value={0}>Nonaktif</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-black/10 py-2.5 text-xs font-semibold text-text-muted hover:bg-black/[0.03] transition-colors">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-60">
              {saving && <Spinner />}
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteModal({
  label,
  onClose,
  onConfirm,
}: {
  label: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[20px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="mb-1 text-sm font-bold text-text-primary">Hapus Data</h3>
        <p className="mb-5 text-xs text-text-muted">Yakin ingin menghapus <span className="font-semibold text-text-primary">{label}</span>? Tindakan ini tidak bisa dibatalkan.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-black/10 py-2.5 text-xs font-semibold text-text-muted hover:bg-black/[0.03] transition-colors">
            Batal
          </button>
          <button onClick={handleConfirm} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-xs font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-60">
            {deleting && <Spinner />}
            {deleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RagPage() {
  const [activeTab, setActiveTab] = useState<Tab>("crawl");

  // sumber_crawl state
  const [crawlList, setCrawlList] = useState<SumberCrawl[]>([]);
  const [crawlLoading, setCrawlLoading] = useState(true);
  const [newCrawlUrl, setNewCrawlUrl] = useState("");
  const [newCrawlWilayah, setNewCrawlWilayah] = useState("");
  const [crawlAdding, setCrawlAdding] = useState(false);
  const [crawlAddError, setCrawlAddError] = useState("");
  const [editingCrawl, setEditingCrawl] = useState<SumberCrawl | null>(null);
  const [deletingCrawl, setDeletingCrawl] = useState<SumberCrawl | null>(null);
  const [showAddCrawlModal, setShowAddCrawlModal] = useState(false);

  // sources_whitelist state
  const [whitelistList, setWhitelistList] = useState<SourcesWhitelist[]>([]);
  const [whitelistLoading, setWhitelistLoading] = useState(true);
  const [newPattern, setNewPattern] = useState("");
  const [whitelistAdding, setWhitelistAdding] = useState(false);
  const [whitelistAddError, setWhitelistAddError] = useState("");
  const [editingWhitelist, setEditingWhitelist] = useState<SourcesWhitelist | null>(null);
  const [deletingWhitelist, setDeletingWhitelist] = useState<SourcesWhitelist | null>(null);
  const [showAddWhitelistModal, setShowAddWhitelistModal] = useState(false);

  const fetchCrawl = useCallback(async () => {
    setCrawlLoading(true);
    try {
      const res = await fetch("/api/rag/sumber-crawl");
      const data = await res.json();
      if (data.success) setCrawlList(data.data);
    } catch {
      // silent
    } finally {
      setCrawlLoading(false);
    }
  }, []);

  const fetchWhitelist = useCallback(async () => {
    setWhitelistLoading(true);
    try {
      const res = await fetch("/api/rag/sources-whitelist");
      const data = await res.json();
      if (data.success) setWhitelistList(data.data);
    } catch {
      // silent
    } finally {
      setWhitelistLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchCrawl();
      fetchWhitelist();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCrawl, fetchWhitelist]);

  const handleAddCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrawlUrl.trim()) return;
    setCrawlAdding(true);
    setCrawlAddError("");
    try {
      const res = await fetch("/api/rag/sumber-crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newCrawlUrl.trim(), wilayah: newCrawlWilayah.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCrawlUrl("");
        setNewCrawlWilayah("");
        setShowAddCrawlModal(false);
        fetchCrawl();
      } else {
        setCrawlAddError(data.error ?? "Gagal menambah.");
      }
    } catch {
      setCrawlAddError("Terjadi kesalahan jaringan.");
    } finally {
      setCrawlAdding(false);
    }
  };

  const handleDeleteCrawl = async () => {
    if (!deletingCrawl) return;
    const res = await fetch(`/api/rag/sumber-crawl/${deletingCrawl.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setDeletingCrawl(null);
      fetchCrawl();
    }
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPattern.trim()) return;
    setWhitelistAdding(true);
    setWhitelistAddError("");
    try {
      const res = await fetch("/api/rag/sources-whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: newPattern.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewPattern("");
        setShowAddWhitelistModal(false);
        fetchWhitelist();
      } else {
        setWhitelistAddError(data.error ?? "Gagal menambah.");
      }
    } catch {
      setWhitelistAddError("Terjadi kesalahan jaringan.");
    } finally {
      setWhitelistAdding(false);
    }
  };

  const handleDeleteWhitelist = async () => {
    if (!deletingWhitelist) return;
    const res = await fetch(`/api/rag/sources-whitelist/${deletingWhitelist.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setDeletingWhitelist(null);
      fetchWhitelist();
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "crawl", label: "Sumber Crawl", count: crawlList.length },
    { key: "whitelist", label: "Whitelist Domain", count: whitelistList.length },
  ];
  const crawlActiveCount = crawlList.filter((item) => item.aktif === 1).length;
  const crawlDoneCount = crawlList.filter((item) => item.crawl === 1).length;
  const crawlPendingCount = crawlList.length - crawlDoneCount;
  const whitelistActiveCount = whitelistList.filter((item) => item.aktif === 1).length;
  const whitelistInactiveCount = whitelistList.length - whitelistActiveCount;

  return (
    <>
      {/* Modals */}
      {editingCrawl && (
        <EditCrawlModal item={editingCrawl} onClose={() => setEditingCrawl(null)} onSaved={fetchCrawl} />
      )}
      {deletingCrawl && (
        <DeleteModal
          label={deletingCrawl.url}
          onClose={() => setDeletingCrawl(null)}
          onConfirm={handleDeleteCrawl}
        />
      )}
      {editingWhitelist && (
        <EditWhitelistModal item={editingWhitelist} onClose={() => setEditingWhitelist(null)} onSaved={fetchWhitelist} />
      )}
      {deletingWhitelist && (
        <DeleteModal
          label={deletingWhitelist.pattern}
          onClose={() => setDeletingWhitelist(null)}
          onConfirm={handleDeleteWhitelist}
        />
      )}
      {showAddCrawlModal && (
        <ModalShell
          title="Tambah Sumber Crawl"
          description="Masukkan URL sumber data yang akan dipantau dan dicrawl oleh agent."
          onClose={() => setShowAddCrawlModal(false)}
        >
          {crawlAddError && (
            <div className="mb-4 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-600">{crawlAddError}</div>
          )}
          <form onSubmit={handleAddCrawl} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">URL Sumber *</label>
              <input
                type="url"
                required
                value={newCrawlUrl}
                onChange={(e) => setNewCrawlUrl(e.target.value)}
                placeholder="https://kominfo.go.id/..."
                className="block w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Wilayah <span className="normal-case font-normal text-text-light">(opsional)</span>
              </label>
              <input
                type="text"
                value={newCrawlWilayah}
                onChange={(e) => setNewCrawlWilayah(e.target.value)}
                placeholder="nasional / jawa_barat"
                className="block w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddCrawlModal(false)} className="flex-1 rounded-xl border border-black/10 py-2.5 text-xs font-semibold text-text-muted hover:bg-black/[0.03] transition-colors">
                Batal
              </button>
              <button
                type="submit"
                disabled={crawlAdding}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {crawlAdding && <Spinner />}
                {crawlAdding ? "Menambahkan..." : "Tambah Sumber"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
      {showAddWhitelistModal && (
        <ModalShell
          title="Tambah Whitelist Domain"
          description="Tambahkan domain atau pattern URL yang dipercaya sebagai sumber resmi."
          onClose={() => setShowAddWhitelistModal(false)}
        >
          {whitelistAddError && (
            <div className="mb-4 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-600">{whitelistAddError}</div>
          )}
          <form onSubmit={handleAddWhitelist} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">Pattern URL / Domain *</label>
              <input
                type="text"
                required
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="*.go.id / kominfo.go.id"
                className="block w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
              <p className="mt-1.5 text-[10px] text-text-light">Gunakan * sebagai wildcard, contoh: *.go.id</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddWhitelistModal(false)} className="flex-1 rounded-xl border border-black/10 py-2.5 text-xs font-semibold text-text-muted hover:bg-black/[0.03] transition-colors">
                Batal
              </button>
              <button
                type="submit"
                disabled={whitelistAdding}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {whitelistAdding && <Spinner />}
                {whitelistAdding ? "Menambahkan..." : "Tambah Pattern"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      <div className="space-y-6 animate-[fade-up_0.4s_ease-out_both]">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">RAG Database</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-text-primary">Manajemen sumber data</h2>
            <p className="mt-1 text-sm text-text-muted">Kelola sumber crawl dan whitelist domain yang dipercaya agent.</p>
          </div>
          <button
            onClick={() => {
              setCrawlAddError("");
              setWhitelistAddError("");
              if (activeTab === "crawl") setShowAddCrawlModal(true);
              else setShowAddWhitelistModal(true);
            }}
            className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-dark transition-all"
          >
            {activeTab === "crawl" ? "Tambah Sumber Crawl" : "Tambah Whitelist"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Sumber crawl" value={crawlList.length} helper="Total URL sumber data." />
          <StatCard label="Sudah dicrawl" value={crawlDoneCount} helper={`${crawlPendingCount} sumber menunggu.`} tone="text-accent-blue" />
          <StatCard label="Crawl aktif" value={crawlActiveCount} helper="Sumber aktif dipakai agent." tone="text-primary" />
          <StatCard label="Whitelist" value={whitelistList.length} helper="Total pattern dipercaya." />
          <StatCard label="Whitelist aktif" value={whitelistActiveCount} helper={`${whitelistInactiveCount} pattern nonaktif.`} tone="text-primary" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-[14px] bg-black/[0.04] p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-[10px] px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-black/[0.06] text-text-muted"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tab: Sumber Crawl ── */}
        {activeTab === "crawl" && (
          <div>
            {/* Table */}
            <div className="rounded-[20px] border border-black/[0.06] bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Daftar Sumber Crawl</h3>
                  <p className="text-[11px] text-text-muted mt-0.5">{crawlList.length} sumber terdaftar</p>
                </div>
                <button onClick={fetchCrawl} className="rounded-lg p-1.5 text-text-muted hover:bg-black/[0.05] transition-colors" title="Refresh">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {crawlLoading ? (
                <div className="flex min-h-[200px] items-center justify-center gap-2 text-text-muted">
                  <Spinner />
                  <span className="text-xs">Memuat data...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-black/[0.06] text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        <th className="pb-3 pr-3">URL</th>
                        <th className="pb-3 pr-3">Wilayah</th>
                        <th className="pb-3 pr-3">Crawl</th>
                        <th className="pb-3 pr-3">Status</th>
                        <th className="pb-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04]">
                      {crawlList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-xs text-text-muted">
                            Belum ada sumber crawl terdaftar.
                          </td>
                        </tr>
                      ) : (
                        crawlList.map((item) => (
                          <tr key={item.id} className="group">
                            <td className="py-3.5 pr-3 font-medium text-text-primary">
                              <span className="block max-w-[200px] truncate" title={item.url}>{item.url}</span>
                            </td>
                            <td className="py-3.5 pr-3 text-text-muted">
                              {item.wilayah ? (
                                <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold">{item.wilayah}</span>
                              ) : (
                                <span className="text-text-light">—</span>
                              )}
                            </td>
                            <td className="py-3.5 pr-3">
                              <CrawlBadge crawl={item.crawl} />
                            </td>
                            <td className="py-3.5 pr-3">
                              <StatusBadge aktif={item.aktif} />
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditingCrawl(item)}
                                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setDeletingCrawl(item)}
                                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Whitelist Domain ── */}
        {activeTab === "whitelist" && (
          <div>
            {/* Table */}
            <div className="rounded-[20px] border border-black/[0.06] bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Daftar Whitelist Domain</h3>
                  <p className="text-[11px] text-text-muted mt-0.5">{whitelistList.length} pattern terdaftar</p>
                </div>
                <button onClick={fetchWhitelist} className="rounded-lg p-1.5 text-text-muted hover:bg-black/[0.05] transition-colors" title="Refresh">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {whitelistLoading ? (
                <div className="flex min-h-[200px] items-center justify-center gap-2 text-text-muted">
                  <Spinner />
                  <span className="text-xs">Memuat data...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-black/[0.06] text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        <th className="pb-3 pr-3">#</th>
                        <th className="pb-3 pr-3">Pattern Domain</th>
                        <th className="pb-3 pr-3">Status</th>
                        <th className="pb-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04]">
                      {whitelistList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-xs text-text-muted">
                            Belum ada whitelist domain terdaftar.
                          </td>
                        </tr>
                      ) : (
                        whitelistList.map((item) => (
                          <tr key={item.id} className="group">
                            <td className="py-3.5 pr-3 text-text-light font-mono text-[10px]">{item.id}</td>
                            <td className="py-3.5 pr-3 font-semibold text-text-primary font-mono">{item.pattern}</td>
                            <td className="py-3.5 pr-3">
                              <StatusBadge aktif={item.aktif} />
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditingWhitelist(item)}
                                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setDeletingWhitelist(item)}
                                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
