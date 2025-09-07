"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type SessionUser = { id: string; name: string; email: string; department: string; year: number; semester: number } | null;

export default function StudentAttendanceHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  const attendanceHistory = useQuery(
    api.attendance.getStudentAttendanceHistory,
    user ? { studentId: user.id as any } : undefined
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

  if (loading) return null;
  if (!user) return null;

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <Link href="/student/dashboard" className="text-white/80 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b">
            <h1 className="text-xl font-semibold text-slate-900">My Attendance History</h1>
          </div>
          
          <div className="p-6">
            {/* Student Info */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h2 className="text-lg font-medium mb-2">Student Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                <p><span className="font-medium">Name:</span> {user.name}</p>
                <p><span className="font-medium">Department:</span> {user.department}</p>
                <p><span className="font-medium">Year:</span> {user.year}</p>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                <span className="font-medium">Email:</span> {user.email}
              </p>
            </div>

            {/* Attendance Summary */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-sm font-medium text-green-800">Total Sessions Attended</h3>
                <p className="text-2xl font-bold text-green-600">
                  {attendanceHistory?.length || 0}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800">This Month</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {attendanceHistory?.filter(record => {
                    const recordDate = new Date(record.markedAt);
                    const now = new Date();
                    return recordDate.getMonth() === now.getMonth() && 
                           recordDate.getFullYear() === now.getFullYear();
                  }).length || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-sm font-medium text-purple-800">Last Attendance</h3>
                <p className="text-lg font-medium text-purple-600">
                  {attendanceHistory?.length ? 
                    new Date(attendanceHistory[0].markedAt).toLocaleDateString() : 
                    "None"
                  }
                </p>
              </div>
            </div>

            {/* Attendance Records */}
            <div>
              <h3 className="text-lg font-medium mb-4">Attendance Records</h3>
              {attendanceHistory === undefined ? (
                <p className="text-slate-700">Loading attendance history...</p>
              ) : attendanceHistory?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3 font-medium text-slate-900">#</th>
                        <th className="text-left p-3 font-medium text-slate-900">Session Title</th>
                        <th className="text-left p-3 font-medium text-slate-900">Department</th>
                        <th className="text-left p-3 font-medium text-slate-900">Year</th>
                        <th className="text-left p-3 font-medium text-slate-900">Date Attended</th>
                        <th className="text-left p-3 font-medium text-slate-900">Time</th>
                        <th className="text-left p-3 font-medium text-slate-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistory.map((record, index) => (
                        <tr key={record._id} className="border-b hover:bg-slate-50">
                          <td className="p-3 text-slate-600">{index + 1}</td>
                          <td className="p-3 font-medium">{record.session?.title || "N/A"}</td>
                          <td className="p-3 text-slate-600">{record.session?.department || "N/A"}</td>
                          <td className="p-3 text-slate-600">{record.session?.year || "N/A"}</td>
                          <td className="p-3 text-slate-600">
                            {new Date(record.markedAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-slate-600">
                            {new Date(record.markedAt).toLocaleTimeString()}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Present
                            </span>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No Attendance Records</h4>
                  <p className="text-slate-600">You haven't marked attendance for any sessions yet.</p>
                  <Link 
                    href="/student/dashboard" 
                    className="inline-block mt-4 px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              )}
            </div>

            {/* Export functionality for students */}
            {attendanceHistory?.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <button 
                  onClick={() => {
                    const csvContent = [
                      ['#', 'Session Title', 'Department', 'Year', 'Date Attended', 'Time', 'Status'],
                      ...attendanceHistory.map((record, index) => [
                        index + 1,
                        record.session?.title || 'N/A',
                        record.session?.department || 'N/A',
                        record.session?.year || 'N/A',
                        new Date(record.markedAt).toLocaleDateString(),
                        new Date(record.markedAt).toLocaleTimeString(),
                        'Present'
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `my-attendance-${user.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                >
                  Export My Records as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
