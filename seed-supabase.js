const postgres = require("postgres");

const url = "postgresql://postgres.mfnfdvhcwgmfmtopqtxi:%247gnKJcqW3p%3FWK%2C@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres";
const sql = postgres(url, { ssl: 'require', prepare: false });

async function seed() {
  try {
    console.log("Seeding laporan and log_interaksi to Supabase...");
    
    // Clear old reports and logs to keep it clean
    await sql`TRUNCATE laporan, log_interaksi RESTART IDENTITY CASCADE`;

    const now = new Date().toISOString();

    // 1. Seed Laporan
    const reports = [
      {
        isi_ringkas: "Dapatkan bantuan sosial subsidi energi Rp 600.000 dengan mendaftar di portal bansos-energi-xyz.com",
        modus_key: "bansos_palsu",
        wilayah_tag: "Sumatera",
        status: "jelas_penipuan",
        jumlah_serupa: 14,
        status_approval: "menunggu",
        dasar_verifikasi: "Domain penipuan terindikasi phising data pribadi",
        teks_peringatan: "🚨 BAHAYA! Link ini PENIPUAN bansos palsu.",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
      },
      {
        isi_ringkas: "Lapor, ada kelompok preman meresahkan pedagang di pasar Sokaraja, tolong ditertibkan.",
        modus_key: "premanisme",
        wilayah_tag: "Banyumas",
        status: "belum_pasti",
        jumlah_serupa: 5,
        status_approval: "menunggu",
        dasar_verifikasi: "Aduan format lokal diteruskan ke platform LaporGub Jawa Tengah.",
        teks_peringatan: "Aduan premanisme terkirim ke LaporGub Banyumas.",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        isi_ringkas: "Pendaftaran program BLT palsu mengatasnamakan Pemkab Cilacap di portal undian-cilacap.net.",
        modus_key: "bansos_palsu",
        wilayah_tag: "Cilacap",
        status: "jelas_penipuan",
        jumlah_serupa: 7,
        status_approval: "menunggu",
        dasar_verifikasi: "Domain tidak terdaftar di Kominfo sebagai situs resmi pemerintah.",
        teks_peringatan: "🚨 BAHAYA! Link ini terindikasi PENIPUAN phising bansos Cilacap.",
        timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
      },
      {
        isi_ringkas: "Link undian kupon PLN gratis daya 900VA mengarah ke situs judi online MAMAKSLOT.",
        modus_key: "judi_online",
        wilayah_tag: "Jakarta",
        status: "jelas_penipuan",
        jumlah_serupa: 32,
        status_approval: "disetujui",
        dasar_verifikasi: "Domain terdeteksi mengarah ke portal judi online (TrustPositif Komdigi)",
        teks_peringatan: "🚨 BAHAYA! Link tersebut mengarah ke situs judi online.",
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        isi_ringkas: "Pemberitahuan pemadaman listrik total se-Jawa Timur besok pagi dari jam 8 sampai jam 12.",
        modus_key: "hoaks_listrik",
        wilayah_tag: "Surabaya",
        status: "belum_pasti",
        jumlah_serupa: 8,
        status_approval: "menunggu",
        dasar_verifikasi: "Informasi diklarifikasi hoaks, PLN menyatakan jaringan dalam kondisi aman.",
        teks_peringatan: "⚠️ HOAKS! Pemadaman listrik se-Jawa Timur dibantah oleh Humas PLN.",
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
      },
      {
        isi_ringkas: "Pendaftaran BLT tunai Rp 1.200.000 lewat chat bot whatsapp, minta upload KTP dan KK.",
        modus_key: "phising_blt",
        wilayah_tag: "Makassar",
        status: "jelas_penipuan",
        jumlah_serupa: 9,
        status_approval: "menunggu",
        dasar_verifikasi: "Metode phising data kependudukan (KTP/KK).",
        teks_peringatan: "🚨 BAHAYA! Modus penipuan mengambil data pribadi KTP dan KK.",
        timestamp: new Date(Date.now() - 3600000 * 25).toISOString(),
      }
    ];

    for (const r of reports) {
      await sql`
        INSERT INTO laporan (isi_ringkas, modus_key, wilayah_tag, status, jumlah_serupa, status_approval, dasar_verifikasi, teks_peringatan, timestamp, updated_ts)
        VALUES (${r.isi_ringkas}, ${r.modus_key}, ${r.wilayah_tag}, ${r.status}, ${r.jumlah_serupa}, ${r.status_approval}, ${r.dasar_verifikasi}, ${r.teks_peringatan}, ${r.timestamp}, ${r.timestamp})
      `;
    }

    // 2. Seed Log Interaksi
    const logs = [
      {
        konteks: "0812-4455-8899",
        jenis: "cek_hoaks",
        aksi: "cek_url",
        label: "Komdigi TrustPositif",
        wilayah_tag: "nasional",
        ringkas_pesan: "Cek link bansos-energi-xyz.com",
        ringkas_resp: "Domain terindikasi phising bansos palsu",
        timestamp: new Date().toISOString(),
      },
      {
        konteks: "0857-1122-3344",
        jenis: "lapor_aduan",
        aksi: "catat_laporan",
        label: "LaporGub",
        wilayah_tag: "Banyumas",
        ringkas_pesan: "Ada preman di pasar Sokaraja",
        ringkas_resp: "Laporan dicatat dan diteruskan ke LaporGub Banyumas",
        timestamp: new Date(Date.now() - 60000).toISOString(),
      },
      {
        konteks: "0819-8877-6655",
        jenis: "cek_hoaks",
        aksi: "cek_url",
        label: "TrustPositif",
        wilayah_tag: "nasional",
        ringkas_pesan: "Cek link MAMAKSLOT",
        ringkas_resp: "Domain diblokir oleh Kominfo terindikasi perjudian",
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
      {
        konteks: "0821-3344-5566",
        jenis: "tanya_bansos",
        aksi: "cari_sumber_resmi",
        label: "DTKS Kemensos",
        wilayah_tag: "nasional",
        ringkas_pesan: "Apakah ada BLT BBM hari ini?",
        ringkas_resp: "Kemensos menyatakan belum ada pembagian BLT BBM baru",
        timestamp: new Date(Date.now() - 1200000).toISOString(),
      }
    ];

    for (const l of logs) {
      await sql`
        INSERT INTO log_interaksi (konteks, jenis, aksi, label, wilayah_tag, ringkas_pesan, ringkas_resp, timestamp)
        VALUES (${l.konteks}, ${l.jenis}, ${l.aksi}, ${l.label}, ${l.wilayah_tag}, ${l.ringkas_pesan}, ${l.ringkas_resp}, ${l.timestamp})
      `;
    }

    console.log("Supabase seeding completed successfully!");
  } catch (e) {
    console.error("Failed to seed Supabase:", e);
  } finally {
    await sql.end();
  }
}

seed();
