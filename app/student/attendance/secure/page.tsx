"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type SessionUser = { id: string; name: string; email: string; department: string; year: number; semester: number } | null;

export default function SecureAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrToken = searchParams.get('token');
  
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');

  const markAttendanceWithQr = useMutation(api.attendance.markAttendanceWithQr);
  
  // Validate QR token
  const tokenValidation = useQuery(
    api.sessions.validateQrToken,
    qrToken ? { qrToken } : "skip"
  );

  useEffect(() => {
    // Check if QR token is provided
    if (!qrToken) {
      router.replace("/student/qr-scanner");
      return;
    }

    // Get user session
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

    // Check location permission status on load
    checkLocationPermission();
  }, [router, qrToken]);

  async function checkLocationPermission() {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      return;
    }

    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(permission.state as any);
        console.log('📱 Location permission status:', permission.state);
        
        permission.onchange = () => {
          setLocationPermission(permission.state as any);
          console.log('📱 Location permission changed to:', permission.state);
        };
      } catch (e) {
        console.log('📱 Permission API not available');
        setLocationPermission('unknown');
      }
    }
  }

  async function requestLocationPermission() {
    try {
      console.log('📱 Manually requesting location permission...');
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });

      console.log('📱 Location permission granted:', position.coords);
      setLocationPermission('granted');
      alert('✅ Location permission granted! You can now mark attendance.');
      
    } catch (error: any) {
      console.error('📱 Location permission error:', error);
      setLocationPermission('denied');
      
      if (error.code === 1) {
        alert(`📱 Permission Denied\n\nTo enable location:\n1. Click the location icon in your browser's address bar\n2. Select "Allow"\n3. Refresh the page`);
      }
    }
  }

  async function handleMarkAttendance() {
    if (!user || !qrToken) return;
    
    setSubmitting(true);
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser. Please use a modern browser with location services.");
      }

      // Get location with enhanced mobile support
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const options = {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000
        };

        console.log('📱 Requesting location for secure attendance...');

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('📱 Location success:', pos);
            resolve(pos);
          },
          (error) => {
            console.log('📱 Location error:', error);
            reject(error);
          },
          options
        );
      });

      const { latitude, longitude } = position.coords;

      // Log the captured coordinates for debugging
      console.log('📍 Student Location Captured:');
      console.log('Latitude:', latitude);
      console.log('Longitude:', longitude);
      console.log('Accuracy:', position.coords.accuracy, 'meters');
      console.log('QR Token:', qrToken);

      // Send attendance with QR token and location data
      const result = await markAttendanceWithQr({
        qrToken,
        studentId: user.id as any,
        studentLatitude: latitude,
        studentLongitude: longitude,
      });

      setSuccess(true);
      
      // Show distance information if available
      if (result.distance !== undefined) {
        console.log(`✅ Secure attendance marked! Distance: ${result.distance} meters from teacher.`);
      }
      
    } catch (error: any) {
      console.error("Failed to mark attendance:", error);
      
      // Enhanced mobile-specific error handling
      if (error.code === 1) {
        alert(`📱 Location Permission Required\n\nTo mark attendance, please:\n1. Enable location/GPS on your device\n2. Allow location access when prompted\n3. Try again\n\nNote: QR codes require physical presence verification.`);
      } else if (error.code === 2) {
        alert(`📡 Location Not Available\n\nPlease:\n1. Make sure GPS is enabled\n2. Try moving to an area with better signal\n3. QR attendance requires precise location`);
      } else if (error.code === 3) {
        alert(`⏱️ Location Request Timed Out\n\nPlease ensure good GPS signal and try again.`);
      } else {
        alert(error?.message ?? "Failed to mark attendance. Please ensure you are physically present and location services are enabled.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (!user) return null;

  // Show token validation error
  if (tokenValidation !== undefined && !tokenValidation.valid) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-red-200 bg-red-50 shadow-lg p-8 text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h1 className="text-2xl font-semibold mb-4 text-red-700">🔒 QR Code Issue</h1>
            <p className="text-red-600 mb-6 text-lg">{tokenValidation.reason}</p>
            <div className="space-y-3">
              <Link href="/student/qr-scanner" className="block px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                🔄 Scan New QR Code
              </Link>
              <Link href="/student/dashboard" className="block px-4 py-2 rounded border border-slate-300 hover:bg-slate-50">
                📱 Back to Dashboard
              </Link>
            </div>
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">💡 Common Issues:</h3>
              <ul className="text-sm text-yellow-700 text-left space-y-1">
                <li>• QR code expired (5 minute limit)</li>
                <li>• QR code already used by you</li>
                <li>• Session was closed by teacher</li>
                <li>• QR code was shared/forwarded (security violation)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Show success page
  if (success) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-green-200 bg-green-50 shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-4 text-green-700">🔐 Secure Attendance Marked!</h1>
            <p className="text-green-600 mb-6">Your attendance has been successfully recorded with location verification.</p>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">✅ Verification Complete:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• QR token validated</li>
                <li>• Physical presence confirmed</li>
                <li>• Location within allowed range</li>
                <li>• Attendance securely recorded</li>
              </ul>
            </div>
            <Link href="/student/dashboard" className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Show attendance marking page
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
            <h1 className="text-xl font-semibold text-slate-900">🔐 Secure QR Attendance</h1>
          </div>
          
          <div className="p-6">
            {tokenValidation && tokenValidation.valid && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-2">{tokenValidation.title}</h2>
                <p className="text-slate-600">{tokenValidation.department} • Year {tokenValidation.year}</p>
              </div>
            )}

            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium mb-2">Student Information</h3>
              <p className="text-sm text-slate-600">Name: {user.name}</p>
              <p className="text-sm text-slate-600">Email: {user.email}</p>
              <p className="text-sm text-slate-600">Department: {user.department} • Year {user.year}</p>
            </div>

            {/* Security Notice */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-medium mb-2 text-amber-900">🔒 Security Verification</h3>
              <p className="text-sm text-amber-700 mb-3">
                This QR code requires physical presence verification. You must be within {tokenValidation?.allowedRadius || 100} meters of the class location.
              </p>
              
              {/* Location Permission Status */}
              <div className="mb-3">
                {locationPermission === 'granted' ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">✅ Location permission granted</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">❌ Location permission required</span>
                  </div>
                )}
              </div>

              {locationPermission !== 'granted' && (
                <button
                  onClick={requestLocationPermission}
                  className="w-full mb-3 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  📱 Enable Location Access
                </button>
              )}
            </div>

            <button
              onClick={handleMarkAttendance}
              disabled={submitting || !tokenValidation?.valid}
              className="w-full px-4 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {submitting ? "Verifying Location & Marking..." : "🔐 Mark Secure Attendance"}
            </button>

            {/* Security Features */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">🛡️ Security Features Active:</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• ⏰ Time-limited QR token (5 minutes)</li>
                <li>• 📍 Physical presence verification required</li>
                <li>• 🔒 Single-use per student</li>
                <li>• 🚫 Cannot be shared or forwarded</li>
                <li>• 📊 Location data recorded for verification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
