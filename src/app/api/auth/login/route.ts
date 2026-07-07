import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSession } from "@/app/lib/session";

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validUsername || !validPassword) {
    return NextResponse.json(
      { success: false, error: "ADMIN_USERNAME/ADMIN_PASSWORD belum dikonfigurasi di server." },
      { status: 500 }
    );
  }

  const ok = Boolean(username) && Boolean(password) && safeEqual(username, validUsername) && safeEqual(password, validPassword);

  if (!ok) {
    return NextResponse.json({ success: false, error: "Username atau password salah." }, { status: 401 });
  }

  await createSession(validUsername);
  return NextResponse.json({ success: true });
}
