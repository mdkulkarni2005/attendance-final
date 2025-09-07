"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [isNewUser, setIsNewUser] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing cookies to determine if user has previous account
    const checkExistingSession = () => {
      const studentCookie = document.cookie.includes('student-session=');
      const teacherCookie = document.cookie.includes('teacher-session=');
      
      if (studentCookie || teacherCookie) {
        // User has previous account, redirect to appropriate login
        if (studentCookie) {
          router.replace('/student/login');
        } else if (teacherCookie) {
          router.replace('/teacher/login');
        }
        setIsNewUser(false);
      } else {
        // New user, show tab system
        setIsNewUser(true);
      }
      setLoading(false);
    };

    checkExistingSession();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </main>
    );
  }

  if (!isNewUser) {
    return null; // Will redirect in useEffect
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-0">
            <h1 className="text-3xl font-semibold text-center mb-2">Welcome to Attendance App</h1>
            <p className="text-slate-600 text-center mb-6">Choose your account type to get started</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('student')}
              className={`flex-1 py-3 px-4 text-sm font-medium text-center transition-colors ${
                activeTab === 'student'
                  ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setActiveTab('teacher')}
              className={`flex-1 py-3 px-4 text-sm font-medium text-center transition-colors ${
                activeTab === 'teacher'
                  ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Teacher
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'student' ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Student Portal</h2>
                  <p className="text-slate-600 text-sm">Mark attendance and track your academic progress</p>
                </div>
                <div className="space-y-3">
                  <Link 
                    href="/student/register"
                    className="w-full block px-4 py-3 rounded-lg bg-gradient-to-r from-slate-900 to-slate-700 text-white text-center font-medium hover:from-slate-800 hover:to-slate-600 transition-all"
                  >
                    Create Student Account
                  </Link>
                  <Link 
                    href="/student/login"
                    className="w-full block px-4 py-3 rounded-lg border border-slate-300 text-slate-700 text-center font-medium hover:bg-slate-50 transition-colors"
                  >
                    Login to Student Account
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Teacher Portal</h2>
                  <p className="text-slate-600 text-sm">Manage attendance sessions and track student progress</p>
                </div>
                <div className="space-y-3">
                  <Link 
                    href="/teacher/register"
                    className="w-full block px-4 py-3 rounded-lg bg-gradient-to-r from-slate-900 to-slate-700 text-white text-center font-medium hover:from-slate-800 hover:to-slate-600 transition-all"
                  >
                    Create Teacher Account
                  </Link>
                  <Link 
                    href="/teacher/login"
                    className="w-full block px-4 py-3 rounded-lg border border-slate-300 text-slate-700 text-center font-medium hover:bg-slate-50 transition-colors"
                  >
                    Login to Teacher Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
