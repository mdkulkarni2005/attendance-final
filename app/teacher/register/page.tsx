"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

const teacherSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10).max(15),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});

export default function TeacherRegisterPage() {
  const router = useRouter();
  const register = useAction(api.auth.registerTeacherAction);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parse = teacherSchema.safeParse(form);
    if (!parse.success) {
      setError(parse.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    try {
      await register(parse.data);
      router.push("/teacher/login");
    } catch (err: any) {
      setError(err?.message ?? "Failed to register");
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
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-8">
          <h1 className="text-3xl font-semibold mb-2">Create teacher account</h1>
          <p className="text-slate-600 mb-6">Register to manage attendance.</p>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm text-slate-700">Name</label>
              <input
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                name="name"
                value={form.name}
                onChange={onChange}
                required
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-slate-700">Phone</label>
              <input
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                name="phone"
                value={form.phone}
                onChange={onChange}
                required
              />
            </div>
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
              {loading ? "Registering..." : "Register"}
            </button>
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/teacher/login" className="underline">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
