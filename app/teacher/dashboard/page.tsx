"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type SessionUser = { id: string; name: string; email: string } | null;

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  // Create/close session actions
  const createSession = useMutation(api.sessions.createSession as any);
  const closeSession = useMutation(api.sessions.closeSession as any);

  const sessions = useQuery(
    api.sessions.listTeacherSessions as any,
    user ? { teacherId: (user.id as any) } : undefined
  );

  const [form, setForm] = useState({ title: "", department: "Mechanical", year: "3" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const rawTeacher = typeof window !== "undefined" && sessionStorage.getItem("teacher");
    const rawStudent = typeof window !== "undefined" && sessionStorage.getItem("student");

    if (rawStudent && !rawTeacher) {
      router.replace("/student/dashboard");
      return;
    }

    if (!rawTeacher) {
      router.replace("/teacher/login");
      return;
    }
    try {
      setUser(JSON.parse(rawTeacher as string));
    } catch {
      sessionStorage.removeItem("teacher");
      router.replace("/teacher/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  function logout() {
    sessionStorage.removeItem("teacher");
    router.replace("/teacher/login");
  }

  async function onCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setBusy(true);
    try {
      await createSession({
        title: form.title || `Attendance - ${form.department} Y${form.year}`,
        department: form.department,
        year: Number(form.year),
        teacherId: (user.id as any),
      });
      setForm((f) => ({ ...f, title: "" }));
    } catch (err: any) {
      setError(err?.message ?? "Failed to create session");
    } finally {
      setBusy(false);
    }
  }

  async function onCloseSession(sessionId: string) {
    if (!user) return;
    try {
      await closeSession({ sessionId: sessionId as any, teacherId: (user.id as any) });
    } catch (err) {
      // ignore in UI
    }
  }

  function handleViewAttendance(sessionId: string) {
    router.push(`/teacher/attendance/${sessionId}`);
  }

  if (loading) return null;
  if (!user) return null;

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-white">Teacher Dashboard</h1>
            <p className="text-white/70">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-white/80 hover:text-white hover:underline">Home</Link>
            <button onClick={logout} className="px-3 py-1.5 rounded bg-white text-slate-900">Logout</button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="-mx-0 -mt-0 px-6 py-3 bg-slate-50 border-b rounded-t-2xl">
              <h2 className="text-base font-semibold text-slate-900">Manage Attendance Sessions</h2>
            </div>
            <div className="p-6">
              <div className="mt-0">
                <h3 className="text-lg font-medium mb-3 text-black">Create Attendance Session</h3>
                <form onSubmit={onCreateSession} className="grid sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-sm text-slate-800">Title</label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Morning attendance"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-800">Department</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={form.department}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    >
                      <option>Mechanical</option>
                      <option>Computer</option>
                      <option>Electrical</option>
                      <option>Civil</option>
                      <option>Electronics</option>
                      <option>Chemical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-800">Year</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={form.year}
                      onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                    </select>
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full rounded-lg px-4 py-2 bg-slate-900 text-white disabled:opacity-60"
                    >
                      {busy ? "Creating..." : "Create"}
                    </button>
                  </div>
                </form>
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
              </div>

              <div className="mt-10">
                <div className="space-y-3">
                  {sessions === undefined ? (
                    <p className="text-slate-700">Loading sessions…</p>
                  ) : sessions?.length ? (
                    sessions.map((s: any) => (
                      <div key={s._id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{s.title}</p>
                          <p className="text-sm text-slate-800">{s.department} • Year {s.year}</p>
                          <p className="text-xs mt-1">Status: {s.isOpen ? "Open" : "Closed"}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewAttendance(s._id)}
                            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                          >
                            View Attendance
                          </button>
                          {s.isOpen && (
                            <button
                              onClick={() => onCloseSession(s._id)}
                              className="px-3 py-1.5 rounded border hover:bg-slate-50 text-sm"
                            >
                              Close
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-700">No sessions yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="-mx-0 -mt-0 px-6 py-3 bg-slate-50 border-b rounded-t-2xl">
              <h3 className="text-base font-semibold text-slate-900">Your Info</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-800">Email: {user.email}</p>
              <p className="text-slate-800 mt-1">ID: {user.id}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="-mx-0 -mt-0 px-6 py-3 bg-slate-50 border-b rounded-t-2xl">
              <h3 className="text-base font-semibold text-slate-900">Quick Links</h3>
            </div>
            <div className="p-6">
              <ul className="space-y-2 text-sm text-slate-800">
                <li><a className="hover:underline" href="#">My Classes</a></li>
                <li><a className="hover:underline" href="#">Create Session</a></li>
                <li><a className="hover:underline" href="#">Help</a></li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
