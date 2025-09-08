"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type SessionUser = { id: string; name: string; email: string; department: string; year: number; semester: number } | null;

export default function SecurityAlertsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  const securityAlerts = useQuery(
    api.deviceSecurity.getSecurityAlerts,
    user ? { studentId: user.id as any } : "skip"
  );

  const studentDevices = useQuery(
    api.deviceSecurity.getStudentDevices,
    user ? { studentId: user.id as any } : "skip"
  );

  const markAlertAsRead = useMutation(api.deviceSecurity.markAlertAsRead);
  const trustDevice = useMutation(api.deviceSecurity.trustDevice);

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

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await markAlertAsRead({ alertId: alertId as any });
    } catch (error) {
      console.error("Failed to mark alert as read:", error);
    }
  };

  const handleTrustDevice = async (deviceId: string) => {
    if (!user) return;
    
    try {
      await trustDevice({
        deviceId,
        studentId: user.id as any,
      });
      alert("Device trusted successfully!");
    } catch (error: any) {
      console.error("Failed to trust device:", error);
      alert(error?.message ?? "Failed to trust device");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  if (loading) return null;
  if (!user) return null;

  const unreadAlerts = securityAlerts?.filter(alert => !alert.isRead) || [];
  const readAlerts = securityAlerts?.filter(alert => alert.isRead) || [];
  const trustedDevices = studentDevices?.filter(device => device.isTrusted) || [];
  const untrustedDevices = studentDevices?.filter(device => !device.isTrusted) || [];

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <Link href="/student/dashboard" className="text-white/80 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b">
            <h1 className="text-xl font-semibold text-slate-900">🔒 Device Security</h1>
            <p className="text-sm text-slate-600 mt-1">Manage your devices and security alerts</p>
          </div>
          
          <div className="p-6">
            {/* Security Alerts */}
            <div className="mb-8">
              <h2 className="text-lg font-medium mb-4">🚨 Security Alerts</h2>
              
              {unreadAlerts.length === 0 && readAlerts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-2">🛡️</div>
                  <p>No security alerts. Your account is secure!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Unread Alerts */}
                  {unreadAlerts.map((alert) => (
                    <div
                      key={alert._id}
                      className={`p-4 rounded-lg border-2 ${getSeverityColor(alert.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                            <span className="font-medium text-sm uppercase tracking-wide">
                              {alert.severity} Priority
                            </span>
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                              NEW
                            </span>
                          </div>
                          <p className="text-sm mb-2">{alert.message}</p>
                          <p className="text-xs opacity-75">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleMarkAsRead(alert._id)}
                          className="ml-4 px-3 py-1 bg-white text-gray-700 text-xs rounded border hover:bg-gray-50"
                        >
                          Mark as Read
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Read Alerts */}
                  {readAlerts.length > 0 && (
                    <details className="mt-6">
                      <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800">
                        View {readAlerts.length} previous alerts
                      </summary>
                      <div className="mt-4 space-y-3">
                        {readAlerts.slice(0, 5).map((alert) => (
                          <div
                            key={alert._id}
                            className="p-3 rounded border border-gray-200 bg-gray-50 opacity-75"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span>{getSeverityIcon(alert.severity)}</span>
                              <span className="text-xs uppercase tracking-wide text-gray-600">
                                {alert.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{alert.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(alert.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Device Management */}
            <div>
              <h2 className="text-lg font-medium mb-4">📱 Your Devices</h2>
              
              {!studentDevices || studentDevices.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-2">📱</div>
                  <p>No devices registered yet.</p>
                  <p className="text-sm mt-1">Devices will appear here when you mark attendance.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Trusted Devices */}
                  {trustedDevices.map((device) => (
                    <div
                      key={device._id}
                      className="p-4 rounded-lg border border-green-200 bg-green-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">✅</span>
                            <span className="font-medium text-green-800">{device.deviceName}</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              Trusted
                            </span>
                          </div>
                          <div className="text-sm text-green-700 space-y-1">
                            <p>First seen: {new Date(device.firstSeen).toLocaleString()}</p>
                            <p>Last used: {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}</p>
                            {device.lastUsedForAttendance && (
                              <p>Last attendance: {new Date(device.lastUsedForAttendance).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Untrusted Devices */}
                  {untrustedDevices.map((device) => (
                    <div
                      key={device._id}
                      className="p-4 rounded-lg border border-amber-200 bg-amber-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">⚠️</span>
                            <span className="font-medium text-amber-800">{device.deviceName}</span>
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                              Not Trusted
                            </span>
                          </div>
                          <div className="text-sm text-amber-700 space-y-1">
                            <p>First seen: {new Date(device.firstSeen).toLocaleString()}</p>
                            <p>Last used: {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}</p>
                            {device.lastUsedForAttendance && (
                              <p>Last attendance: {new Date(device.lastUsedForAttendance).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleTrustDevice(device.deviceId)}
                          className="ml-4 px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
                        >
                          Trust Device
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Tips */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">🛡️ Security Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Only mark attendance from your personal devices</li>
                <li>• Report suspicious device alerts to your teacher immediately</li>
                <li>• Never share your login credentials with others</li>
                <li>• Trust devices only if you recognize them as your own</li>
                <li>• Log out from shared or public devices</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
