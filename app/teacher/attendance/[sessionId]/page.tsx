"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type SessionUser = { id: string; name: string; email: string } | null;

export default function TeacherAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  const session = useQuery(
    api.sessions.getSession,
    sessionId ? { sessionId: sessionId as any } : undefined
  );

  const attendance = useQuery(
    api.attendance.getSessionAttendance,
    sessionId ? { sessionId: sessionId as any } : undefined
  );

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

  if (loading) return null;
  if (!user) return null;

  if (!session) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-8 text-center">
            <h1 className="text-2xl font-semibold mb-4">Session Not Found</h1>
            <p className="text-slate-600 mb-6">The session you're looking for doesn't exist.</p>
            <Link href="/teacher/dashboard" className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Check if teacher owns this session
  if (session.teacherId !== user.id) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-8 text-center">
            <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
            <p className="text-slate-600 mb-6">You don't have permission to view this session's attendance.</p>
            <Link href="/teacher/dashboard" className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <Link href="/teacher/dashboard" className="text-white/80 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b">
            <h1 className="text-xl font-semibold text-slate-900">Attendance Records</h1>
          </div>
          
          <div className="p-6">
            {/* Session Info */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h2 className="text-lg font-medium mb-2">{session.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                <p><span className="font-medium">Department:</span> {session.department}</p>
                <p><span className="font-medium">Year:</span> {session.year}</p>
                <p><span className="font-medium">Status:</span> {session.isOpen ? "Open" : "Closed"}</p>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Created: {new Date(session.createdAt).toLocaleString()}
                {session.closedAt && (
                  <span> • Closed: {new Date(session.closedAt).toLocaleString()}</span>
                )}
              </p>
            </div>

            {/* Attendance Summary */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-sm font-medium text-green-800">Total Present</h3>
                <p className="text-2xl font-bold text-green-600">
                  {attendance?.length || 0}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800">Session Status</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {session.isOpen ? "Active" : "Closed"}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-medium text-slate-800">Last Attendance</h3>
                <p className="text-lg font-medium text-slate-600">
                  {attendance?.length ? 
                    new Date(Math.max(...attendance.map(a => a.markedAt))).toLocaleTimeString() : 
                    "None"
                  }
                </p>
              </div>
            </div>

            {/* Attendance List */}
            <div>
              <h3 className="text-lg font-medium mb-4">Students Present</h3>
              {attendance === undefined ? (
                <p className="text-slate-700">Loading attendance records...</p>
              ) : attendance?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3 font-medium text-slate-900">#</th>
                        <th className="text-left p-3 font-medium text-slate-900">Name</th>
                        <th className="text-left p-3 font-medium text-slate-900">SAP ID</th>
                        <th className="text-left p-3 font-medium text-slate-900">Roll No</th>
                        <th className="text-left p-3 font-medium text-slate-900">Email</th>
                        <th className="text-left p-3 font-medium text-slate-900">Time Marked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance
                        .sort((a, b) => a.markedAt - b.markedAt)
                        .map((record, index) => (
                        <tr key={record._id} className="border-b hover:bg-slate-50">
                          <td className="p-3 text-slate-600">{index + 1}</td>
                          <td className="p-3 font-medium">{record.student?.name || "N/A"}</td>
                          <td className="p-3 text-slate-600">{record.student?.sapId || "N/A"}</td>
                          <td className="p-3 text-slate-600">{record.student?.rollNo || "N/A"}</td>
                          <td className="p-3 text-slate-600">{record.student?.email || "N/A"}</td>
                          <td className="p-3 text-slate-600">
                            {new Date(record.markedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No Attendance Yet</h4>
                  <p className="text-slate-600">No students have marked their attendance for this session.</p>
                </div>
              )}
            </div>

            {/* Export/Actions */}
            {attendance?.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <button 
                  onClick={() => {
                    const csvContent = [
                      ['#', 'Name', 'SAP ID', 'Roll No', 'Email', 'Time Marked'],
                      ...attendance.map((record, index) => [
                        index + 1,
                        record.student?.name || 'N/A',
                        record.student?.sapId || 'N/A',
                        record.student?.rollNo || 'N/A',
                        record.student?.email || 'N/A',
                        new Date(record.markedAt).toLocaleString()
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `attendance-${session.title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
