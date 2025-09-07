"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import LocationPopup from "@/app/components/LocationPopup";

type SessionUser = { id: string; name: string; email: string; department: string; year: number; semester: number } | null;

export default function StudentAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  const markAttendance = useMutation(api.attendance.markAttendance);
  
  const session = useQuery(
    api.sessions.getSession,
    sessionId ? { sessionId: sessionId as any } : "skip"
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

    // Check location permission status on load
    checkLocationPermission();
  }, [router]);

  async function checkLocationPermission() {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      return;
    }

    // Check permission API if available (modern browsers)
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(permission.state as any);
        console.log('📱 Location permission status:', permission.state);
        
        // Listen for permission changes
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
        alert(`📱 Permission Denied\n\nTo enable location:\n1. Click the location icon in your browser's address bar\n2. Select "Allow"\n3. Refresh the page\n\nOr go to Settings > Privacy > Location Services and enable for your browser.`);
      }
    }
  }

  async function handleMarkAttendance() {
    if (!user || !sessionId) return;
    
    // If we don't have location yet, show the automatic popup
    if (!capturedLocation) {
      setShowLocationPopup(true);
      return;
    }
    
    // We have location, proceed with attendance marking
    setSubmitting(true);
    try {
      console.log('📍 Using captured location for attendance:', capturedLocation);

      // Send attendance with captured location data
      const result = await markAttendance({
        sessionId: sessionId as any,
        studentId: user.id as any,
        studentLatitude: capturedLocation.latitude,
        studentLongitude: capturedLocation.longitude,
      });

      setSuccess(true);
      
      // Show distance information if available
      if (result.distance !== undefined) {
        console.log(`✅ Attendance marked! You were ${result.distance} meters from the class location.`);
      }
      
    } catch (error: any) {
      console.error("Failed to mark attendance:", error);
      alert(error?.message ?? "Failed to mark attendance. Please ensure you are physically present and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleLocationCaptured(latitude: number, longitude: number, accuracy: number) {
    console.log('📍 Location automatically captured:', { latitude, longitude, accuracy });
    setCapturedLocation({ latitude, longitude, accuracy });
    setLocationPermission('granted');
    setShowLocationPopup(false);
    
    // Automatically proceed with attendance marking
    setTimeout(() => {
      handleMarkAttendance();
    }, 500);
  }

  function handleLocationError(error: string) {
    console.error('📍 Location capture failed:', error);
    setLocationPermission('denied');
    setShowLocationPopup(false);
  }

  function handleLocationPopupClose() {
    setShowLocationPopup(false);
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

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium mb-2 text-blue-900">📍 Location Required</h3>
              <p className="text-sm text-blue-700 mb-3">
                You must be within {session.allowedRadius || 100} meters of the class location to mark attendance.
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
                ) : locationPermission === 'denied' ? (
                  <div className="flex items-center gap-2 text-red-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">❌ Location permission denied</span>
                  </div>
                ) : locationPermission === 'prompt' ? (
                  <div className="flex items-center gap-2 text-amber-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">⏳ Location permission needed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">❓ Checking location permission...</span>
                  </div>
                )}
              </div>

              {/* Manual Permission Request Button for Mobile */}
              {locationPermission !== 'granted' && (
                <button
                  onClick={requestLocationPermission}
                  className="w-full mb-3 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  📱 Enable Location Access
                </button>
              )}

              <p className="text-xs text-blue-600">
                💡 <strong>Mobile tip:</strong> If no permission popup appears, check your browser's address bar for a location icon and click "Allow"
              </p>
            </div>

            <button
              onClick={handleMarkAttendance}
              disabled={submitting}
              className="w-full px-4 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 616 0z" />
              </svg>
              {submitting ? "Getting Location & Marking..." : "Mark My Attendance"}
            </button>
          </div>
        </div>

        {/* Automatic Location Popup */}
        <LocationPopup
          isOpen={showLocationPopup}
          onLocationCaptured={handleLocationCaptured}
          onError={handleLocationError}
          onClose={handleLocationPopupClose}
          title="📍 Attendance Location Required"
          message="We need to verify your physical presence in the classroom/lab for attendance."
        />
      </div>
    </main>
  );
}
