"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type SessionUser = { id: string; name: string; email: string } | null;

export default function TeacherAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  // Add mutation for manual attendance management
  const setAttendanceStatus = useMutation(api.attendance.setAttendanceStatus);

  const session = useQuery(
    api.sessions.getSession,
    sessionId ? { sessionId: sessionId as any } : "skip"
  );

  // Live roster (all students in dept/year with current status)
  const rosterLive = useQuery(
    api.attendance.getSessionRosterLive,
    sessionId ? { sessionId: sessionId as any } : "skip"
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

  // Add function to toggle attendance status
  const toggleAttendanceStatus = async (entry: any) => {
    if (!user) return;
    try {
      const newStatus = entry.status === 'present' ? 'absent' : 'present';
      await setAttendanceStatus({
        sessionId: sessionId as any,
        studentId: entry.student?._id || entry.studentId,
        status: newStatus,
        teacherId: user.id as any,
        note: `Manually changed to ${newStatus} by teacher`,
      });
    } catch (error) {
      console.error('Failed to update attendance:', error);
      alert('Failed to update attendance status');
    }
  };

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
          <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-900">Attendance (Live Roster)</h1>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Live</span>
          </div>
          
          <div className="p-6">
            {/* Session Info */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h2 className="text-lg font-medium mb-2">{rosterLive?.session?.title || session?.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                <p><span className="font-medium">Department:</span> {rosterLive?.session?.department || session?.department}</p>
                <p><span className="font-medium">Year:</span> {rosterLive?.session?.year || session?.year}</p>
                <p><span className="font-medium">Status:</span> {(rosterLive?.session?.isOpen ?? session?.isOpen) ? "Open" : "Closed"}</p>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Created: {new Date((rosterLive?.session?.createdAt ?? session?.createdAt) || Date.now()).toLocaleString()}
                {((rosterLive?.session?.closedAt ?? session?.closedAt) as number | undefined) && (
                  <span> • Closed: {new Date((rosterLive?.session?.closedAt ?? session?.closedAt) as number).toLocaleString()}</span>
                )}
              </p>
            </div>

            {/* Summary */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-sm font-medium text-green-800">Present</h3>
                <p className="text-2xl font-bold text-green-600">{rosterLive?.stats.present || 0}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-sm font-medium text-red-800">Absent</h3>
                <p className="text-2xl font-bold text-red-600">{rosterLive?.stats.absent || 0}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800">Attendance Rate</h3>
                <p className="text-2xl font-bold text-blue-600">{rosterLive?.stats.presentPercentage || 0}%</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-medium text-slate-800">Total Students</h3>
                <p className="text-2xl font-bold text-slate-700">{rosterLive?.stats.totalEligible || 0}</p>
              </div>
            </div>

            {/* Live Roster Table */}
            {rosterLive === undefined ? (
              <p className="text-slate-700">Loading roster…</p>
            ) : rosterLive?.roster?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 font-medium text-slate-900">#</th>
                      <th className="text-left p-3 font-medium text-slate-900">Name</th>
                      <th className="text-left p-3 font-medium text-slate-900">SAP ID</th>
                      <th className="text-left p-3 font-medium text-slate-900">Roll No</th>
                      <th className="text-left p-3 font-medium text-slate-900">Status</th>
                      <th className="text-left p-3 font-medium text-slate-900">Time</th>
                      <th className="text-left p-3 font-medium text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterLive.roster
                      .sort((a: any, b: any) => (a.student.rollNo || '').localeCompare(b.student.rollNo || ''))
                      .map((entry: any, idx: number) => (
                      <tr key={entry.student._id} className="border-b hover:bg-slate-50">
                        <td className="p-3 text-slate-600">{idx + 1}</td>
                        <td className="p-3 font-medium">{entry.student.name}</td>
                        <td className="p-3 text-slate-600">{entry.student.sapId}</td>
                        <td className="p-3 text-slate-600">{entry.student.rollNo}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${entry.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {entry.status === 'present' ? '✓ Present' : '✗ Absent'}
                          </span>
                          {entry.isManuallySet && (
                            <span className="ml-2 text-xs text-blue-600">(Manual)</span>
                          )}
                          {entry.teacherNote && (
                            <div className="text-xs text-slate-500 mt-1">{entry.teacherNote}</div>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{entry.markedAt ? new Date(entry.markedAt).toLocaleString() : '-'}</td>
                        <td className="p-3">
                          <button
                            onClick={() => toggleAttendanceStatus(entry)}
                            className={`px-2 py-1 rounded text-xs ${entry.status === 'present' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                          >
                            Mark {entry.status === 'present' ? 'Absent' : 'Present'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-700">No students found for this class.</p>
            )}

            {/* Export based on roster */}
            {rosterLive?.roster && rosterLive.roster.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    const csvContent = [
                      ['#', 'Name', 'SAP ID', 'Roll No', 'Email', 'Status', 'Time Marked'],
                      ...rosterLive.roster.map((entry: any, index: number) => [
                        index + 1,
                        entry.student?.name || 'N/A',
                        entry.student?.sapId || 'N/A',
                        entry.student?.rollNo || 'N/A',
                        entry.student?.email || 'N/A',
                        entry.status,
                        entry.markedAt ? new Date(entry.markedAt).toLocaleString() : ''
                      ])
                    ].map(row => row.join(',')).join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `attendance-${(rosterLive?.session?.title || 'session').replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
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
