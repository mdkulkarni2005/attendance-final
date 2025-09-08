"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateDeviceFingerprint, generateClientDeviceId, setStoredDeviceId } from "@/utils/deviceFingerprint";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});

export default function SecureStudentLoginPage() {
  const router = useRouter();
  const checkDeviceOwnership = useMutation(api.deviceSecurity.checkDeviceOwnership);
  const secureLogin = useAction(api.auth.loginStudentWithDeviceCheck);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deviceChecking, setDeviceChecking] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    const parse = loginSchema.safeParse(form);
    if (!parse.success) {
      setError(parse.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    setDeviceChecking(true);

    try {
      // STEP 1: Generate device fingerprint
      const deviceFingerprint = generateDeviceFingerprint();
      const deviceId = generateClientDeviceId();

      console.log("🔒 Starting secure login process...");
      console.log("📱 Device ID:", deviceId);

      // STEP 2: Pre-check device ownership (optional early warning)
      try {
        const deviceCheck = await checkDeviceOwnership({
          email: form.email,
          deviceId,
          deviceFingerprint,
        });

        if (!deviceCheck.allowed) {
          throw new Error(`🚫 DEVICE SECURITY VIOLATION\n\n${deviceCheck.reason}\n\nThis device is registered to: ${deviceCheck.ownerInfo}\n\nSECURITY POLICY:\n• Only one student account per device\n• No account sharing allowed\n• Violations are logged and reported\n\nACTIONS:\n1. Use your personal device\n2. Contact teacher if this is an error\n3. Report unauthorized access attempts`);
        }
      } catch (deviceError: any) {
        if (deviceError.message.includes('DEVICE SECURITY VIOLATION')) {
          throw deviceError;
        }
        // If device check fails for other reasons, continue with login
        console.warn("Device ownership pre-check failed:", deviceError);
      }

      setDeviceChecking(false);

      // STEP 3: Proceed with secure login
      console.log("✅ Device ownership validated, proceeding with login...");
      
      const result = await secureLogin({
        email: form.email,
        password: form.password,
        deviceId,
        deviceFingerprint,
      });

      if (result.success) {
        console.log("🎉 Secure login successful!");
        
        // Store user session with device binding
        const sessionData = {
          ...result.user,
          deviceId,
          loginTime: Date.now(),
          securityLevel: "device-bound",
        };

        if (typeof window !== "undefined") {
          sessionStorage.setItem("student", JSON.stringify(sessionData));
          setStoredDeviceId(deviceId);
          
          // Also store in cookies for middleware
          const cookieValue = JSON.stringify(sessionData);
          const expires = new Date();
          expires.setDate(expires.getDate() + 7); // 7 days
          document.cookie = `student-session=${encodeURIComponent(cookieValue)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
        }

        // Show security warnings if any
        if (result.user.securityWarnings && result.user.securityWarnings.length > 0) {
          alert(`⚠️ SECURITY NOTICE\n\n${result.user.securityWarnings.join('\n\n')}\n\nYour login was successful, but please review your device security settings.`);
        }

        router.push("/student/dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch (err: any) {
      console.error("🚫 Secure login failed:", err);
      setError(err?.message ?? "Login failed due to security restrictions");
      
      // Clear any stored device data on security violation
      if (err?.message?.includes('DEVICE SECURITY VIOLATION') || 
          err?.message?.includes('UNAUTHORIZED DEVICE ACCESS')) {
        localStorage.removeItem('device_id');
        sessionStorage.removeItem('student');
      }
    } finally {
      setLoading(false);
      setDeviceChecking(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-semibold mb-2">🔒 Secure Student Login</h1>
            <p className="text-slate-600">Device-verified authentication</p>
          </div>

          {/* Security Notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">🛡️ Security Policy</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• One student account per device</li>
              <li>• Account sharing is prohibited</li>
              <li>• All logins are device-tracked</li>
              <li>• Violations are reported</li>
            </ul>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm text-slate-700">Email</label>
              <input
                type="email"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                name="email"
                value={form.email}
                onChange={onChange}
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-slate-700">Password</label>
              <input
                type="password"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                name="password"
                value={form.password}
                onChange={onChange}
                required
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 whitespace-pre-line" role="alert">
                  {error}
                </p>
              </div>
            )}

            {deviceChecking && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-amber-800">Verifying device ownership...</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-700 text-white disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {deviceChecking ? "Checking Device..." : "Logging in..."}
                </>
              ) : (
                <>
                  🔐 Secure Login
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-sm text-slate-600">
                Don't have an account?{" "}
                <Link href="/student/register" className="text-slate-900 underline">
                  Register securely
                </Link>
              </p>
              <Link href="/student/login" className="text-xs text-slate-500 hover:text-slate-700 mt-2 block">
                Use standard login (less secure)
              </Link>
            </div>
          </form>

          {/* Device Info */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-medium text-gray-700 mb-1">Device Security Info</h4>
            <p className="text-xs text-gray-600">
              This device will be fingerprinted and bound to your account for security.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
