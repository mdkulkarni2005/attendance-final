"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setAuthCookie } from "@/utils/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});

export default function StudentLoginPage() {
  const router = useRouter();
  const login = useAction(api.auth.loginStudentAction);
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
      const user = await login(parse.data);
      if (typeof window !== "undefined") {
        // Store in sessionStorage for backward compatibility
        sessionStorage.setItem("student", JSON.stringify(user));
        
        // Also store in cookies for middleware
        const cookieValue = JSON.stringify(user);
        const expires = new Date();
        expires.setDate(expires.getDate() + 7); // 7 days
        document.cookie = `student-session=${encodeURIComponent(cookieValue)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      }
      router.push("/student/dashboard");
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
              <p className="text-sm text-red-600" role="alert">
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
              <Link href="/student/register" className="underline">
                Register
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
