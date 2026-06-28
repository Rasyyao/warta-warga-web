"use client";

import { useState } from "react";

export default function AgentsPage() {
  const [tempPenjagaKb, setTempPenjagaKb] = useState(0.2);
  const [tempOtakPercakapan, setTempOtakPercakapan] = useState(0.7);

  return (
    <div className="max-w-2xl space-y-6 animate-[fade-up_0.4s_ease-out_both]">
      <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-text-primary">LLM Parameter Toggles</h3>
        <p className="text-xs text-text-muted leading-relaxed">
          Sesuaikan parameter perilaku 2-Agent pipeline JagaWarga untuk mengontrol akurasi dan kreativitas respons model.
        </p>

        <div className="space-y-6 border-t border-black/[0.06] pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-primary">Agent 1: Penjaga KB (Knowledge Base)</label>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">Temp: {tempPenjagaKb}</span>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Agent 1 membutuhkan konsistensi tinggi untuk memverifikasi URL dan mencocokkan dokumen RAG resmi. Disarankan menggunakan temperatur rendah (0.1 - 0.3).
            </p>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={tempPenjagaKb}
              onChange={(e) => setTempPenjagaKb(parseFloat(e.target.value))}
              className="w-full accent-primary mt-2 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-primary">Agent 2: Otak Percakapan (RAG Agent)</label>
              <span className="rounded bg-accent-blue/10 px-2 py-0.5 text-xs font-bold text-accent-blue">Temp: {tempOtakPercakapan}</span>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Agent 2 mengobrol dengan warga dan menyusun saran respons format WhatsApp. Temperatur medium (0.6 - 0.8) disarankan untuk respons yang luwes.
            </p>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={tempOtakPercakapan}
              onChange={(e) => setTempOtakPercakapan(parseFloat(e.target.value))}
              className="w-full accent-accent-blue mt-2 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-text-primary">Defense-in-Depth Safety Stack</h3>
        <p className="text-xs text-text-muted leading-relaxed">Status layer perlindungan data pribadi dan perlindungan prompt injection:</p>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          <span className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center text-xs font-semibold text-primary">
            L1: PII Scrub (Aktif)
          </span>
          <span className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center text-xs font-semibold text-primary">
            L2: Injection Block (Aktif)
          </span>
          <span className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center text-xs font-semibold text-primary">
            L3: RAG Matcher (Aktif)
          </span>
          <span className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center text-xs font-semibold text-primary">
            L4: URL Check (Aktif)
          </span>
          <span className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center text-xs font-semibold text-primary">
            L5: Ticket Dispatch (Aktif)
          </span>
          <span className="rounded-xl border border-black/10 bg-black/[0.02] p-3 text-center text-xs font-semibold text-text-muted">
            L6: Human Moderation
          </span>
        </div>
      </div>
    </div>
  );
}
