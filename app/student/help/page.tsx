"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SessionUser = { id: string; name: string; email: string; department: string; year: number; semester?: number } | null;

export default function StudentHelpPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("faq");

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

  const faqData = [
    {
      question: "How do I mark my attendance?",
      answer: "Go to your dashboard and click 'Open' on any available attendance session. You can only mark attendance for sessions that match your department and year."
    },
    {
      question: "Why can't I see some attendance sessions?",
      answer: "You can only see attendance sessions created for your specific department and year. Sessions for other departments or years won't appear in your dashboard."
    },
    {
      question: "How can I view my attendance history?",
      answer: "Click on 'My Attendance Records' in the Quick Links section of your dashboard to see all your past attendance records."
    },
    {
      question: "Can I mark attendance after the session is closed?",
      answer: "No, once a teacher closes an attendance session, students can no longer mark their attendance for that session."
    },
    {
      question: "How do I update my profile information?",
      answer: "Go to your Profile page from the Quick Links section. Click 'Edit Profile' to update your information like name, email, department, year, and semester."
    },
    {
      question: "What if I forgot to mark attendance?",
      answer: "Contact your teacher directly. Teachers can see who attended each session and may be able to manually add your attendance if you were present."
    },
    {
      question: "Can I export my attendance records?",
      answer: "Yes! Go to 'My Attendance Records' and click 'Export My Records as CSV' to download your attendance data."
    }
  ];

  const troubleshootingData = [
    {
      issue: "Can't log in to my account",
      solution: "Make sure you're using the correct email and password. If you still can't log in, contact your administrator for password reset."
    },
    {
      issue: "Attendance session not appearing",
      solution: "Ensure the session is for your department and year. Check with your teacher if the session is still open."
    },
    {
      issue: "Error when marking attendance",
      solution: "This could happen if you've already marked attendance or if the session is closed. Refresh the page and try again."
    },
    {
      issue: "Profile information is incorrect",
      solution: "Go to your Profile page and click 'Edit Profile' to update your information. Some fields like Student ID cannot be changed."
    }
  ];

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
            <h1 className="text-xl font-semibold text-slate-900">Help & Support</h1>
          </div>
          
          <div className="flex">
            {/* Sidebar */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 p-4">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection("faq")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeSection === "faq"
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Frequently Asked Questions
                </button>
                <button
                  onClick={() => setActiveSection("troubleshooting")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeSection === "troubleshooting"
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Troubleshooting
                </button>
                <button
                  onClick={() => setActiveSection("contact")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeSection === "contact"
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Contact Support
                </button>
                <button
                  onClick={() => setActiveSection("guides")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeSection === "guides"
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  User Guides
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {activeSection === "faq" && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Frequently Asked Questions</h2>
                  <div className="space-y-4">
                    {faqData.map((faq, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-medium text-slate-900 mb-2">{faq.question}</h3>
                        <p className="text-slate-600 text-sm">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === "troubleshooting" && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Troubleshooting Common Issues</h2>
                  <div className="space-y-4">
                    {troubleshootingData.map((item, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-medium text-slate-900 mb-2 text-red-700">Issue: {item.issue}</h3>
                        <p className="text-slate-600 text-sm"><strong>Solution:</strong> {item.solution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === "contact" && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Support</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-medium text-slate-900 mb-2">Technical Support</h3>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>📧 Email: tech-support@college.edu</p>
                          <p>📞 Phone: +1 (555) 123-4567</p>
                          <p>🕒 Hours: Mon-Fri, 9 AM - 5 PM</p>
                        </div>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-medium text-slate-900 mb-2">Academic Office</h3>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>📧 Email: academic@college.edu</p>
                          <p>📞 Phone: +1 (555) 123-4568</p>
                          <p>🕒 Hours: Mon-Fri, 8 AM - 6 PM</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-slate-200 rounded-lg p-4">
                      <h3 className="font-medium text-slate-900 mb-2">Report an Issue</h3>
                      <p className="text-sm text-slate-600 mb-4">Found a bug or have a suggestion? Let us know!</p>
                      <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "guides" && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">User Guides</h2>
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-lg p-4">
                      <h3 className="font-medium text-slate-900 mb-2">📚 Getting Started Guide</h3>
                      <p className="text-slate-600 text-sm mb-3">Learn the basics of using the attendance system.</p>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>1. Log in with your student credentials</p>
                        <p>2. Check your dashboard for available attendance sessions</p>
                        <p>3. Click 'Open' to mark your attendance</p>
                        <p>4. View your attendance history anytime</p>
                      </div>
                    </div>
                    
                    <div className="border border-slate-200 rounded-lg p-4">
                      <h3 className="font-medium text-slate-900 mb-2">👤 Profile Management</h3>
                      <p className="text-slate-600 text-sm mb-3">How to update and manage your profile information.</p>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>• Go to Profile from Quick Links</p>
                        <p>• Click 'Edit Profile' to make changes</p>
                        <p>• Update name, email, department, year, semester</p>
                        <p>• Save changes when done</p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-4">
                      <h3 className="font-medium text-slate-900 mb-2">📊 Understanding Your Attendance</h3>
                      <p className="text-slate-600 text-sm mb-3">Learn how attendance tracking works.</p>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>• Sessions are created by teachers for specific departments/years</p>
                        <p>• You can only see sessions that match your profile</p>
                        <p>• Mark attendance while sessions are open</p>
                        <p>• View detailed history and export records</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
