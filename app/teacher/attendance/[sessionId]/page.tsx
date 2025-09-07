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

  const attendanceReport = useQuery(
    api.attendance.getSessionAttendanceReport,
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
  const toggleAttendanceStatus = async (record: any) => {
    if (!user) return;
    
    try {
      const newStatus = record.status === 'present' ? 'absent' : 'present';
      await setAttendanceStatus({
        sessionId: sessionId as any,
        studentId: record.studentId,
        status: newStatus,
        teacherId: user.id as any,
        note: `Manually changed from ${record.status} to ${newStatus} by teacher`,
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
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-sm font-medium text-green-800">Present</h3>
                <p className="text-2xl font-bold text-green-600">
                  {attendanceReport?.stats.present || 0}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-sm font-medium text-red-800">Absent</h3>
                <p className="text-2xl font-bold text-red-600">
                  {attendanceReport?.stats.absent || 0}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800">Attendance Rate</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {attendanceReport?.stats.presentPercentage || 0}%
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-medium text-slate-800">Last Attendance</h3>
                <p className="text-lg font-medium text-slate-600">
                  {attendanceReport?.attendance?.length ? 
                    new Date(Math.max(...attendanceReport.attendance.map(a => a.markedAt))).toLocaleTimeString() : 
                    "None"
                  }
                </p>
              </div>
            </div>

            {/* Attendance List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Student Attendance Records</h3>
                {session?.isOpen && (
                  <button
                    onClick={async () => {
                      if (!user) return;
                      try {
                        const result = await setAttendanceStatus({
                          sessionId: sessionId as any,
                          studentId: 'bulk-absent' as any, // This would need to be handled differently
                          status: 'absent',
                          teacherId: user.id as any,
                          note: 'Bulk absent marking'
                        });
                        console.log('Bulk absent marking result:', result);
                      } catch (error) {
                        console.error('Failed to mark bulk absent:', error);
                      }
                    }}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Mark All Missing as Absent
                  </button>
                )}
              </div>

              {/* Show all eligible students with their attendance status */}
              {attendanceReport && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Class Overview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700">Total Students: </span>
                      <span className="font-medium">{attendanceReport.stats.totalEligible}</span>
                    </div>
                    <div>
                      <span className="text-green-700">Present: </span>
                      <span className="font-medium">{attendanceReport.stats.present}</span>
                    </div>
                    <div>
                      <span className="text-red-700">Absent: </span>
                      <span className="font-medium">{attendanceReport.stats.absent}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Attendance Rate: </span>
                      <span className="font-medium">{attendanceReport.stats.presentPercentage}%</span>
                    </div>
                  </div>
                </div>
              )}

              {attendanceReport === undefined ? (
                <p className="text-slate-700">Loading attendance records...</p>
              ) : attendanceReport?.attendance?.length ? (
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
                      {attendanceReport.attendance
                        .sort((a: any, b: any) => a.markedAt - b.markedAt)
                        .map((record: any, index: number) => (
                        <tr key={record._id} className="border-b hover:bg-slate-50">
                          <td className="p-3 text-slate-600">{index + 1}</td>
                          <td className="p-3 font-medium">{record.student?.name || "N/A"}</td>
                          <td className="p-3 text-slate-600">{record.student?.sapId || "N/A"}</td>
                          <td className="p-3 text-slate-600">{record.student?.rollNo || "N/A"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'present' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status === 'present' ? '✓ Present' : '✗ Absent'}
                            </span>
                            {record.isManuallySet && (
                              <span className="ml-2 text-xs text-blue-600">(Manual)</span>
                            )}
                            {record.teacherNote && (
                              <div className="text-xs text-slate-500 mt-1">{record.teacherNote}</div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">
                            {new Date(record.markedAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => toggleAttendanceStatus(record)}
                              className={`px-2 py-1 rounded text-xs ${
                                record.status === 'present'
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              Mark {record.status === 'present' ? 'Absent' : 'Present'}
                            </button>
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
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No Attendance Records</h4>
                  <p className="text-slate-600">
                    {session?.isOpen 
                      ? "No students have marked their attendance for this session yet." 
                      : "This session is closed. Students who didn't attend have been marked absent."}
                  </p>
                  {session?.isOpen && (
                    <p className="text-sm text-blue-600 mt-2">
                      Generate a QR code from the dashboard for students to mark attendance.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Export/Actions */}
            {attendanceReport?.attendance && attendanceReport.attendance.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <button 
                  onClick={() => {
                    if (!attendanceReport?.attendance) return;
                    
                    const csvContent = [
                      ['#', 'Name', 'SAP ID', 'Roll No', 'Email', 'Status', 'Time Marked', 'Manual Override', 'Notes'],
                      ...attendanceReport.attendance.map((record: any, index: number) => [
                        index + 1,
                        record.student?.name || 'N/A',
                        record.student?.sapId || 'N/A',
                        record.student?.rollNo || 'N/A',
                        record.student?.email || 'N/A',
                        record.status,
                        new Date(record.markedAt).toLocaleString(),
                        record.isManuallySet ? 'Yes' : 'No',
                        record.teacherNote || ''
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `attendance-${session?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'session'}-${new Date().toISOString().split('T')[0]}.csv`;
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
