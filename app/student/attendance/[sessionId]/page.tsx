"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type SessionUser = { id: string; name: string; email: string; department: string; year: number; semester: number } | null;

export default function StudentAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const markAttendance = useMutation(api.attendance.markAttendance);
  
  const session = useQuery(
    api.sessions.getSession,
    sessionId ? { sessionId: sessionId as any } : undefined
  );

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

  async function handleMarkAttendance() {
    if (!user || !sessionId) return;
    setSubmitting(true);
    try {
      await markAttendance({
        sessionId: sessionId as any,
        studentId: user.id as any,
      });
      setSuccess(true);
    } catch (error: any) {
      console.error("Failed to mark attendance:", error);
      alert(error?.message ?? "Failed to mark attendance");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (!user) return null;

  if (!session) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-8 text-center">
            <h1 className="text-2xl font-semibold mb-4">Session Not Found</h1>
            <p className="text-slate-600 mb-6">The attendance session you're looking for doesn't exist or has been closed.</p>
            <Link href="/student/dashboard" className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!session.isOpen) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-8 text-center">
            <h1 className="text-2xl font-semibold mb-4">Session Closed</h1>
            <p className="text-slate-600 mb-6">This attendance session has been closed and is no longer accepting attendance.</p>
            <Link href="/student/dashboard" className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-4 text-green-600">Attendance Marked!</h1>
            <p className="text-slate-600 mb-6">Your attendance has been successfully recorded for this session.</p>
            <Link href="/student/dashboard" className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <Link href="/student/dashboard" className="text-white/80 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b">
            <h1 className="text-xl font-semibold text-slate-900">Mark Attendance</h1>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-2">{session.title}</h2>
              <p className="text-slate-600">{session.department} • Year {session.year}</p>
              <p className="text-sm text-slate-500 mt-1">
                Created: {new Date(session.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium mb-2">Student Information</h3>
              <p className="text-sm text-slate-600">Name: {user.name}</p>
              <p className="text-sm text-slate-600">Email: {user.email}</p>
              <p className="text-sm text-slate-600">Department: {user.department} • Year {user.year}</p>
            </div>

            <button
              onClick={handleMarkAttendance}
              disabled={submitting}
              className="w-full px-4 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Marking Attendance..." : "Mark My Attendance"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
