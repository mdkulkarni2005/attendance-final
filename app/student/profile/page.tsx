"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SessionUser = { id: string; name: string; email: string; department: string; year: number; semester?: number } | null;

export default function StudentProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    year: "",
    semester: "",
  });

  useEffect(() => {
    const raw = typeof window !== "undefined" && sessionStorage.getItem("student");
    if (!raw) {
      router.replace("/student/login");
      return;
    }
    try {
      const userData = JSON.parse(raw);
      setUser(userData);
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        department: userData.department || "",
        year: userData.year?.toString() || "",
        semester: userData.semester?.toString() || "",
      });
    } catch {
      sessionStorage.removeItem("student");
      router.replace("/student/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  function handleEdit() {
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    // Reset form data to original user data
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        department: user.department || "",
        year: user.year?.toString() || "",
        semester: user.semester?.toString() || "",
      });
    }
  }

  function handleSave() {
    // In a real app, you would update the database here
    // For now, we'll just update the session storage
    if (user) {
      const updatedUser = {
        ...user,
        name: formData.name,
        email: formData.email,
        department: formData.department,
        year: parseInt(formData.year),
        semester: formData.semester ? parseInt(formData.semester) : undefined,
      };
      setUser(updatedUser);
      sessionStorage.setItem("student", JSON.stringify(updatedUser));
    }
    setEditing(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  if (loading) return null;
  if (!user) return null;

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
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-slate-900">My Profile</h1>
              {!editing ? (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  {editing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  ) : (
                    <p className="text-slate-900 py-2">{user.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  {editing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  ) : (
                    <p className="text-slate-900 py-2">{user.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  {editing ? (
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="Mechanical">Mechanical Engineering</option>
                      <option value="Computer">Computer Engineering</option>
                      <option value="Electrical">Electrical Engineering</option>
                      <option value="Civil">Civil Engineering</option>
                      <option value="Electronics">Electronics Engineering</option>
                      <option value="Chemical">Chemical Engineering</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 py-2">{user.department}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  {editing ? (
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 py-2">{user.year}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                  {editing ? (
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Select Semester</option>
                      <option value="1">1st Semester</option>
                      <option value="2">2nd Semester</option>
                      <option value="3">3rd Semester</option>
                      <option value="4">4th Semester</option>
                      <option value="5">5th Semester</option>
                      <option value="6">6th Semester</option>
                      <option value="7">7th Semester</option>
                      <option value="8">8th Semester</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 py-2">{user.semester || "Not set"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Student ID</label>
                  <p className="text-slate-900 py-2">{user.id}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Account Type:</span>
                  <span className="ml-2 text-slate-900">Student</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Status:</span>
                  <span className="ml-2 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
