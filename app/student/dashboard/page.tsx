"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type SessionUser = { id: string; name: string; email: string; department: string; year: number; semester: number } | null;

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
    // Clear sessionStorage
    sessionStorage.removeItem("student");
    
    // Clear the authentication cookie
    document.cookie = "student-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Redirect to login page
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
          {/* QR Scanner Quick Access */}
          <div className="md:col-span-3 mb-4">
            <Link 
              href="/student/qr-scanner"
              className="block w-full p-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl shadow-lg hover:from-green-700 hover:to-green-800 transition-all"
            >
              <div className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">📱 Scan QR Code</h3>
                  <p className="text-green-100 text-sm">Quick access to attendance sessions</p>
                </div>
              </div>
            </Link>
          </div>

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
                <li><Link href="/student/attendance-history" className="hover:underline">My Attendance Records</Link></li>
                <li><Link href="/student/profile" className="hover:underline">Profile</Link></li>
                <li><Link href="/student/courses" className="hover:underline">Courses</Link></li>
                <li><Link href="/student/help" className="hover:underline">Help</Link></li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
