# JagaWarga — Landing Page Design Brief
> Style: CoreShift by Outcrowd (adapted)
> Stack: Tailwind CSS v3 + HTML or Next.js 14 App Router
> Ready for Codex / Claude Code handoff

---

## 1. Product Overview

| Property | Value |
|---|---|
| **Product name** | JagaWarga |
| **Tagline** | *"Satu pesan WhatsApp. Hoaks terungkap. Laporan tersampaikan."* |
| **Type** | Multi-agent AI civic platform via WhatsApp |
| **Core features** | Hoax detection · Public service complaints · CIB analysis · Trust scoring |
| **Interface** | WhatsApp Bot (kirimi.id) + Web dashboard |
| **Built for** | Indonesian citizens, communities, local government |
| **Competition context** | LKS Nasional Eksibisi AI 2026 |

---

## 2. Color Palette

| Token name | Hex | Tailwind custom key | Usage |
|---|---|---|---|
| `bg-base` | `#EDEDED` | `bg-base` | Global page background (warm light grey) |
| `surface` | `#FFFFFF` | `surface` | Cards, navbar, modals |
| `primary` | `#25D366` | `primary` | WhatsApp green — CTA buttons, highlights |
| `primary-dark` | `#128C7E` | `primary-dark` | Hover state, secondary emphasis |
| `accent-red` | `#E53935` | `accent-red` | Hoax warning badges, danger states |
| `accent-purple` | `#7C5CFC` | `accent-purple` | AI/agent elements, trust score indicators |
| `accent-blue` | `#2196F3` | `accent-blue` | Info states, verified badges |
| `text-primary` | `#111111` | `text-primary` | All headlines |
| `text-muted` | `#888888` | `text-muted` | Subtext, descriptions, nav links |
| `text-light` | `#AAAAAA` | `text-light` | Captions, labels |
| `border` | `rgba(0,0,0,0.08)` | — | Card borders, dividers |
| `footer-wordmark` | `#25D366` | — | Oversized "JagaWarga" footer text |

### Color Rules
- Background is **`#EDEDED`** (warm grey), never pure white — creates the CoreShift "floating card" depth
- **WhatsApp green (`#25D366`)** replaces CoreShift orange as primary CTA
- **Red (`#E53935`)** is used sparingly for hoax/danger states only
- **Purple (`#7C5CFC`)** represents the AI/agent layer — used on agent cards and trust indicators
- All cards are **white on grey bg** — strong z-depth contrast

---

## 3. Typography

| Element | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Brand logo | `Plus Jakarta Sans` | `18px` | `700` | "JagaWarga" — J in green |
| H1 Hero | `Plus Jakarta Sans` | `56–72px` | `800` | Tracking `-0.02em`, tight line-height |
| H2 Section | Same | `44–56px` | `800` | e.g. "Dibangun untuk semua" |
| H3 Card title | Same | `20–24px` | `700` | Agent/feature card headings |
| Body | Same | `15–17px` | `400` | `line-height: 1.65`, color `#888` |
| Nav links | Same | `14px` | `500` | Muted grey, hover → black |
| Button label | Same | `14–15px` | `600` | |
| Badge/label | Same | `11–12px` | `600` | Uppercase, `letter-spacing: 0.08em` |
| Footer tagline | Same | `13px` | `400` | Muted |

**Google Font import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## 4. Spacing & Layout Tokens

```
Max content width:      1200px
Horizontal padding:     80px desktop / 24px mobile
Section padding:        100px–120px top/bottom
Card border-radius:     20px (large, soft)
Button border-radius:   999px (pill)
Navbar border-radius:   999px (floating pill)
Icon box radius:        18px (squircle)
Avatar radius:          14–16px
Card gap:               20–24px
Card padding:           28–32px
```

### Tailwind config extension
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'bg-base':      '#EDEDED',
        'surface':      '#FFFFFF',
        'primary':      '#25D366',
        'primary-dark': '#128C7E',
        'accent-red':   '#E53935',
        'accent-purple':'#7C5CFC',
        'accent-blue':  '#2196F3',
        'text-primary': '#111111',
        'text-muted':   '#888888',
        'text-light':   '#AAAAAA',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        'card':  '20px',
        'pill':  '9999px',
        'icon':  '18px',
      },
      maxWidth: {
        'content': '1200px',
      },
    },
  },
}
```

---

## 5. Component Specs

### 5.1 Navbar
```
Style:          Floating pill, white bg, drop shadow
Position:       Sticky top, centered, max-width ~760px
Border:         1px solid rgba(0,0,0,0.08)
Border-radius:  9999px
Padding:        12px 28px
Shadow:         0 4px 24px rgba(0,0,0,0.06)
Backdrop:       blur(8px)

Left:   Logo — green "J" icon + "JagaWarga" wordmark
Center: Nav links — Fitur · Cara Kerja · Agent · Tentang
Right:  "Masuk" text link + "Coba Sekarang" green pill CTA button
```

Tailwind classes (navbar container):
```
sticky top-4 z-50 mx-auto max-w-3xl
bg-white/90 backdrop-blur-md
border border-black/8 rounded-pill
px-7 py-3 shadow-md
flex items-center justify-between
```

---

### 5.2 Hero Section
```
Layout:       Centered, full-width
Background:   #EDEDED (page bg)

Eyebrow badge (pill):
  - Text: "🇮🇩 Platform Warga Berbasis AI"
  - Style: white bg, border, small, centered above H1

H1 Headline:
  - "Satu Pesan WhatsApp."
  - "Hoaks Terungkap."
  - Line 1 black, line 2 green (#25D366) — color split
  - Font: 64–72px, weight 800

Subtext:
  - "JagaWarga adalah platform multi-agent AI yang membantu warga
     memverifikasi hoaks dan melaporkan masalah layanan publik —
     langsung dari WhatsApp, tanpa aplikasi baru."
  - Grey #888, max-width 480px, centered

CTA buttons (row, centered, gap-4):
  - Primary:   "Coba di WhatsApp" — green pill, white text
  - Secondary: "Pelajari Cara Kerja" — white bg, black border, pill

Hero visual (below CTAs):
  - WhatsApp chat mockup UI card (white, rounded-card, shadow)
  - Floating agent icon nodes connected by dotted lines (same as CoreShift)
  - Center node: purple squircle with brain/robot icon
  - Surrounding: green WA icon, red shield (Scout), blue checkmark (Validator),
    orange broadcast (Broadcaster)
  - Connection lines: thin dotted, color #C4B5FD (light purple)
  - Small "verified" and "hoaks terdeteksi" label chips floating around nodes
```

---

### 5.3 Stats Strip
```
Layout:     Full-width white bar, 4 columns
Padding:    40px 0
Border:     top + bottom 1px solid rgba(0,0,0,0.06)

Stats:
  - "10.000+"     Pesan diproses
  - "94%"         Akurasi deteksi hoaks
  - "4 Agent"     AI pipeline aktif
  - "<3 detik"    Rata-rata waktu respons

Each stat:
  - Number: 36px, weight 800, black
  - Label:  13px, weight 400, grey
  - Divider: 1px vertical between columns
```

---

### 5.4 "Dibangun untuk Semua" Feature Grid
```
Section headline: "Dibangun untuk semua warga"
Subtext: "Dari pengguna biasa hingga pemerintah daerah, JagaWarga
          menjawab kebutuhan siapa saja."

Grid layout:
  Row 1: 3 columns
  Row 2: 2 columns
  (Same bento style as CoreShift)

Card style:
  bg: white
  border-radius: 20px
  border: 1px solid rgba(0,0,0,0.06)
  box-shadow: 0 2px 20px rgba(0,0,0,0.05)
  padding: 28px
  hover: translateY(-4px), shadow increase

Cards:

1. "Untuk warga biasa"
   Icon bg: green (#25D366)
   Icon: WhatsApp icon (white)
   Desc: "Kirim pesan, foto, atau link mencurigakan.
          Dapatkan jawaban dalam hitungan detik."
   Visual: mini WhatsApp chat screenshot

2. "Untuk komunitas & RT/RW"
   Icon bg: purple (#7C5CFC)
   Icon: people/group icon (white)
   Desc: "Laporkan masalah infrastruktur dan layanan
          publik secara kolektif dengan verifikasi AI."
   Visual: cluster/map visualization mini

3. "Untuk pemerintah daerah"
   Icon bg: blue (#2196F3)
   Icon: building/government icon (white)
   Desc: "Terima laporan terklaster berdasarkan lokasi
          dan urgensi. Respons lebih cepat dan tepat sasaran."
   Visual: dashboard chart screenshot

4. "Analisis data real-time" (wide card, col-span-2)
   Visual: bar chart / training participation style (like CoreShift card 4)
   Shows: laporan per kelurahan, hoaks trending, trust score graph
   Icon: orange document icon top-left

5. "Jaringan verifikasi komunitas"
   Visual: circular avatar arrangement (like CoreShift card 5)
   Shows: warga avatars in a circle with shield icon center
   Desc: "Trust score melindungi dari akun buzzer dan bot"
```

---

### 5.5 "Cara Kerja" — 4 Agent Pipeline Section
```
Headline: "Empat agent AI bekerja untuk Anda"
Subtext:  "Pipeline otomatis dari pesan masuk hingga jawaban terverifikasi."

Layout: Horizontal step flow (desktop) / vertical stack (mobile)
Each step: numbered badge (01–04) + icon + title + desc

Steps:

01  Agent Cluster
    Icon bg: purple
    Icon: cluster/nodes icon
    Title: "Klasifikasi & Klasterisasi"
    Desc:  "Pesan Anda diklasifikasikan — hoaks atau aduan layanan —
            lalu dikelompokkan dengan laporan serupa menggunakan DBSCAN."

02  Agent Scout
    Icon bg: red/orange
    Icon: search/radar icon
    Title: "Investigasi & Forensik"
    Desc:  "Tautan dicek otomatis: phishing, logo palsu, form berbahaya.
            Narasi dianalisis untuk deteksi jaringan bot terkoordinasi (CIB)."

03  Agent Validator
    Icon bg: blue
    Icon: shield-check icon
    Title: "Validasi Resmi"
    Desc:  "Temuan dicocokkan dengan database Mafindo, Komdigi,
            SP4N-LAPOR!, dan IASC. Confidence gate 0.75 — tanpa halusinasi."

04  Agent Broadcaster
    Icon bg: green
    Icon: broadcast/megaphone icon
    Title: "Respons & Distribusi"
    Desc:  "Hasil terverifikasi dikirim kembali ke WhatsApp Anda
            dan disebarkan ke komunitas terkait bila diperlukan."

Connector between steps:
  - Dashed arrow line, color #C4B5FD
  - Small purple dots at midpoint
```

---

### 5.6 WhatsApp Demo Section
```
Headline: "Langsung dari WhatsApp Anda"
Subtext:  "Tidak perlu install aplikasi baru. Cukup simpan nomor JagaWarga."

Layout: 2 columns (text left, phone mockup right)

Left col:
  - List of 3 interaction examples with icons:
    ✓ Kirim link berita mencurigakan → dapat analisis hoaks
    ✓ Foto surat undangan palsu → deteksi phishing otomatis
    ✓ Ketik /lapor + keluhan → diteruskan ke pemda terkait
  - CTA: "Mulai sekarang di WhatsApp" (green pill button with WA icon)
  - Powered by: "kirimi.id" small badge

Right col:
  - Phone frame mockup (CSS-drawn or SVG)
  - WhatsApp chat UI inside showing:
    User: [link hoaks]
    JagaWarga Bot: "⚠️ TERINDIKASI HOAKS
                    Confidence: 91%
                    Sumber: Mafindo (2024-03-12)
                    [Lihat detail]"
  - Small "verified by AI" chip below phone
```

---

### 5.7 Testimonials — "Kata Mereka"
```
Headline: "Kata Mereka"
Subtext:  "Dari warga, komunitas, hingga aparat kelurahan."

Layout: Envelope + card (exact CoreShift style)

Envelope: purple (#7C5CFC) geometric shape
Card emerging from envelope: white, rounded, centered, shadow

Card contents:
  - Avatar: circular photo
  - Name: "Pak Suharto"
  - Role: "Ketua RT 04, Banyumas"
  - 5 green stars (use #25D366 instead of yellow)
  - Quote: "Sekarang kalau ada pesan berantai di grup RT, langsung
            gue forward ke JagaWarga. Dalam 3 detik udah ketahuan
            hoaks atau bukan."

Carousel dots below (3 dots, green active)
```

---

### 5.8 Footer
```
Background: WHITE (contrast with grey page bg)

Top section (4 columns):
  Col 1 — Brand:
    JagaWarga logo + tagline
    "Platform multi-agent AI untuk warga Indonesia"
    
  Col 2 — Produk:
    Sub-links: Cara Kerja · Agent Pipeline · Trust Score · API Docs

  Col 3 — Tentang:
    Sub-links: Tim · LKS AI 2026 · IntechCode Enterprise · Kontak

  Col 4 — Teknologi:
    Sub-links: FastAPI · kirimi.id · IndoBERT · pgvector

Social icons row (bottom of col 4):
  GitHub · Instagram · (square buttons, border, border-radius 8px)

Bottom section:
  Oversized "JagaWarga" wordmark — GREEN (#25D366), weight 800
  Font-size: ~120–160px
  Slightly cropped at bottom — bleeds beyond viewport
  Blur/fade effect on bottom edge: mask-image: linear-gradient(to bottom, black 60%, transparent)
  Left-aligned or centered

Below wordmark (tiny):
  "© 2026 IntechCode Enterprise · LKS Nasional Eksibisi AI"
  Color: #AAAAAA, 12px
```

---

## 6. Full Page Section Order

```
1.  [Navbar]           Floating pill, sticky, WA green CTA
2.  [Hero]             Split headline (black + green), node graph, 2 CTAs
3.  [Stats Strip]      4 numbers — pesan, akurasi, agent, kecepatan
4.  [Feature Grid]     "Dibangun untuk semua" — 5-card bento
5.  [Agent Pipeline]   "4 Agent AI" — horizontal step flow
6.  [WhatsApp Demo]    2-col — text + phone mockup
7.  [Testimonials]     Envelope card — "Kata Mereka"
8.  [Footer]           Nav columns + oversized green wordmark
```

---

## 7. CSS Component Recipes (Tailwind)

### Floating Navbar
```html
<nav class="sticky top-4 z-50 mx-auto max-w-3xl bg-white/90 backdrop-blur-md
            border border-black/[.08] rounded-full px-7 py-3 shadow-lg
            flex items-center justify-between">
```

### Feature Card
```html
<div class="bg-white rounded-[20px] border border-black/[.06]
            shadow-[0_2px_20px_rgba(0,0,0,0.05)] p-7
            hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]
            transition-all duration-200">
```

### Primary CTA (WhatsApp Green)
```html
<button class="bg-primary text-white font-semibold text-sm
               rounded-full px-7 py-3.5
               hover:bg-primary-dark
               transition-colors duration-200
               flex items-center gap-2">
  <svg><!-- WA icon --></svg>
  Coba di WhatsApp
</button>
```

### Secondary CTA
```html
<button class="bg-white text-text-primary font-semibold text-sm
               border border-black/20 rounded-full px-7 py-3.5
               hover:bg-gray-50 transition-colors duration-200">
  Pelajari Cara Kerja
</button>
```

### Agent Step Badge
```html
<span class="w-8 h-8 rounded-full bg-accent-purple text-white
             text-xs font-bold flex items-center justify-center">
  01
</span>
```

### Squircle Icon Box
```html
<div class="w-14 h-14 rounded-[18px] bg-primary
            flex items-center justify-center shadow-md">
  <svg class="text-white w-7 h-7"><!-- icon --></svg>
</div>
```

### Eyebrow Badge (Hero)
```html
<span class="inline-flex items-center gap-2 bg-white border border-black/[.08]
             rounded-full px-4 py-1.5 text-xs font-semibold text-text-primary
             shadow-sm mb-6">
  🇮🇩 Platform Warga Berbasis AI
</span>
```

### Stats Item
```html
<div class="text-center px-8 border-r border-black/[.08] last:border-0">
  <p class="text-4xl font-extrabold text-text-primary">94%</p>
  <p class="text-sm text-text-muted mt-1">Akurasi deteksi hoaks</p>
</div>
```

### Oversized Footer Wordmark
```html
<div class="overflow-hidden" style="mask-image: linear-gradient(to bottom, black 50%, transparent 100%)">
  <p class="text-[clamp(80px,14vw,160px)] font-extrabold text-primary
            leading-none tracking-tight select-none">
    JagaWarga
  </p>
</div>
```

---

## 8. Micro-interaction Notes

| Element | Behavior |
|---|---|
| Feature cards | `hover:-translate-y-1 shadow-lg` — lift on hover |
| CTA button | `hover:brightness-90 active:scale-95` |
| Nav links | `hover:text-text-primary` from muted grey |
| Agent steps | Scroll-triggered entrance: `opacity-0 → 1`, `translateX(-20px → 0)` staggered |
| Hero nodes | Slow float animation: `@keyframes float` `translateY(-8px → 0px)` 3s infinite |
| WhatsApp mockup | Typing indicator → message appear on scroll into view |
| Stats numbers | Count-up animation on scroll (Intersection Observer) |

---

## 9. Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| Desktop ≥1280px | Full layout — 3-col grid, horizontal agent steps |
| Tablet 768–1279px | 2-col feature grid, agent steps go 2×2 |
| Mobile <768px | 1-col stack, navbar = hamburger, hero nodes hidden, phone mockup stacks below text |

```html
<!-- Tailwind responsive example for feature grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
```

---

## 10. Tech Stack (Implementation)

```
Framework:    Next.js 14 (App Router) OR plain HTML + Tailwind CDN
Styling:      Tailwind CSS v3 with custom config above
Font:         Plus Jakarta Sans (Google Fonts)
Icons:        Lucide Icons (lucide-react) or Heroicons
Animation:    Framer Motion (card hover, count-up, scroll reveal)
WhatsApp:     kirimi.id integration (Rp50k/month)
Bot backend:  FastAPI + Celery + Redis + PostgreSQL/pgvector
```

---

## 11. Content Strings (Copy)

```yaml
navbar:
  logo: "JagaWarga"
  links: ["Fitur", "Cara Kerja", "Agent", "Tentang"]
  cta_secondary: "Masuk"
  cta_primary: "Coba Sekarang"

hero:
  badge: "🇮🇩 Platform Warga Berbasis AI"
  h1_line1: "Satu Pesan WhatsApp."
  h1_line2: "Hoaks Terungkap."
  subtext: >
    JagaWarga adalah platform multi-agent AI yang membantu warga memverifikasi
    hoaks dan melaporkan masalah layanan publik — langsung dari WhatsApp,
    tanpa aplikasi baru.
  cta_primary: "Coba di WhatsApp"
  cta_secondary: "Pelajari Cara Kerja"

stats:
  - value: "10.000+"
    label: "Pesan diproses"
  - value: "94%"
    label: "Akurasi deteksi hoaks"
  - value: "4 Agent"
    label: "AI pipeline aktif"
  - value: "<3 detik"
    label: "Rata-rata respons"

feature_section:
  headline: "Dibangun untuk semua warga"
  subtext: "Dari pengguna biasa hingga pemerintah daerah."

agent_section:
  headline: "Empat agent AI bekerja untuk Anda"
  subtext: "Pipeline otomatis dari pesan masuk hingga jawaban terverifikasi."

demo_section:
  headline: "Langsung dari WhatsApp Anda"
  subtext: "Tidak perlu install aplikasi baru. Cukup simpan nomor JagaWarga."
  powered_by: "kirimi.id"

testimonial_section:
  headline: "Kata Mereka"

footer:
  tagline: "Platform multi-agent AI untuk warga Indonesia"
  copyright: "© 2026 IntechCode Enterprise · LKS Nasional Eksibisi AI"
  wordmark: "JagaWarga"
```

---

## 12. Asset Checklist (for Codex)

```
[ ] JagaWarga logo SVG (green J + wordmark)
[ ] WhatsApp icon SVG (for CTA button)
[ ] 4 agent icons SVG (cluster, radar, shield-check, broadcast)
[ ] Phone frame mockup (CSS or SVG)
[ ] 3 testimonial avatars (placeholder: ui-avatars.com)
[ ] kirimi.id badge logo (optional)
[ ] Mafindo / Komdigi logos (for "verified by" strip, optional)
[ ] OG image 1200×630 for meta tags
```

---

*Brief generated for JagaWarga — LKS Nasional Eksibisi AI 2026*
*Team: IntechCode Enterprise — Rasya, Zharfan, Henry, Erlangga, Aufa*