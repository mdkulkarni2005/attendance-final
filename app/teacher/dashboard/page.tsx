"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import QRCode from 'qrcode';

type SessionUser = { id: string; name: string; email: string } | null;

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  // Create/close session actions
  const createSession = useMutation(api.sessions.createSession as any);
  const closeSession = useMutation(api.sessions.closeSession as any);
  const generateQrToken = useMutation(api.sessions.generateQrToken as any);

  const sessions = useQuery(
    api.sessions.listTeacherSessions as any,
    user ? { teacherId: (user.id as any) } : undefined
  );

  const [form, setForm] = useState({ 
    title: "", 
    department: "Mechanical", 
    year: "3",
    locationType: "classroom", // classroom or lab
    allowedRadius: "100" // meters
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return; // Don't run on server side
    }

    const rawTeacher = sessionStorage.getItem("teacher");
    const rawStudent = sessionStorage.getItem("student");

    // If student is logged in but not teacher, redirect to student dashboard
    if (rawStudent && !rawTeacher) {
      router.replace("/student/dashboard");
      return;
    }

    // If no teacher session found, redirect to login
    if (!rawTeacher) {
      setLoading(false);
      router.replace("/teacher/login");
      return;
    }

    // Try to parse teacher data
    try {
      const teacherData = JSON.parse(rawTeacher);
      if (teacherData && teacherData.email) {
        setUser(teacherData);
      } else {
        // Invalid teacher data
        sessionStorage.removeItem("teacher");
        router.replace("/teacher/login");
        return;
      }
    } catch (error) {
      // Invalid JSON data
      sessionStorage.removeItem("teacher");
      router.replace("/teacher/login");
      return;
    }

    setLoading(false);
  }, [router]);

  function logout() {
    // Clear sessionStorage
    sessionStorage.removeItem("teacher");
    
    // Clear the authentication cookie
    document.cookie = "teacher-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Redirect to login page
    router.replace("/teacher/login");
  }

  async function getCurrentLocation() {
    setGettingLocation(true);
    setError(null);
    
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser. Please use a modern browser with location services.");
      }

      // Check current permission status first (for modern browsers)
      if ('permissions' in navigator) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
          console.log('🏫 Teacher location permission status:', permissionStatus.state);
        } catch (e) {
          console.log('🏫 Permission API not available, proceeding with direct request');
        }
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        // Enhanced options for mobile compatibility
        const options = {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout for mobile
          maximumAge: 30000 // Reduced cache time for mobile
        };

        console.log('🏫 Requesting teacher location with options:', options);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('🏫 Teacher location success:', pos);
            resolve(pos);
          },
          (error) => {
            console.log('🏫 Teacher location error:', error);
            reject(error);
          },
          options
        );
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      // Log teacher's location for debugging
      console.log('🏫 Teacher Location Captured:');
      console.log('Latitude:', latitude);
      console.log('Longitude:', longitude);
      console.log('Accuracy:', accuracy, 'meters');
      console.log('Location Type:', form.locationType);

      setCurrentLocation({ latitude, longitude, accuracy });
      
    } catch (error: any) {
      console.error("Failed to get location:", error);
      
      // Enhanced mobile-specific error handling for teachers
      if (error.code === 1) {
        setError("📱 Location Permission Required\n\nPlease:\n1. Enable location/GPS on your device\n2. Allow location access when prompted\n3. Check browser address bar for location icon\n4. Try again");
      } else if (error.code === 2) {
        setError("📡 Location unavailable. Please check GPS settings and try moving to an area with better signal.");
      } else if (error.code === 3) {
        setError("⏱️ Location request timed out. Please ensure GPS is enabled and try again.");
      } else {
        setError("Failed to get location. Please ensure location services are enabled.");
      }
    } finally {
      setGettingLocation(false);
    }
  }

  async function onCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    
    // Check if location is captured
    if (!currentLocation) {
      setError("Please capture your classroom/lab location first by clicking 'Get Current Location'");
      return;
    }
    
    setError(null);
    setBusy(true);
    try {
      await createSession({
        title: form.title || `${form.locationType === 'lab' ? 'Lab' : 'Classroom'} Attendance - ${form.department} Y${form.year}`,
        department: form.department,
        year: Number(form.year),
        teacherId: (user.id as any),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        allowedRadius: Number(form.allowedRadius),
      });
      
      // Reset form and location after successful creation
      setForm((f) => ({ ...f, title: "" }));
      setCurrentLocation(null);
      
      console.log(`✅ Session created with ${form.locationType} location:`, {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius: form.allowedRadius + 'm'
      });
      
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

  async function generateQRCode(sessionId: string) {
    try {
      if (!user) return;
      
      console.log('🔐 Generating secure QR token for session:', sessionId);
      
      // Generate secure, time-limited QR token
      const tokenData = await generateQrToken({
        sessionId: sessionId as any,
        teacherId: user.id as any
      });
      
      console.log('🔐 Secure token generated:', {
        token: tokenData.qrToken,
        expiry: new Date(tokenData.expiry).toLocaleTimeString(),
        duration: '5 minutes'
      });
      
      // Create secure QR code with token (not direct URL)
      const baseUrl = window.location.origin;
      const secureUrl = `${baseUrl}/student/qr-scanner?token=${tokenData.qrToken}`;
      
      const qrDataUrl = await QRCode.toDataURL(secureUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      setQrCodeDataUrl(qrDataUrl);
      setSelectedSessionId(sessionId);
      setShowQrModal(true);
      
    } catch (error) {
      console.error('Failed to generate secure QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    }
  }

  function closeQrModal() {
    setShowQrModal(false);
    setQrCodeDataUrl(null);
    setSelectedSessionId(null);
  }

  function copySessionUrl() {
    if (selectedSessionId) {
      const baseUrl = window.location.origin;
      const attendanceUrl = `${baseUrl}/student/attendance/${selectedSessionId}`;
      navigator.clipboard.writeText(attendanceUrl);
      alert('📋 Session URL copied to clipboard!');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </main>
    );
  }
  
  if (!user) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to access the teacher dashboard.</p>
          <button 
            onClick={() => router.replace("/teacher/login")}
            className="px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-gray-100"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

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
                
                {/* Location Status Display */}
                {currentLocation ? (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-green-800 font-medium">
                        📍 {form.locationType === 'lab' ? 'Lab' : 'Classroom'} Location Captured
                      </span>
                    </div>
                    <p className="text-sm text-green-700">
                      Radius: {form.allowedRadius}m • Accuracy: ±{Math.round(currentLocation.accuracy)}m
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-amber-800 font-medium">Location Required</span>
                    </div>
                    <p className="text-sm text-amber-700">
                      Please capture your {form.locationType} location before creating the session
                    </p>
                  </div>
                )}

                <form onSubmit={onCreateSession} className="space-y-4">
                  {/* Location Type and Radius Row */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-800 font-medium">Location Type</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={form.locationType}
                        onChange={(e) => setForm((f) => ({ ...f, locationType: e.target.value }))}
                      >
                        <option value="classroom">🏫 Classroom</option>
                        <option value="lab">🔬 Laboratory</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-800 font-medium">Allowed Radius (meters)</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={form.allowedRadius}
                        onChange={(e) => setForm((f) => ({ ...f, allowedRadius: e.target.value }))}
                      >
                        <option value="50">50m - Small Room</option>
                        <option value="100">100m - Standard</option>
                        <option value="150">150m - Large Hall</option>
                        <option value="200">200m - Campus Area</option>
                      </select>
                    </div>
                  </div>

                  {/* Location Capture Button */}
                  <div>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 616 0z" />
                      </svg>
                      {gettingLocation ? "Getting Location..." : 
                       currentLocation ? `Update ${form.locationType === 'lab' ? 'Lab' : 'Classroom'} Location` : 
                       `Capture Current ${form.locationType === 'lab' ? 'Lab' : 'Classroom'} Location`}
                    </button>
                  </div>

                  {/* Session Details Row */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm text-slate-800 font-medium">Title (Optional)</label>
                      <input
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder={`${form.locationType === 'lab' ? 'Lab' : 'Class'} session`}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-800 font-medium">Department</label>
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
                      <label className="text-sm text-slate-800 font-medium">Year</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={form.year}
                        onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                      >
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                  </div>

                  {/* Create Session Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={busy || !currentLocation}
                      className="w-full rounded-lg px-4 py-3 bg-slate-900 text-white disabled:opacity-60 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {busy ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating Session...
                        </>
                      ) : currentLocation ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create {form.locationType === 'lab' ? 'Lab' : 'Classroom'} Session
                        </>
                      ) : (
                        "📍 Capture Location First"
                      )}
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
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs">Status: {s.isOpen ? "🟢 Open" : "🔴 Closed"}</p>
                            {s.latitude && s.longitude && (
                              <p className="text-xs text-blue-600">
                                📍 Location Set • {s.allowedRadius || 100}m radius
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewAttendance(s._id)}
                            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                          >
                            View Attendance
                          </button>
                          {s.isOpen && (
                            <>
                              <button
                                onClick={() => generateQRCode(s._id)}
                                className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-sm flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                                QR Code
                              </button>
                              <button
                                onClick={() => onCloseSession(s._id)}
                                className="px-3 py-1.5 rounded border hover:bg-slate-50 text-sm"
                              >
                                Close
                              </button>
                            </>
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

          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{sessions?.length || 0}</p>
                <p className="text-sm text-slate-600">Total Sessions</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{sessions?.filter((s: any) => s.isOpen).length || 0}</p>
                <p className="text-sm text-slate-600">Active Sessions</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{sessions?.filter((s: any) => s.latitude && s.longitude).length || 0}</p>
                <p className="text-sm text-slate-600">Location-Based</p>
              </div>
            </div>
          </div>
        </section>

        {/* QR Code Modal */}
        {showQrModal && qrCodeDataUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">🔐 Secure QR Code</h2>
                <p className="text-sm text-slate-600 mb-4">
                  This QR code expires in <strong>5 minutes</strong> and requires physical presence
                </p>
                
                {/* Security Features Display */}
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">🛡️ Security Features</h3>
                  <ul className="text-xs text-green-700 space-y-1 text-left">
                    <li>• ⏰ Expires in 5 minutes</li>
                    <li>• 📍 Location verification required</li>
                    <li>• 🔒 Single-use per student</li>
                    <li>• 🚫 Cannot be shared or forwarded</li>
                  </ul>
                </div>
                
                {/* QR Code Display */}
                <div className="bg-white p-4 rounded-lg border-2 border-slate-200 mb-4 inline-block">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Secure QR Code for attendance" 
                    className="w-64 h-64 mx-auto"
                  />
                </div>
                
                {/* Session Info */}
                <div className="text-sm text-slate-600 mb-4">
                  <p>Session ID: <code className="bg-slate-100 px-2 py-1 rounded">{selectedSessionId}</code></p>
                  <p className="text-xs text-amber-600 mt-1">⚠️ Generate new QR if this one expires</p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => generateQRCode(selectedSessionId!)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh QR
                  </button>
                  <button
                    onClick={closeQrModal}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
                
                {/* Instructions */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
                  <h3 className="font-medium text-blue-900 mb-2">📋 For Students:</h3>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Click "📱 Scan QR Code" on student dashboard</li>
                    <li>2. Scan this QR code with your phone camera</li>
                    <li>3. Allow location access when prompted</li>
                    <li>4. Must be physically present in class/lab</li>
                    <li>5. Each student can only use QR once</li>
                  </ol>
                  <p className="text-xs text-blue-600 mt-2">
                    🔒 <strong>Security:</strong> QR codes cannot be shared or forwarded - location verification prevents remote attendance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
