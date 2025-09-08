"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateDeviceFingerprint, generateClientDeviceId, setStoredDeviceId } from "@/utils/deviceFingerprint";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});

export default function StudentLoginPage() {
  const router = useRouter();
  const checkOwnership = useMutation(api.auth.checkDeviceOwnership);
  const secureLogin = useAction(api.auth.loginStudentWithDeviceCheck);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parse = loginSchema.safeParse(form);
    if (!parse.success) {
      setError(parse.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    try {
      // Build device fingerprint
      const fp = generateDeviceFingerprint();
      const deviceId = generateClientDeviceId();

      // Pre-check device ownership (blocks account switching on same device)
      const precheck = await checkOwnership({
        email: parse.data.email,
        deviceId,
        deviceFingerprint: {
          userAgent: fp.userAgent,
          screenResolution: fp.screenResolution,
          timezone: fp.timezone,
          language: fp.language,
          platform: fp.platform,
        },
      });

      if (!precheck.allowed) {
        setError(`This device is already registered to another student.\n\nOwner: ${precheck.ownerInfo}\nDevice: ${precheck.deviceName}`);
        return;
      }

      // Secure login with server-side device enforcement
      const result = await secureLogin({
        email: parse.data.email,
        password: parse.data.password,
        deviceId,
        deviceFingerprint: {
          userAgent: fp.userAgent,
          screenResolution: fp.screenResolution,
          timezone: fp.timezone,
          language: fp.language,
          platform: fp.platform,
        },
      });

      if (result?.success) {
        if (typeof window !== "undefined") {
          const session = { ...result.user };
          sessionStorage.setItem("student", JSON.stringify(session));
          const cookieValue = JSON.stringify(session);
          const expires = new Date();
          expires.setDate(expires.getDate() + 7);
          document.cookie = `student-session=${encodeURIComponent(cookieValue)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
          setStoredDeviceId(result.user.deviceId || deviceId);
          // Mark this device as owned by this student for middleware/UI
          const ownerExp = new Date();
          ownerExp.setFullYear(ownerExp.getFullYear() + 1);
          document.cookie = `device-owner=${encodeURIComponent(session.id)}; expires=${ownerExp.toUTCString()}; path=/; SameSite=Lax`;
        }
        router.push("/student/dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-8">
          <h1 className="text-3xl font-semibold mb-2">Student Login</h1>
          <p className="text-slate-600 mb-6">Welcome back. Please sign in.</p>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm text-slate-700">Email</label>
              <input
                type="email"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                name="email"
                value={form.email}
                onChange={onChange}
                required
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-slate-700">Password</label>
              <input
                type="password"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                name="password"
                value={form.password}
                onChange={onChange}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 whitespace-pre-line" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-700 text-white disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <p className="text-sm text-slate-600">
              Don't have an account?{" "}
              <Link href="/student/register" className="underline">Register</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
