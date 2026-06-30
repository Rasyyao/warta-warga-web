import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";


const navLinks = [
  { label: "Fitur", href: "#fitur" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Agent", href: "#agent" },
  { label: "Tentang", href: "#tentang" },
];

const stats = [
  { value: "10.000+", label: "Pesan diproses" },
  { value: "94%", label: "Akurasi deteksi hoaks" },
  { value: "4 Agent", label: "AI pipeline aktif" },
  { value: "<3 detik", label: "Rata-rata respons" },
];

const features = [
  {
    icon: "whatsapp",
    tone: "bg-primary",
    title: "Untuk masyarakat umum",
    desc: "Hubungkan WhatsApp ke database verifikasi tepercaya, termasuk Komdigi TrustPositif (https://trustpositif.komdigi.go.id/) untuk deteksi instan.",
    visual: "chat",
  },
  {
    icon: "users",
    tone: "bg-accent-purple",
    title: "Untuk komunitas & RT/RW",
    desc: "Laporkan masalah infrastruktur dan layanan publik secara kolektif dengan verifikasi AI.",
    visual: "cluster",
  },
  {
    icon: "building",
    tone: "bg-accent-blue",
    title: "Untuk pemerintah daerah",
    desc: "Terima laporan terklaster berdasarkan lokasi dan urgensi. Respons lebih cepat dan tepat sasaran.",
    visual: "bars",
  },
  {
    icon: "document",
    tone: "bg-[#ff9f1c]",
    title: "Analisis data real-time",
    desc: "Pantau laporan per kelurahan, hoaks yang sedang naik, dan trust score komunitas dari satu dashboard.",
    visual: "analytics",
    wide: true,
  },
  {
    icon: "shield",
    tone: "bg-primary-dark",
    title: "Jaringan verifikasi komunitas",
    desc: "Diverifikasi otomatis dengan database kredibel dan disaring melalui 6 lapis pertahanan (Defense-in-Depth) untuk hasil yang akurat.",
    visual: "avatars",
  },
];

const agentSteps = [
  {
    number: "01",
    icon: "nodes",
    tone: "bg-accent-purple",
    title: "Agent 1: Penjaga KB",
    desc: "Mengindeks data secara otomatis dan terjadwal dari sumber resmi terpercaya (.go.id, Kemensos, Komdigi TrustPositif) ke SQLite / Supabase vector store.",
  },
  {
    number: "02",
    icon: "brain",
    tone: "bg-accent-red",
    title: "Agent 2: Otak Percakapan",
    desc: "Menjalankan pemikiran agentic dan loop alat (maks 4 kali) untuk memverifikasi kebenaran fakta dan menentukan keaslian informasi.",
  },
  {
    number: "03",
    icon: "radar",
    tone: "bg-accent-blue",
    title: "4 Alat Pendukung AI",
    desc: "Memanggil tools forensik otomatis: cek_url (deteksi judi/APK/phishing), cari_sumber_resmi, tren_penipuan, dan catat_laporan.",
  },
  {
    number: "04",
    icon: "shield",
    tone: "bg-primary",
    title: "Defense-in-Depth Lapor",
    desc: "Melindungi percakapan dengan 6 lapis keamanan (PII scrubber, prompt injection guard) dan meneruskan aduan resmi ke LaporGub.",
  },
];

const demoItems = [
  "Kirim link berita mencurigakan -> dapat analisis hoaks",
  "Foto surat undangan palsu -> deteksi phishing otomatis",
  "Ketik /lapor + keluhan -> diteruskan ke pemda terkait",
];

const sourceRepos = [
  {
    label: "Web Dashboard",
    href: "https://github.com/Rasyyao/warta-warga-web.git",
    desc: "Landing page dan dashboard publik JagaWarga.",
  },
  {
    label: "AI Agent",
    href: "https://github.com/xue-yuki/Warta-Warga.git",
    desc: "Bot WhatsApp, pipeline verifikasi, ingest Komdigi, dan broadcast.",
  },
];

const validationScenarios = [
  {
    headline: "Validasi Hoaks",
    status: "lagi validasi hoaks",
    user: "Ada isu pemadaman listrik karena pemimpin mau dilengserkan?",
    checking: "Saya cek sumber resmi dan riwayat laporan PLN.",
    kind: "danger",
    label: "Respons hoaks",
    title: "🚫 TIDAK BENAR. Itu hoaks.",
    confidence: "94%",
    summary: "Tidak ada informasi resmi. PLN memadamkan listrik untuk teknis, bukan urusan politik.",
    reasons: [
      "Pemadaman murni pemeliharaan teknis PLN.",
      "Isu pelengseran adalah narasi pemecah belah.",
    ],
    actions: ["Jangan sebar", "Cek PLN Mobile", "Tanya saya dulu"],
  },
  {
    headline: "Validasi Penipuan",
    status: "lagi validasi penipuan",
    user: "Link bansos ini aman untuk diklik & diisi data?",
    checking: "Saya cek keamanan domain dan data yang diminta.",
    kind: "danger",
    label: "Respons penipuan",
    title: "🚨 BAHAYA! Link ini PENIPUAN.",
    confidence: "97%",
    summary: "Jangan diklik atau isi data. Link mengarah ke judi online (MAMAKSLOT), bukan situs resmi.",
    reasons: [
      "Meminta data pribadi & nomor rekening.",
      "Mengincar data dan uang Bapak/Ibu.",
    ],
    actions: ["Jangan klik", "Hapus pesan", "Jangan bagikan"],
  },
  {
    headline: "Pengaduan Layanan",
    status: "lagi memproses aduan",
    user: "Saya mau lapor, di pasar Sokaraja terkadang masih ada preman.",
    checking: "Saya verifikasi wilayah dan format aduan LaporGub.",
    kind: "info",
    label: "Respons pengaduan",
    title: "Aduan dikirim ke LaporGub.",
    confidence: "LGWP8749",
    summary: "Aduan premanisme Pasar Sokaraja Kab. Banyumas berhasil dikirim ke LaporGub.",
    reasons: [
      "Format aduan wilayah terkonfirmasi.",
      "Nomor tiket resmi: LGWP87492270.",
    ],
    actions: ["Balas Ya", "Kirim LaporGub", "Pantau Tiket"],
  },
];

const footerColumns = [
  {
    title: "Produk",
    links: ["Cara Kerja", "Agent Pipeline", "Trust Score", "API Docs"],
  },
  {
    title: "Tentang",
    links: ["Tim", "LKS AI 2026", "IntechCode Enterprise", "Kontak"],
  },
  {
    title: "Teknologi",
    links: ["FastAPI", "kirimi.id", "IndoBERT", "pgvector"],
  },
];

type IconName =
  | "whatsapp"
  | "users"
  | "building"
  | "document"
  | "shield"
  | "nodes"
  | "radar"
  | "megaphone"
  | "check"
  | "brain";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white font-sans text-text-primary">
      <FloatingNavbar />
      <HeroSection />
      <FeatureGrid />
      <AgentPipeline />
      <RegionalRadar />
      <WhatsAppDemo />
      <SourceRepos />
      <Footer />
    </main>
  );
}

function SectionGridBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(37,211,102,0.08),transparent_40%),radial-gradient(circle_at_84%_18%,rgba(37,211,102,0.04),transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(37,211,102,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,211,102,0.08)_1px,transparent_1px)] bg-[size:56px_56px]" />
    </div>
  );
}

function FloatingNavbar() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-3 sm:px-5">
      <nav className="mx-auto grid max-w-[1040px] grid-cols-[1fr_auto] items-center gap-3 rounded-pill border border-black/[.08] bg-white/85 px-4 py-3 shadow-[0_12px_38px_rgba(17,17,17,0.08)] backdrop-blur-xl md:grid-cols-[1fr_auto_1fr] md:px-6">
        <a
          href="#"
          className="flex min-w-0 items-center gap-2 sm:gap-3 justify-self-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          aria-label="JagaWarga home"
        >
          <span className="grid size-8 sm:size-9 place-items-center rounded-full bg-primary text-sm sm:text-base font-extrabold text-white shadow-[0_8px_20px_rgba(37,211,102,0.28)]">
            J
          </span>
          <span className="text-[15px] sm:text-lg font-extrabold tracking-[-0.02em] text-text-primary">
            JagaWarga
          </span>
          <span className="h-5 w-px bg-black/[.08]" />
          <img
            src="/lks-nasional-logo.png"
            alt="LKS Nasional Logo"
            className="h-6 sm:h-7 w-auto object-contain"
          />
        </a>

        <div className="hidden items-center justify-center gap-1 rounded-pill bg-[#f6f8f6] p-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-pill px-4 py-2 text-sm font-medium text-text-muted transition hover:bg-white hover:text-text-primary hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center justify-self-end">
          <a
            href="#demo"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-primary/95 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,211,102,0.25)] backdrop-blur-md transition hover:bg-primary-dark active:scale-95 sm:px-5"
          >
            <Icon name="whatsapp" className="size-4" />
            <span className="sm:hidden">Coba</span>
            <span className="hidden sm:inline">Coba Sekarang</span>
          </a>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative isolate px-6 pb-20 pt-24 sm:pb-24 sm:pt-28 lg:px-20 lg:pb-32 lg:pt-36 min-h-screen flex items-center">
      <SectionGridBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-[1280px] grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="min-w-0 max-w-2xl text-left">
          <span className="mb-7 inline-flex animate-[fade-up_0.55s_ease-out_both] items-center gap-2 rounded-pill border border-black/[.08] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-text-primary shadow-sm">
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-white">
              ID
            </span>
            Platform Warga Berbasis AI
          </span>

          <h1 className="animate-[fade-up_0.65s_ease-out_0.08s_both] text-[clamp(1.8rem,7vw,2.8rem)] sm:text-[clamp(2.5rem,6vw,3.5rem)] lg:text-[clamp(2.75rem,4.5vw,3.75rem)] xl:text-[4.25rem] font-extrabold leading-[1.05] tracking-[-0.02em] text-text-primary">
            AI Warga untuk
            <span className="relative mt-2 block h-[1.25em] max-w-full overflow-hidden whitespace-nowrap text-primary">
              {validationScenarios.map((scenario, index) => (
                <span
                  key={scenario.headline}
                  className="rotating-title absolute inset-x-0 top-0 block h-[1.25em] leading-[1.2]"
                  style={{ animationDelay: `${index * 5}s` }}
                >
                  {scenario.headline}
                </span>
              ))}
            </span>
          </h1>

          <p className="mt-8 max-w-xl animate-[fade-up_0.7s_ease-out_0.16s_both] text-base leading-[1.75] text-text-muted sm:text-[17px]">
            JagaWarga membantu masyarakat memverifikasi informasi, mendeteksi
            penipuan, melaporkan layanan publik, dan memperoleh informasi
            bantuan langsung melalui WhatsApp.
          </p>

          <div className="mt-8 flex animate-[fade-up_0.75s_ease-out_0.24s_both] flex-row gap-2.5">
            <a
              href="#demo"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-primary/95 px-3 py-2.5 text-xs sm:px-7 sm:py-3.5 sm:text-sm font-semibold text-white shadow-[0_16px_34px_rgba(37,211,102,0.26)] backdrop-blur-md transition hover:bg-primary-dark active:scale-95"
            >
              <Icon name="whatsapp" className="size-4 sm:size-5" />
              Coba di WhatsApp
            </a>
            <a
              href="#cara-kerja"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-pill border border-black/15 bg-white/82 px-3 py-2.5 text-xs sm:px-7 sm:py-3.5 sm:text-sm font-semibold text-text-primary shadow-sm backdrop-blur-md transition hover:bg-white active:scale-95"
            >
              Lihat Cara Kerja
            </a>
          </div>

          <div className="mt-8 grid max-w-xl animate-[fade-up_0.8s_ease-out_0.32s_both] grid-cols-3 gap-2 sm:gap-3">
            {stats.slice(0, 3).map((stat) => (
              <div
                key={stat.label}
                className="rounded-card border border-black/[.06] bg-white/82 p-2 sm:px-4 sm:py-3 shadow-sm backdrop-blur-md"
              >
                <p className="text-sm sm:text-lg font-extrabold text-text-primary">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[9px] sm:text-xs font-medium leading-tight text-text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-[fade-up_0.85s_ease-out_0.32s_both] lg:justify-self-end">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  const leftNodes = [
    {
      label: "pesan masuk",
      detail: "pertanyaan warga",
      icon: "whatsapp" as IconName,
      tone: "bg-primary",
    },
    {
      label: "sumber resmi",
      detail: "Mafindo / Komdigi",
      icon: "shield" as IconName,
      tone: "bg-accent-blue",
    },
  ];

  const rightNodes = [
    {
      label: "risiko dicek",
      detail: "hoaks / phishing",
      icon: "radar" as IconName,
      tone: "bg-accent-red",
    },
    {
      label: "saran dikirim",
      detail: "balasan WhatsApp",
      icon: "megaphone" as IconName,
      tone: "bg-accent-purple",
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[620px] min-h-[510px] sm:min-h-[580px] flex flex-col justify-center sm:block">
      {/* SVG Background Lines for Connected Pipeline (only on desktop/tablet layout) */}
      <div className="relative mx-auto w-full max-w-[340px] sm:max-w-none sm:w-[580px] sm:h-[580px] flex items-center justify-center">
        {/* SVG lines */}
        <svg
          className="pointer-events-none absolute inset-0 z-0 hidden sm:block h-full w-full text-black/[.08]"
          viewBox="0 0 580 580"
          fill="none"
          aria-hidden="true"
        >
          <path d="M70 140 C140 120 170 150 200 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" />
          <path d="M50 440 C120 450 160 410 200 360" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" />
          <path d="M510 180 C440 160 410 190 380 220" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" />
          <path d="M530 420 C460 410 420 370 380 340" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" />
        </svg>

        {/* Central Chat Mockup Card */}
        <div className="relative z-10 w-full max-w-[340px] sm:w-[340px] flex flex-col rounded-[28px] border border-black/[.08] bg-[#f6f8f6] p-4 text-left shadow-[0_20px_50px_rgba(0,0,0,0.10)] h-[470px] sm:h-[530px]">
          <div className="mb-4 grid gap-3 rounded-[20px] bg-[#0f1f18] px-4 py-3 text-white grid-cols-[auto_1fr_auto] items-center">
            <span className="grid size-8 place-items-center rounded-full bg-primary">
              <Icon name="whatsapp" className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight">JagaWarga Bot</p>
              <div className="relative h-4 overflow-hidden text-[10px] text-white/65">
                {validationScenarios.map((scenario, index) => (
                  <p
                    key={scenario.status}
                    className="rotating-status absolute inset-0"
                    style={{ animationDelay: `${index * 5}s` }}
                  >
                    {scenario.status}
                  </p>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-pill bg-white/10 px-2.5 py-1 text-[9px] font-semibold text-white/80 backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-primary" />
              validasi aktif
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {validationScenarios.map((scenario, index) => (
              <div
                key={scenario.label}
                className="rotating-scenario absolute inset-x-2.5 top-0 bottom-0 space-y-3"
                style={{ animationDelay: `${index * 5}s` }}
              >
                <ChatLine text={scenario.user} />
                <ChatLine text={scenario.checking} bot />
                <div
                  className={`rounded-[20px] border bg-white p-3.5 shadow-sm ${
                    scenario.kind === "info"
                      ? "border-accent-blue/20"
                      : "border-accent-red/20"
                  }`}
                >
                  <div className="grid gap-2 grid-cols-[1fr_auto] items-start">
                    <div>
                      <p
                        className={`text-[10px] font-bold uppercase tracking-[0.08em] ${
                          scenario.kind === "info"
                            ? "text-accent-blue"
                            : "text-accent-red"
                        }`}
                      >
                        {scenario.label}
                      </p>
                      <h3 className="mt-1 text-sm font-extrabold leading-tight text-text-primary">
                        {scenario.title}
                      </h3>
                    </div>
                    <div
                      className={`w-fit rounded-[14px] px-2.5 py-1 text-right ${
                        scenario.kind === "info"
                          ? "bg-accent-blue/10"
                          : "bg-accent-red/10"
                      }`}
                    >
                      <p
                        className={`text-[8px] font-bold uppercase tracking-[0.08em] ${
                          scenario.kind === "info"
                            ? "text-accent-blue"
                            : "text-accent-red"
                        }`}
                      >
                        {scenario.kind === "info" ? "prioritas" : "confidence"}
                      </p>
                      <p className="text-lg font-extrabold text-text-primary">
                        {scenario.confidence}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs leading-normal text-text-muted">
                    {scenario.summary}
                  </p>
                  <div className="mt-2.5 rounded-[14px] bg-[#f6f8f6] p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-muted">
                      Kenapa
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {scenario.reasons.map((reason) => (
                        <li
                          key={reason}
                          className="grid grid-cols-[auto_1fr] gap-1.5 text-xs leading-tight text-text-primary"
                        >
                          <span className="mt-1.5 size-1 rounded-full bg-primary" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 justify-center">
                    {scenario.actions.map((action) => (
                      <span
                        key={action}
                        className="rounded-pill bg-white px-2.5 py-1 text-center text-[10px] font-bold text-text-primary shadow-sm ring-1 ring-black/[.06]"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Floating Nodes (hidden on mobile, shown on sm and up) */}
        <NodeCard
          {...leftNodes[0]}
          className="hidden sm:flex absolute left-[-20px] top-[70px] w-[180px] z-20 animate-float"
        />
        <NodeCard
          {...leftNodes[1]}
          className="hidden sm:flex absolute left-[-40px] bottom-[70px] w-[180px] z-20 animate-float-slow"
        />
        <NodeCard
          {...rightNodes[0]}
          className="hidden sm:flex absolute right-[-40px] top-[120px] w-[180px] z-20 animate-float-slow"
        />
        <NodeCard
          {...rightNodes[1]}
          className="hidden sm:flex absolute right-[-20px] bottom-[100px] w-[180px] z-20 animate-float"
        />
      </div>

      {/* Mobile Grid Nodes (shown below card on mobile, hidden on sm and up) */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:hidden px-4">
        {[...leftNodes, ...rightNodes].map((node) => (
          <NodeCard key={node.label} {...node} />
        ))}
      </div>
    </div>
  );
}

function NodeCard({
  label,
  detail,
  icon,
  tone,
  className = "",
}: {
  label: string;
  detail: string;
  icon: IconName;
  tone: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-card border border-black/[.06] bg-white/92 p-3.5 text-left shadow-[0_12px_28px_rgba(17,17,17,0.07)] backdrop-blur-md transition-all hover:scale-105 ${className}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-icon ${tone} text-white`}>
        <Icon name={icon} className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-text-primary leading-tight">{label}</p>
        <p className="mt-0.5 truncate text-[11px] font-medium text-text-muted">
          {detail}
        </p>
      </div>
    </div>
  );
}

function StatsStrip() {
  return (
    <section className="border-y border-black/[.06] bg-[#f9fcfa] py-10">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-y-8 px-6 md:grid-cols-4 lg:px-20">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="text-center md:border-r md:border-black/[.08] md:px-8 md:last:border-0"
          >
            <p className="text-3xl font-extrabold tracking-[-0.02em] text-text-primary sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section id="fitur" className="relative isolate bg-[#f5faf7] px-6 py-20 sm:py-24 lg:px-20 lg:py-28">
      <SectionGridBackdrop />
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <SectionHeading
          eyebrow="Fitur"
          title="Dibangun untuk semua warga"
          desc="Dari pengguna biasa hingga pemerintah daerah, JagaWarga menjawab kebutuhan siapa saja."
        />

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`group rounded-card border border-black/[.06] bg-white p-7 shadow-[0_2px_20px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] ${
                feature.wide ? "lg:col-span-2" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-5">
                <div className={`grid size-14 place-items-center rounded-icon ${feature.tone} text-white shadow-md`}>
                  <Icon name={feature.icon as IconName} className="size-7" />
                </div>
                <span className="rounded-pill bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Jaga
                </span>
              </div>
              <h3 className="mt-6 text-[22px] font-bold tracking-[-0.02em] text-text-primary">
                {feature.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.65] text-text-muted">
                {feature.desc}
              </p>
              <FeatureVisual type={feature.visual} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentPipeline() {
  return (
    <section id="cara-kerja" className="relative isolate overflow-hidden bg-white px-6 py-20 lg:px-20 lg:py-28">
      <SectionGridBackdrop />
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <SectionHeading
          eyebrow="Cara kerja"
          title="Empat agent AI bekerja untuk Anda"
          desc="Pipeline otomatis dari pesan masuk hingga jawaban terverifikasi."
        />

        <div id="agent" className="relative mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="absolute left-10 right-10 top-10 hidden border-t border-dashed border-[#c4b5fd] xl:block" />
          {agentSteps.map((step) => (
            <article
              key={step.number}
              className="relative rounded-card border border-black/[.06] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.05)]"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="grid size-8 place-items-center rounded-full bg-accent-purple text-xs font-bold text-white">
                  {step.number}
                </span>
                <span className="size-2 rounded-full bg-accent-purple shadow-[0_0_0_8px_rgba(124,92,252,0.10)]" />
              </div>
              <div className={`grid size-14 place-items-center rounded-icon ${step.tone} text-white shadow-md`}>
                <Icon name={step.icon as IconName} className="size-7" />
              </div>
              <h3 className="mt-6 text-xl font-bold tracking-[-0.02em]">
                {step.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.65] text-text-muted">
                {step.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatsAppDemo() {
  return (
    <section id="demo" className="relative isolate bg-white px-6 py-20 lg:px-20 lg:py-28">
      <SectionGridBackdrop />
      <div className="mx-auto grid max-w-[1200px] gap-10 rounded-[32px] border border-black/[.06] bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl md:grid-cols-[0.9fr_1.1fr] md:p-10 lg:p-14">
        <div className="self-center">
          <span className="rounded-pill bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-primary-dark">
            Integrasi Kirimi.id & Komdigi TrustPositif
          </span>
          <h2 className="mt-5 text-[clamp(2.5rem,5vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.02em]">
            Langsung dari WhatsApp Anda
          </h2>
          <p className="mt-5 max-w-xl text-[17px] leading-[1.7] text-text-muted">
            Kirimkan aduan langsung via WhatsApp. Gateway kirimi.id kami terintegrasi dengan RAG dan basis data valid seperti Komdigi TrustPositif untuk hasil verifikasi instan.
          </p>

          <div className="mt-8 space-y-4">
            {demoItems.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-white">
                  <Icon name="check" className="size-4" />
                </span>
                <p className="text-sm font-medium leading-6 text-text-primary">
                  {item}
                </p>
              </div>
            ))}
          </div>

          <a
            href="#"
            className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-primary/95 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(37,211,102,0.22)] backdrop-blur-md transition hover:bg-primary-dark active:scale-95"
          >
            <Icon name="whatsapp" className="size-5" />
            Mulai sekarang di WhatsApp
          </a>
        </div>

        <PhoneMockup />
      </div>
    </section>
  );
}

async function RegionalRadar() {
  const svgPath = path.join(process.cwd(), "public", "indonesia.svg");
  const rawSvg = fs.readFileSync(svgPath, "utf8");
  const svgContent = rawSvg
    .replace(/<\?xml.*\?>/i, "")
    .replace(/<!--.*-->/i, "")
    .replace(/<svg([^>]*)/i, '<svg$1 class="w-full h-auto" id="indonesia-svg"');

  let dbCount = 0;
  let sumateraCount = 0;
  let jakartaCount = 0;
  let banyumasCount = 0;
  let surabayaCount = 0;
  let makassarCount = 0;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data: rows } = await supabase
      .from("laporan")
      .select("wilayah_tag, jumlah_serupa");
    if (rows) {
      dbCount = rows.length;
      rows.forEach((c: any) => {
        const n = Number(c.jumlah_serupa ?? 1);
        if (c.wilayah_tag === "Sumatera") sumateraCount += n;
        if (c.wilayah_tag === "Jakarta") jakartaCount += n;
        if (c.wilayah_tag === "Banyumas") banyumasCount += n;
        if (c.wilayah_tag === "Surabaya") surabayaCount += n;
        if (c.wilayah_tag === "Makassar") makassarCount += n;
      });
    }
  } catch (e) {
    console.error("Failed to query counts for landing page:", e);
  }

  return (
    <section id="radar" className="relative isolate bg-[#f7fcf9] px-6 py-20 lg:px-20 lg:py-28">
      <SectionGridBackdrop />
      <div className="mx-auto max-w-[1200px] text-center">
        <SectionHeading
          eyebrow="Radar Wilayah"
          title="Selesaikan kebingungan warga di setiap daerah"
          desc="Pantau verifikasi hoaks dan laporan penipuan yang terdeteksi secara real-time di berbagai provinsi Indonesia."
        />

        <div className="relative mx-auto mt-14 max-w-4xl rounded-[32px] border border-black/[.06] bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:p-10">
          {/* Floating Legend */}
          <div className="absolute left-6 top-6 z-20 rounded-2xl border border-black/[0.04] bg-white/90 p-4 text-left shadow-sm backdrop-blur-md">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-text-primary flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent-red" />
              STATUS RADAR
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                <span className="size-2 rounded-full bg-[#25d366]" />
                Info Valid (.go.id)
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                <span className="size-2 rounded-full bg-[#ff9f1c]" />
                Peringatan Hoaks
              </div>
            </div>
          </div>

          {/* Floating Report Count Badge */}
          <div className="absolute -left-4 top-1/2 z-20 -translate-y-1/2 rounded-[20px] bg-white p-3.5 text-center shadow-[0_12px_36px_rgba(0,0,0,0.08)] border border-black/[0.04] flex flex-col items-center">
            <span className="text-2xl font-extrabold text-[#25d366]">{dbCount}</span>
            <span className="mt-1.5 rounded-full bg-[#25d366] px-2.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
              Laporan
            </span>
          </div>

          {/* Floating Checkmark Badge */}
          <div className="absolute -right-4 top-2/3 z-20 grid size-12 place-items-center rounded-full bg-white shadow-[0_12px_36px_rgba(0,0,0,0.08)] border border-black/[0.04]">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#25d366]/10 text-sm font-bold text-[#25d366]">
              ✓
            </span>
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full overflow-hidden pt-8">
            <div 
              id="radar-map"
              className="w-full h-auto text-slate-200 fill-current"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />

            {/* Radar Pulsing Markers */}
            <div className="absolute left-[15%] top-[47%] z-10 flex size-3" title={`Sumatera: ${sumateraCount} laporan`}>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25d366] opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-[#25d366]" />
            </div>
            <div className="absolute left-[30%] top-[80%] z-10 flex size-3" title={`Jakarta: ${jakartaCount} laporan`}>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25d366] opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-[#25d366]" />
            </div>
            <div className="absolute left-[36%] top-[82%] z-10 flex size-3" title={`Banyumas: ${banyumasCount} laporan`}>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff9f1c] opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-[#ff9f1c]" />
            </div>
            <div className="absolute left-[41%] top-[83%] z-10 flex size-3" title={`Surabaya: ${surabayaCount} laporan`}>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff9f1c] opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-[#ff9f1c]" />
            </div>
            <div className="absolute left-[54%] top-[63%] z-10 flex size-3" title={`Makassar: ${makassarCount} laporan`}>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25d366] opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-[#25d366]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function SourceRepos() {
  return (
    <section id="kode-sumber" className="relative isolate bg-[#f5faf7] px-6 py-16 lg:px-20 lg:py-20">
      <SectionGridBackdrop />
      <div className="relative z-10 mx-auto grid max-w-[1200px] gap-6 rounded-[28px] border border-black/[.06] bg-white/88 p-6 shadow-[0_18px_54px_rgba(0,0,0,0.06)] backdrop-blur-xl md:grid-cols-[0.9fr_1.1fr] md:p-8 lg:p-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary-dark">
            GitHub
          </p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-text-primary">
            Kode sumber terbuka
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-[1.7] text-text-muted">
            Lihat repository web dan agent utama yang menjalankan pengalaman JagaWarga.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {sourceRepos.map((repo) => (
            <a
              key={repo.href}
              href={repo.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-card border border-black/[.06] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(17,17,17,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <span className="grid size-10 place-items-center rounded-[10px] bg-[#111111] text-xs font-extrabold text-white">
                GH
              </span>
              <h3 className="mt-4 text-lg font-extrabold text-text-primary">
                {repo.label}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {repo.desc}
              </p>
              <p className="mt-4 break-all text-xs font-semibold text-primary-dark">
                {repo.href.replace("https://github.com/", "")}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}


function Footer() {
  return (
    <footer className="bg-white px-6 pt-16 lg:px-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 border-b border-black/[.08] pb-12 md:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <a href="#" className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-primary text-lg font-extrabold text-white">
                J
              </span>
              <span className="text-xl font-extrabold tracking-[-0.02em]">
                JagaWarga
              </span>
              <span className="h-6 w-px bg-black/[.08]" />
              <img
                src="/lks-nasional-logo.png"
                alt="LKS Nasional Logo"
                className="h-8 w-auto object-contain"
              />
            </a>
            <p className="mt-4 max-w-xs text-sm leading-6 text-text-muted">
              Platform AI untuk warga Indonesia
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-bold text-text-primary">{column.title}</h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-text-muted transition hover:text-text-primary">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
              {column.title === "Teknologi" ? (
                <div className="mt-5 flex gap-2">
                  {sourceRepos.map((repo) => (
                    <a
                      key={repo.href}
                      href={repo.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`GitHub ${repo.label}`}
                      className="grid size-9 place-items-center rounded-[8px] border border-black/[.08] text-xs font-bold transition hover:border-primary/40 hover:text-primary-dark"
                    >
                      GH
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="overflow-hidden pt-12 -mx-6 lg:-mx-20 [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]">
          <p className="select-none text-[clamp(80px,15vw,260px)] font-extrabold leading-none tracking-[-0.06em] bg-gradient-to-b from-primary to-[#128c7e] bg-clip-text text-transparent text-center w-full px-4">
            JagaWarga
          </p>
        </div>
        <p className="pb-8 text-xs text-text-light">
          (c) 2026 Atlet Ompreng · LKS Nasional Eksibisi AI
        </p>
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary-dark">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[clamp(2.5rem,5vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-text-primary">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-[1.7] text-text-muted">
        {desc}
      </p>
    </div>
  );
}

function FeatureVisual({ type }: { type: string }) {
  if (type === "chat") {
    return (
      <div className="mt-7 rounded-[18px] bg-soft p-4 space-y-2">
        <ChatLine text="Tolong cek link ini: https://bansos-xyz.com" />
        <ChatLine text="🚨 BAHAYA! Database Komdigi TrustPositif mendeteksi link ini sebagai penipuan judi online." bot />
      </div>
    );
  }

  if (type === "cluster") {
    return (
      <div className="relative mt-7 h-32 rounded-[18px] bg-soft">
        {[18, 42, 72, 56, 84, 28].map((left, index) => (
          <span
            key={left}
            className="absolute grid size-8 place-items-center rounded-full bg-white text-xs font-bold text-accent-purple shadow-sm"
            style={{ left: `${left}%`, top: `${18 + (index % 3) * 24}%` }}
          >
            {index + 1}
          </span>
        ))}
        <span className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-icon bg-accent-purple text-white">
          <Icon name="users" className="size-6" />
        </span>
      </div>
    );
  }

  if (type === "bars") {
    return (
      <div className="mt-7 flex h-32 items-end gap-3 rounded-[18px] bg-soft p-4">
        {[44, 74, 58, 92, 66].map((height) => (
          <span
            key={height}
            className="flex-1 rounded-t-[10px] bg-accent-blue"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    );
  }

  if (type === "analytics") {
    return (
      <div className="mt-7 grid gap-4 rounded-[18px] bg-soft p-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {["Kel. Melati", "Kel. Sawo", "Kel. Kenanga"].map((item, index) => (
            <div key={item}>
              <div className="mb-1 flex justify-between text-xs font-semibold text-text-muted">
                <span>{item}</span>
                <span>{78 - index * 12}%</span>
              </div>
              <div className="h-2 rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${78 - index * 12}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-[16px] bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-text-muted">
            Trust score
          </p>
          <p className="mt-3 text-4xl font-extrabold text-accent-purple">86</p>
          <p className="mt-1 text-xs text-text-muted">komunitas sehat</p>
        </div>
      </div>
    );
  }

  const layers = [
    "L1: Prompt Injection Guard",
    "L2: Off-Topic Task Filter",
    "L3: System Prompt Data Guard",
    "L4: Output Code Scanner",
    "L5: NIK & HP PII Scrubber",
    "L6: URL Sanitizer",
  ];
  return (
    <div className="mt-7 flex flex-col gap-1.5 rounded-[18px] bg-soft p-3">
      {layers.map((layer, index) => (
        <div
          key={layer}
          className="flex items-center gap-2 rounded-lg bg-white px-3 py-1 border border-black/[0.03] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          style={{
            opacity: 1 - index * 0.1,
            transform: `scale(${1 - index * 0.015})`,
          }}
        >
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[8px] font-bold text-primary">
            ✓
          </span>
          <span className="text-[10px] font-bold tracking-tight text-text-primary">
            {layer}
          </span>
        </div>
      ))}
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-[42px] border-[10px] border-[#111111] bg-[#0f1f18] p-3 shadow-[0_30px_70px_rgba(0,0,0,0.20)]">
        <div className="overflow-hidden rounded-[28px] bg-[#e8f5ec]">
          <div className="flex items-center gap-3 bg-[#128c7e] px-4 py-4 text-white">
            <span className="grid size-10 place-items-center rounded-full bg-primary">
              <Icon name="whatsapp" className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">JagaWarga Bot</p>
              <p className="text-xs text-white/70">powered by kirimi.id</p>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <ChatLine text="https://bansos-cepat.example/form" />
            <div className="ml-auto max-w-[84%] rounded-[18px] rounded-tr-sm bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-red">
                Terindikasi hoaks
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-primary">
                Confidence: 91%
                <br />
                Sumber: Mafindo (2024-03-12)
              </p>
              <button className="mt-3 inline-flex items-center justify-center rounded-pill bg-primary/95 px-4 py-2 text-xs font-bold text-white shadow-sm backdrop-blur-md transition hover:bg-primary-dark active:scale-95">
                Lihat detail
              </button>
            </div>
            <div className="inline-flex items-center gap-1 rounded-pill bg-white px-3 py-2 text-xs font-semibold text-primary-dark shadow-sm">
              <span className="size-2 rounded-full bg-primary" />
              verified by AI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatLine({ text, bot = false }: { text: string; bot?: boolean }) {
  return (
    <div className={bot ? "flex justify-end" : "flex justify-start"}>
      <p
        className={`max-w-[84%] rounded-[14px] px-3 py-2 text-xs font-semibold leading-normal shadow-sm ${
          bot
            ? "rounded-tr-sm bg-primary text-white"
            : "rounded-tl-sm bg-white text-text-primary"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "whatsapp":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
          <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
        </svg>
      );
    case "document":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );
    case "nodes":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="12" cy="18" r="3" />
          <path d="m8.6 8.4 2.2 6.2M15.4 8.4l-2.2 6.2M9 6h6" />
        </svg>
      );
    case "radar":
      return (
        <svg {...common}>
          <path d="M12 12 20 4" />
          <path d="M20.5 12A8.5 8.5 0 1 1 12 3.5" />
          <path d="M16 12a4 4 0 1 1-4-4" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    case "megaphone":
      return (
        <svg {...common}>
          <path d="m3 11 18-5v12L3 14v-3Z" />
          <path d="M11.6 16.8 12 21H8l-1-5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m20 6-11 11-5-5" />
        </svg>
      );
    case "brain":
      return (
        <svg {...common}>
          <path d="M9 4.5a3 3 0 0 0-3 3v.4A3.5 3.5 0 0 0 4 11a3.5 3.5 0 0 0 2 3.2v.3a3 3 0 0 0 3 3" />
          <path d="M15 4.5a3 3 0 0 1 3 3v.4a3.5 3.5 0 0 1 2 3.1 3.5 3.5 0 0 1-2 3.2v.3a3 3 0 0 1-3 3" />
          <path d="M9 4.5V20M15 4.5V20M9 9h6M9 14h6" />
        </svg>
      );
  }
}
