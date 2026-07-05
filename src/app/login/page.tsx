"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    setTimeout(() => {
      if (username.trim() === "" || password.trim() === "") {
        setError("Username dan password wajib diisi.");
        setIsLoading(false);
      } else {
        router.push("/dashboard");
      }
    }, 600);
  };

  const fillMockCredentials = () => {
    setUsername("admin");
    setPassword("wartawarga2026");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Grid Pattern & Gradients */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(37,211,102,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(37,211,102,0.04),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(37,211,102,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,211,102,0.08)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] animate-[fade-up_0.6s_ease-out_both]">
        {/* Logos & Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/[0.04] bg-white/80 p-3 shadow-sm backdrop-blur-md">
            <img
              src="/logo.png"
              alt="WargaAI Logo"
              className="size-9 object-contain drop-shadow-[0_8px_20px_rgba(37,211,102,0.28)]"
            />
            <span className="text-lg font-extrabold tracking-[-0.02em] text-text-primary">
              WargaAI
            </span>
            <span className="h-5 w-px bg-black/[.08]" />
            <img
              src="/lks-nasional-logo.png"
              alt="LKS Nasional Logo"
              className="h-7 w-auto object-contain"
            />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-text-primary">
            Masuk ke Dashboard
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Kelola data verifikasi, RAG data, dan monitoring AI pipeline.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)] sm:p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-accent-red/10 p-3 text-xs font-semibold text-accent-red border border-accent-red/20 animate-shake">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                Username
              </label>
              <div className="mt-2">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="block w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-text-primary placeholder-black/30 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                  Password
                </label>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="block w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-text-primary placeholder-black/30 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative flex min-h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,211,102,0.2)] transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menghubungkan...
                </span>
              ) : (
                "Masuk Sekarang"
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs font-semibold text-text-muted hover:text-text-primary transition-all flex items-center justify-center gap-1.5"
          >
            ← Kembali ke Beranda
          </a>
        </div>
      </div>
    </main>
  );
}
