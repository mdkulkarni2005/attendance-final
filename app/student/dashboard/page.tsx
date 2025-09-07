"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type SessionUser = { id: string; name: string; email: string; department: string; year: number } | null;

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = typeof window !== "undefined" && sessionStorage.getItem("student");
    if (!raw) {
      router.replace("/student/login");
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem("student");
      router.replace("/student/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const sessions = useQuery(
    api.sessions.listOpenForStudent,
    user ? ({ studentId: user.id } as any) : undefined
  );

  function logout() {
    sessionStorage.removeItem("student");
    router.replace("/student/login");
  }

  function handleOpenSession(sessionId: string) {
    // Navigate to attendance page for this session
    router.push(`/student/attendance/${sessionId}`);
  }

  if (loading) return null;
  if (!user) return null;

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-white">Student Dashboard</h1>
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
              <h2 className="text-base font-semibold text-slate-900">Open Attendance Sessions for You</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {sessions === undefined ? (
                  <p className="text-slate-700">Loading sessions…</p>
                ) : sessions?.length ? (
                  sessions.map((s) => (
                    <div key={s._id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-sm text-slate-800">{s.department} • Year {s.year}</p>
                      </div>
                      <button 
                        onClick={() => handleOpenSession(s._id)}
                        className="px-3 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-700">No open sessions right now.</p>
                )}
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
                <li><a className="hover:underline" href="#">Profile</a></li>
                <li><a className="hover:underline" href="#">Courses</a></li>
                <li><a className="hover:underline" href="#">Help</a></li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
